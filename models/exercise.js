const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: Date,
});



module.exports = mongoose.model('Exercise', exerciseSchema);