var mysql = require('mysql');
var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');



var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database : 'mydb'
});


/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.session.loggedin){
    res.redirect('/users/home');
  }else {
    res.render('login');
  }
});
router.post('/auth', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  if (username && password) {
    connection.query('SELECT * FROM users WHERE name = ?',  username, function(error, results, fields) {
      if (error) throw error;

      if (results.length > 0 && bcrypt.compareSync(password, results[0].pass)){
        req.session.loggedin = true;
        req.session.id_user = results[0].id;
        req.session.username = results[0].name;
        req.session.phone = results[0].phone;
        req.session.address = results[0].address;

        res.redirect('/users/home');
      } else {
        res.send('Incorrect Username and/or Password!');
      }
      res.end();
    });
  } else {
    res.send('Please enter Username and Password!');
    res.end();
  }
});

router.get('/home', function(req, res, next) {
  if (req.session.loggedin) {
    //response.send('Welcome back, ' + '<br>' + request.session.username + '!' + '<button type="button" >Logout</button>');
    //console.log('logged in');
    res.render('home', {name : req.session.username});
  } else {
    res.send('Please login to view this page!');
    res.end();
  }
});

router.get('/logout', function(req, res, next) {
  req.session.loggedin = false;
  res.redirect('/users');
});

router.get('/public_chat', function(req, res, next) {
  if(req.session.loggedin){
    res.render('public_chat', {name: req.session.username});
  }else {
    res.render('login');
  }
});

router.get('/update', function(req, res, next) {
  if (req.session.loggedin) {
    connection.query('SELECT * FROM users WHERE id = ?', req.session.id_user , function(error, results, fields) {
      if (error) throw error;
      res.render('update',{name: [req.session.id_user, req.session.username, results[0].phone, results[0].address ]});
    });
  } else {
    res.send('Please login to view this page!');
    res.end();
  }
  //res.render('update',{name: [req.session.id_user, req.session.username, req.session.phone, req.session.address ]});
});

router.post('/update', function(req, res, next) {
    var id = req.body.id;
    //var id = 4;
    var phone = req.body.phone;
    var address = req.body.address;

      connection.query('UPDATE users SET phone = ? , address = ? WHERE id = ?', [phone, address, id], function (error, results, fields) {
        if (error) throw error;
        res.send('update success !!');
        res.end();
      });

});

router.get('/game', function(req, res, next) {
  if(req.session.loggedin){
    res.render('game', {name: req.session.username});
  }else {
    res.render('login');
  }
});

router.post('/find', function(req, res, next) {
  if(req.session.loggedin){
    if (req.body.text_find.length >2){
      connection.query('SELECT * FROM users WHERE name LIKE ?', '%' + req.body.text_find + '%', function(error, results, fields) {
        if (error) throw error;
        //console.log(results);
        res.render('find',{name: results});
      });
    }else{
      res.send('please enter at least 3 character');
      res.end();
    }

  }else {
    res.render('login');
  }
});




module.exports = router;
