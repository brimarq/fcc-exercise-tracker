const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true, //[1]
    unique: true //[2]
  }
});

module.exports = mongoose.model('User', userSchema);

/** Comment notes for SchemaType options
 * [1] Built-in required validator. Value is true/false or an array with the boolean and a custom error message [true, 'Oops! No username submitted.'] https://mongoosejs.com/docs/api.html#schematype_SchemaType-required
 * [2] Makes this an indexed field with enforced uniqueness (no duplicate value)  https://docs.mongodb.com/manual/core/index-unique/
 */