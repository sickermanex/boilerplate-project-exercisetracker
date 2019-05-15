const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('MongoDB database connected!')
});
var Schema = mongoose.Schema;
var userSchema = new Schema({
  username: {
    type: "String",
    required: true
  },
  log: [{
    description: {
      type: "String",
      required: true
    },
    duration: {
      type: "Number",
      required: true
    },
    date: {
      type: "String"
    }
  }]
});
var User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", function(req,res){
  var body = {
    username: req.body.username || req.query.username,
    log: []
  };
  var newUser = new User(body);
  newUser.save(function(err, data){
    var response = {
      _id: data._id,
      username: data.username
    };
    res.json(response);
  });
});

app.post("/api/exercise/add", function(req,res){
  var userId = req.body.userId;
  var description = req.body.description;
  var duration = parseInt(req.body.duration);
  var date = new Date(req.body.date);
  date = isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
  
  User.findById({ _id: userId }, function(err,user){
    console.log(err,user);
    if(user){
      var body = {
        description,
        duration,
        date        
      };
      user.log.push(body);
      user.save(function(err, data){
        if(data){
          var response = {
            username: data.username,
            description,
            duration,
            date,
            _id: data._id
          };          
          res.json(response);
        }
      });
    } else{
      res.json({ error: "User not found!" });
    }    
  });
});

app.get("/api/exercise/users", function(req,res){
  User.find({}, function(err,users){
    let response = [];
    users.forEach(user => {
      response.push({
        username: user.username, 
        _id: user._id
      });
    });
    res.json(response);
  })
});

app.get("/api/exercise/log", function(req,res){
  var userId = req.query.userId;
  User.findById({ _id: userId }, function(err,user){
    if(user){
      var response = user;
      response.count = user.log.length;
      delete response["__v"];
      res.json(response);
    }
  })
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})