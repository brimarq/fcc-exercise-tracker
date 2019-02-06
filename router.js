const router = require('express').Router();
const User = require('./models/user');
const Exercise = require('./models/exercise');
const dateFormatRegex = /(\d{4})-(\d{2})-(\d{2})/;

// POST a new user
router.post('/new-user', (req, res, next) => {
  // No username submitted? Send json error.
  // if (!req.body.username) return res.json({"error": "Username is required."});
  let user = new User(req.body);
  user.save((err, savedUser) => {
    if (err) {
      // error code 11000 thrown if username already exists. Any other errs go to next.
      if (err.code === 11000) return next({status: 400, message: "The username '" + req.body.username + "' is unavailable."});
      return next(err);
    }
    // Convert returned doc to JS Object with "__v" key omitted, then send as json res.
    savedUser = savedUser.toObject({ versionKey: false });
    res.json(savedUser);
  });
});

// POST a new exercise for a user
router.post('/add', (req, res, next) => {

  let date = req.body.date;
  // Is date incorrect format or invalid? Return early with json error res. Else, set req.body.date as appropriate date obj. 
  if (date && !dateFormatRegex.test(date)) {
    return next({status: 400, message: "Incorrect date format."});
  } else {
    date = date ? new Date(date) : new Date(Date.now());
    if (isNaN(date.getTime())) {
      return next({status: 400, message: "Invalid date."});
    } else {
      req.body.date = date;
    }
  }

  User.findById(req.body.userId, function(err, user) {
    if (err) {
      // err if no userId submitted
      if (!req.body.userId) return next({status: 400, message: "Oops! `userId` is required."});
      // otherwise userId not found
      return next({status: 400, message: "userId '" + err.value + "' not found."});
    }

    let exercise = new Exercise(req.body);

    exercise.save((err, savedExercise) => {
      console.error(err);
      if (err) return next(err);
      res.json(savedExercise);
    });
  });

  // User.findById(req.body.userId, function(err, user) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (!user) return res.json({"error": "userId not found"});
  //     let exercise = {
  //       description: req.body.description,
  //       duration: req.body.duration,
  //       date: req.body.date
  //     };
  //     user.exercises.push(exercise);
  //     user.save((err, savedUser) => {
  //       if (err) {
  //         console.log(err);
  //         res.json({"error": "Error saving exercise."});
  //       } else {
  //         res.json({savedUser});
  //       }
  //     });
  //   }
  // });
});

// GET an array of all users
router.get('/users', (req, res, next) => {
  User.find({}, (err, users) => {
    if (err) return next(err);
    // Convert docs in returned array to JS Objects with "__v" key omitted.
    retUsers = users.map(u => u.toObject({ versionKey: false }));
    res.json(retUsers);
  });
});

// GET exercise log for user
router.get('/log', (req, res, next) => {


  // const queryParams = ['userId', 'from', 'to', 'limit'];
  // // Return early with res if query is missing required userId parameter
  // if (!req.query.userId) return res.json({"error": "Query missing userId parameter."});

  // User.findById(req.query.userId, function(err, user) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (!user) return res.json({"error": "userId not found"});
  //     let userObj = user.toObject({transform: xform, versionKey: false});
  //     userObj.count = user.exercises.length;
  //     userObj.log = [];
  //     res.json(userObj);

  //     function xform(doc, ret, options) {
  //       delete ret['_id'];
        
  //       return ret;
  //     }
      
  //   }
  // });
});


/** FUNCTIONS */

function verifyAndConvertDates(req, res, next) {

  if (req.route.path === '/api/exercise/add') {
    // No date submitted? Supply current date obj and continue to next
    if (!req.body.date) {
      req.body.date = new Date();
      next();
    }
    // Otherwise, verify submitted date, convert to Date obj and continue to next
    else {
      if (isIncorrectFormat(req.body.date)) {
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
        if (isIncorrectFormat(req.query.from)) {
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
        if (isIncorrectFormat(req.query.to)) {
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

      // Check for correct date order
      if (req.query.from && req.query.to && req.query.from.getTime() > req.query.to.getTime()) {
        errors.push({"error": "Query dates in wrong order."});
      } 

      // Respond with errors, if any. Otherwise, go to next...
      if (errors.length > 0) {
        res.json(errors);
      } else {
        console.log(Object.keys(req.query));
        next();
      }
      
    } else {
      // Just go to next if missing 'from' and 'to' query parameters.
      next();
    }
  }

  function isIncorrectFormat(dateStr) {
    const regex = /(\d{4})-(\d{2})-(\d{2})/;
    return !regex.test(dateStr);
  }

  function isInvalidDate(dateObj) {
    return isNaN(dateObj.valueOf());
  }

} // END verifyAndConvertDates()


module.exports = router;