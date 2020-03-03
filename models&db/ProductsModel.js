var mongoose = require('mongoose');
var ProductsSchema = new mongoose.Schema({
  name:{type:String},
  priority:{type:String}

});
mongoose.model('Products', ProductsSchema);

module.exports = mongoose.model('Products');
