var mongoose = require('mongoose');
var subscribedSchema = new mongoose.Schema({
  products_subscribed: { type: String },
  subscribedTo:{type:String},
  subscribedOn:{type:Date},
  session_id:{type:String}

});
mongoose.model('subscriptionHistory', subscribedSchema);

module.exports = mongoose.model('subscriptionHistory');
