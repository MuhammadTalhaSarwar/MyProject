var mongoose = require('mongoose');
var menuSchema = new mongoose.Schema({
  updatedMenu: { type: Object },
  oldMenu:{type:Object},
  modifiedOn:{type:Date},
  modifiedBy:{type:mongoose.Schema.Types.ObjectId, ref: 'users'}

});
mongoose.model('menuHistory', menuSchema);

module.exports = mongoose.model('menuHistory');
