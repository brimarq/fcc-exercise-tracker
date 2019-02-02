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
app.post('/api/exercise/add', verifyDates, (req, res) => {

  User.findById(req.body.userId, function(err, user) {
    if (err) {
      console.log(err);
    } else {
      if (!user) return res.json({"error": "userId not found"});
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
app.get('/api/exercise/log', verifyDates, (req, res) => {
  // Return early with res if query is missing userId
  if (!req.query.userId) return res.json({"error": "Query missing userId"});
  
  res.send(req.query);
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

function verifyDates(req, res, next) {

  if (req.route.path === '/api/exercise/add') {
    // No date submitted? Supply current date obj and continue to next
    if (!req.body.date) {
      req.body.date = new Date();
      next();
    }
    // Otherwise, verify submitted date, convert to Date obj and continue to next
    else {
      if (!isCorrectFormat(req.body.date)) {
        // Respond early with error if incorrect date format
        res.json({"error": "Incorrect date format."});
      } else {
        let date = new Date(req.body.date); 
        if (isInvalidDate(date)) {
          res.json({"error": "Invalid date."});
        } else {
          req.body.date = date;
          next();
        }
      }
    }
  } else {
    if (req.query.from || req.query.to) {
      let errors = [];

      if (req.query.from) {
        if (!isCorrectFormat(req.query.from)) {
          // Respond early with error if incorrect date format
          errors.push({"error": "Incorrect date format [from]."});
        } else {
          // Convert date string to Date, verify and save to query parameter if valid.
          let date = new Date(req.query.from); 
          if (isInvalidDate(date)) {
            errors.push({"error": "Invalid date [from]."});
          } else {
            req.query.from = date;
          }
        }
      }

      if (req.query.to) {
        if (!isCorrectFormat(req.query.to)) {
          // Respond early with error if incorrect date format
          errors.push({"error": "Incorrect date format [to]."});
        } else {
          // Convert date string to Date, verify and save to query parameter if valid.
          let date = new Date(req.query.to); 
          if (isInvalidDate(date)) {
            errors.push({"error": "Invalid date [to]."});
          } else {
            req.query.to = date;
          }
        }
      }

      // Respond with errors, if any. Otherwise, go to next...
      if (errors.length > 0) {
        res.json(errors);
      } else {
        next();
      }
      
    } else {
      // Just go to next if missing 'from' and 'to' query parameters.
      next();
    }
  }

  function isCorrectFormat(dateStr) {
    return /(\d{4})-(\d{2})-(\d{2})/.test(dateStr);
  }

  function isInvalidDate(dateObj) {
    return isNaN(dateObj.valueOf());
  }

}



/** LISTENER / START SERVER */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
