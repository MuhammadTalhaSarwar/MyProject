var mongoose = require('mongoose');
var config =require('../config');
mongoose.connect(config.mongo_uri, { useMongoClient: true });
