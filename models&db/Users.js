var mongoose = require('mongoose');
var UserSchema = new mongoose.Schema({
  username: { type: String },
  name:{type:String},
  email:{type:String},
  contact:{type:String},
  password: { type: String },
  role: { type: String}

});
mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');
