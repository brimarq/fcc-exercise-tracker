const router = require('express').Router();
const User = require('./models/user');
const Exercise = require('./models/exercise');
const dateFormatRegex = /(\d{4})-(\d{2})-(\d{2})/;

// POST a new user
router.post('/new-user', (req, res, next) => {
  let user = new User(req.body);
  user.save((err, savedUser) => {
    if (err) {
      // error code 11000 thrown if username already exists (due to 'unique' option on path). Any other errs go to next.
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
  // Handle date
  if (!req.body.date) {
    // No date submitted? Set to unix timestamp for current time.
    req.body.date = Date.now();
  } else {
    // Incorrect date format? Return early with err to next.
    if (!dateFormatRegex.test(req.body.date)) {
      return next({status: 400, message: "Incorrect date format."});
    } else {
      // Convert submitted date to unix timestamp
      const timestamp = timestampFromYYYMMDD(req.body.date);
      // If submitted date is invalid, return err to next.
      if (isNaN(timestamp)) return next({status: 400, message: "Invalid date."});
      // Set submitted date to its unix timestamp equivalent.
      req.body.date = timestamp;
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
      if (err) return next(err);
      res.json(savedExercise);
    });
  });

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
  const q = req.query;
  let dates = [q.from, q.to];
  const isCorrectDateFormat = dates.every(dateStr => dateStr === undefined ? true : dateFormatRegex.test(dateStr));
  // Handle possible query errors
  // console.log(dates);
  // err for missing userId
  if (!q.userId) return next({status: 400, message: "Query missing required 'userId' parameter."});
  // err for incorrectly formatted date string (includes empty string). Undefined is ok here.
  if (!isCorrectDateFormat) return next({status: 400, message: "Query has incorrect date format. Requires yyy-mm-dd"});
  // Convert date strings defined in query to unix timestamp. Otherwise, leave undefined.
  dates = dates.map(dateStr => dateStr === undefined ? dateStr : timestampFromYYYMMDD(dateStr));
  // Return error if both query dates are present but in wrong order.
  if (dates.every(timestamp => timestamp !== undefined) && dates[0] > dates[1]) return next({status: 400, message: "Oops! Query dates in wrong order (from > to)."});
  
  // Convert query dates to timestamps or undefined.
  q.from = dates[0];
  q.to = dates[1];

  
  User.findById(req.query.userId, function(err, user) {
    if (err) {
      if (err.name === "CastError") return next({status: 400, message: "userId '" + err.value + "' not found."});
      return next(err);
    }

    let findFilter = {
      userId: user._id,
      date: {
        $gte: q.from || 0,
        $lte: q.to || Date.now()
      }
    };

    let findOptions = {
      sort: '-date', limit: q.limit ? +q.limit : 0
    };

    Exercise.find(findFilter, 'description duration date', findOptions, function(err, exercises) {
      if (err) return next(err);

      function xform(doc, ret, options) {
        delete ret._id;
        ret.date = new Date(ret.date).toDateString();
        return ret;
      }

      let logArr = exercises.map(doc => doc.toObject({transform: xform}));

      user = user.toObject({ versionKey: false });
      user.count = logArr.length;
      user.log = logArr;

      res.json(user);
    });

  });

});


/** FUNCTIONS */

function timestampFromYYYMMDD(dateString) {
  /** This corrects the maddening issue of creating timestamps from date objects 
   * created with new Date("yyy-mm-dd"), which return dates in UTC. The problem: 
   *  new Date("yyy-mm-dd").getTime() returns a timestamp in UTC from a date in UTC
   *  Date.now() returns a UTC timestamp created from a local time. NOT GOOD! 
   * We want all timestamps created from local time!!
   */
  const msOffset = new Date().getTimezoneOffset() * 60000;
  const timestamp = new Date(dateString).getTime() + msOffset;
  return timestamp;
}



module.exports = router;