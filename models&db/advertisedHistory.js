var mongoose = require('mongoose');
var advertiseSchema = new mongoose.Schema({
  products_advertised: { type: String },
  sessionId:{type:String},
  advertisedTo:{type:String},
  advertisedOn:{type:Date}

});
mongoose.model('advertisementHistory', advertiseSchema);

module.exports = mongoose.model('advertisementHistory');
