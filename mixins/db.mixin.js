"use strict";

const path = require("path");
const mkdir = require("mkdirp").sync;
const config=require('../config');
const DbService	= require("moleculer-db");
const MongooseAdapter = require("moleculer-db-adapter-mongoose");
const mongoose = require("mongoose");
module.exports = function(collection) {
	if(collection==='users')
	{
		var schema=mongoose.Schema({
			username: { type: String },
			name:{type:String},
			email:{type:String},
			contact:{type:String},
			password: { type: String },
			role: { type: String}
	})
 }
		return {
			mixins: [DbService],
			adapter: new MongooseAdapter(config.mongo_uri),
			model:mongoose.model(collection,schema)
		};

	// --- NeDB fallback DB adapter

	// Create data folder
};
