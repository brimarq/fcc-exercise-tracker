const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: [ true, "Oops! `userId` is required." ],
    ref: 'User'
  },
  description: {
    type: String,
    required: [ true, "Oops! `description` is required." ]
  },
  duration: {
    type: Number,
    required: [ true, "Oops! `duration` is required." ]
  },
  date: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('Exercise', exerciseSchema);