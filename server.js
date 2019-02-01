require('dotenv').config(); // use for local dev
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

/** MONGOOSE SETUP */
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});


/** SCHEMAS and MODELS */
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const User = mongoose.model('User', userSchema);

/** MIDDLEWARE */
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));

/** ROUTES */
// base URI / homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST a new user, first checking if username exists
app.post('/api/exercise/new-user', checkUsername, (req, res) => {
  let user = new User({
    username: req.body.username
  });
  user.save((err, savedUser) => {
    if (err) {
      console.log(err);
      res.json({"error": "Could not save user."});
    } else {
      res.json(savedUser);
    }
  });
});

// POST a new exercise for a user
app.post('/api/exercise/add', verifyDate, (req, res) => {

  User.findById(req.body.userId, function(err, user) {
    if (err) {
      console.log(err);
    } else {
      if (!user) res.json({"error": "userId not found"});
      let exercise = {
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date
      };
      user.exercises.push(exercise);
      user.save((err, savedUser) => {
        if (err) {
          console.log(err);
          res.json({"error": "Error saving exercise."});
        } else {
          res.json({savedUser});
        }
      });
    }
  });
});

// GET an array of all users
app.get('/api/exercise/users', (req, res) => {
  console.log(req.route.path);
  User.find({}, (err, users) => {
    if (err) {
      console.log(err);
    } else {
      res.json(users);
    }
  });
});

// GET exercise log for user
app.get('/api/exercise/log/:userId?', (req, res) => {
  
  res.send(req.params);
});

/** 'NOT FOUND' MIDDLEWARE */
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

/** ERROR-HANDLING MIDDLEWARE */
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

/** FUNCTIONS */
function checkUsername(req, res, next) {
  User.findOne({username: req.body.username}, function(err, user) {
    if (err) {
      console.log(err);
    } else {
      user ? res.json({"error": "username unavailable"}) : next();
    }
  });
}

function verifyDate(req, res, next) {
  const regex = /(\d{4})-(\d{2})-(\d{2})/;

  if (req.route.path === '/api/exercise/add') {
    // No date submitted? Supply current date obj and continue to next
    if (!req.body.date) {
      req.body.date = new Date();
      next();
    }
    // Otherwise, verify submitted date, convert to Date obj and continue to next
    else {
      if (!regex.test(req.body.date)) {
        // Respond early with error if invalid date format
        res.json({"error": "Invalid date format."});
      } else {
        let date = new Date(req.body.date), 
        isInvalidDate = isNaN(date.valueOf());
        if (isInvalidDate) {
          res.json({"error": "Invalid date."});
        } else {
          req.body.date = date;
          next();
        }
      }
    }
  } else {
    next();
  }

}

/** LISTENER / START SERVER */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
