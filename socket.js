var sessionMiddleware = require('./middlewares/sessionMiddleware');
var htmlEscape = require('escape-html');
var io;
var onlineUser = {};
var joinUser = {};

var onlineRoom = {};

var master;
var cli;
var data = new Array(20);
var win, step;
var arrWin = new Array(2);

module.exports = {
    initSocket: function (server) {
        if (!!io)
            throw new Error("socketIO already defined")
        // var io = this.io;
        io = require('socket.io')(server, {
            transports: ['websocket']
        });

        // register middleware in Socket.IO
        io.use((socket, next) => {
            sessionMiddleware(socket.request, {}, next);
            // sessionMiddleware(socket.request, socket.request.res, next); will not work with websocket-only
            // connections, as 'socket.request.res' will be undefined in that case
        });
        io.on('connect', (socket) => {
            // console.log(socket.id);
            // console.log(io.sockets.connected);

            const session = socket.request.session;
            if (!session.user) {
                return socket.disconnect(true);
            }
            // console.log(onlineUser);
            //kick user đang dùng chung tài khoản ra
            for (var key in onlineUser) {
                var value = onlineUser[key];
                if (value.username === session.user.username) {
                    console.log("other")
                    io.sockets.connected[key].broadcast.emit('user_offline', onlineUser[key]);
                    io.sockets.connected[key].disconnect(true)
                    delete onlineUser[key];
                }
            }

            var loggedUser = {...session.user, ...{socketId: socket.id}};
            onlineUser[socket.id] = loggedUser;


            socket.emit('online_user_list', onlineUser);
            socket.broadcast.emit('user_online', loggedUser);

            socket.on('disconnect', (reason) => {
                console.log(reason);
                var logoutUser = onlineUser[socket.id];
                delete onlineUser[socket.id];
                socket.broadcast.emit('user_offline', logoutUser);
            });

            socket.on('sent_msg', (msg) => {
                msg = htmlEscape(msg);
                io.sockets.emit('chat', {senderId: socket.id, content: msg});
            })

            socket.on('data play', (pdata) => {
                io.sockets.emit('data play', {senderId: socket.id, content: pdata});
            });

            socket.emit('list_room',onlineRoom);

            //room xu ly trong nay
            socket.on('create_room', function () {
                var createdRoom = {...{name: "room" + socket.id}};
                onlineRoom[socket.id]= createdRoom;
                console.log(onlineRoom);
                socket.emit('create_room',"room" + socket.id);

                socket.broadcast.emit('created_room',createdRoom);



            });

            socket.on('join_room', function (room) {
                console.log(room);
                socket.join(room);

            });


            socket.on('room', function (room) {
                //onlineRoom[socket.id]=room;
                //console.log(onlineRoom);

                socket.join(room);

                var role = 3;
                if (master && !cli) {
                    cli = socket.id;
                    role = 2;
                }

                if (!master) {
                    master = socket.id;
                    role = 1;
                    init();
                }

                var loggedUser = {...session.user, ...{socketId: socket.id}, ...{role: role}};
                joinUser[socket.id] = loggedUser;
                //console.log(joinUser);

                io.sockets.in(room).emit('message', joinUser);

                // cac tk da join
                socket.emit('online_user_list_room', joinUser);

                // tk vua join vao
                socket.broadcast.emit('user_online_room', loggedUser);

                // matrix ban choi
                socket.emit('matrix', data);

                socket.on('disconnect', (reason) => {
                    var logoutUser = joinUser[socket.id];
                    console.log(logoutUser.role);
                    if (logoutUser.role == 1) {
                        master = null;
                        // kich het ra
                        for (var i = 0; i < arrWin.length; i++) {
                            arrWin[i] = new Array(null, null);
                        }
                        init();

                        for (var key in joinUser){
                            //console.log("kich het tat ca");
                            io.sockets.emit('user_being_kick', key);
                        }

                    }
                    if (logoutUser.role == 2) {
                        cli = null;
                    }
                    delete joinUser[socket.id];
                    //console.log(logoutUser.role);

                    socket.broadcast.emit('user_leave_room', logoutUser);

                });

                socket.on('user_being_kick', (pdata) => {
                    //console.log(pdata);
                    io.sockets.emit('user_being_kick', pdata);
                });

                //xu ly ban choi

                socket.on('data_play', (pdata) => {
                    // console.log(pdata);
                    // console.log(pdata.x);
                    if (step == socket.id && cli){
                        if (data[pdata.x][pdata.y] == 0) {
                            if (master == socket.id) {
                                data[pdata.x][pdata.y] = 1;
                                step = cli;
                            } else if (cli == socket.id) {
                                data[pdata.x][pdata.y] = 2;
                                step = master;
                            }

                            //console.log(data[pdata.x][pdata.y]);
                            check(data, pdata.x, pdata.y);
                            io.sockets.emit('data_play', {senderId: socket.id, status: win, line: arrWin, content: pdata});

                        }
                    }else{
                        console.log("chua den luot hoac k dc danh");

                    }

                });

                socket.on('restart', () => {
                    for (var i = 0; i < arrWin.length; i++) {
                        arrWin[i] = new Array(null, null);
                    }
                    init();
                    io.sockets.emit('restart');

                });
           });
        });


        return io;
    }
}

