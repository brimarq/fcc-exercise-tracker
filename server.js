require('dotenv').config(); // use for local dev
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const router = require('./router');
const cors = require('cors');

/** MONGOOSE SETUP */
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useCreateIndex: true});

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

// Send these requests to express router
app.use('/api/exercise', router);


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


/** LISTENER / START SERVER */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
