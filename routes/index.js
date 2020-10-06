var mysql = require('mysql');
var express = require('express');
var path = require('path');
var bcrypt = require('bcryptjs');



var router = express.Router();
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database : 'mydb'
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('register');
});

router.post('/register', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var phone = req.body.phone;
  var address = req.body.address;

  // let hashpass = bcrypt.hashSync(password, 8);
  // console.log(hashpass);
  // res.send(hashpass);
  // res.end();

  connection.query('SELECT * FROM users WHERE name = ?', [username], function(error, results, fields) {
    if (error) throw error;
    if (results.length >0){
      res.send('name already in use !!!');
      res.end();
    }else{
      var hashpass = bcrypt.hashSync(password, 8);
      if (username && password) {
        connection.query('INSERT INTO users (name, pass, phone, address) VALUES (?,?,?,?)', [username, hashpass, phone, address], function(error, results, fields) {
          if (error) throw error;
          console.log("1 record inserted");
          res.send('register success !!!');
          res.end();
        });
      } else {
        res.send('Please enter Username and Password!');
        res.end();
      }
    }
  });
});




module.exports = router;