function init() {
    win = false;
    step = master;
    for (var i = 0; i < data.length; i++) {
        data[i] = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}

function check(data, x, y) {
    var lx,ty;
    var rx, by;

    //check hang
    var curX = x;
    var curY = y;
    var count = 1;
    while (curX - 1 >= 0 && data[curX - 1][y] == data[x][y]) {
        count++;
        curX--;
    }
    lx = curX++;

    curX = x;
    while (curX + 1 <= 19 && data[curX + 1][y] == data[x][y]) {
        count++;
        curX++;
    }
    rx = curX--;
    if (count >= 5) {
        win = true;
        arrWin[0] = Array(lx,y);
        arrWin[1] = Array(rx,y);
        return arrWin;
    }

    //cot
    count = 1;
    while (curY - 1 >= 0 && data[x][curY - 1] == data[x][y]) {
        count++;
        curY--;
    }
    ty = curY++;
    curY = y;
    while (curY + 1 <= 19 && data[x][curY + 1] == data[x][y]) {
        count++;
        curY++;
    }
    by = curY--;
    if (count >= 5) {
        win = true;
        arrWin[0] = Array(x,ty);
        arrWin[1] = Array(x,by);
        return arrWin;
    }
    //cheo chinh
    curX = x;
    curY = y;
    count = 1;
    while (curX - 1 >= 0 && curY - 1 >= 0 && data[curX - 1][curY - 1] == data[x][y]) {
        count++;
        curX--;
        curY--;
    }
    lx = curX++;
    ty = curY++;

    curX = x;
    curY = y;
    while (curY + 1 <= 19 && curX + 1 <= 19 && data[curX + 1][curY + 1] == data[x][y]) {
        count++;
        curY++;
        curX++;
    }
    rx = curX--;
    by = curY--;

    if (count >= 5) {
        win = true;
        arrWin[0] = Array(lx,ty);
        arrWin[1] = Array(rx,by);
        return arrWin;
    }
    //cheo phu
    curX = x;
    curY = y;
    count = 1;
    while (curX + 1 <= 19 && curY - 1 >= 0 && data[curX + 1][curY - 1] == data[x][y]) {
        count++;
        curX++;
        curY--;
    }
    lx = curX--;
    ty = curY++;

    curX = x;
    curY = y;
    while (curY + 1 <= 19 && curX - 1 >= 0 && data[curX - 1][curY + 1] == data[x][y]) {
        count++;
        curY++;
        curX--;
    }
    rx = curX--;
    by = curY++;

    if (count >= 5) {
        win = true;
        arrWin[0] = Array(lx,ty);
        arrWin[1] = Array(rx,by);
        return arrWin;
    }

}






