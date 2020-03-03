"use strict";
const { MoleculerClientError } = require("moleculer").Errors;
const JsonFind = require('json-find');
var createClient = require('then-redis').createClient;
const subscriptionHistoryModel=require('../models&db/subscriptionHistory');
const db =createClient({
  host: '10.226.122.8',
  port: 6379
})
const moment=require('moment');
const date=new Date();
const now=moment(date).format('YYYY-MM-DD HH:mm:ss');
var bunyan = require('bunyan');
var log = bunyan.createLogger({
        name: 'USSD',
        streams: [
                {
                        level: 'info',
                        type: 'rotating-file',
                        period: '1d',
                        count: 90,
                        path: __dirname+'/access.log'  // log ERROR and above to a file
                }
        ]
});
module.exports={
  name: "subscription",
  mixins: [],
  settings: {},
  actions:{
    subscribe:{
      params:{
        sessionId:{type:"string"},
        message:{type:"string"},
      },
      async handler(ctx)
      {
        let sessionId=ctx.params.sessionId;
        let toBeSubscribed=ctx.params.message;
        db.select(2);
        let sessionObj=await db.hgetall(sessionId);
        if(sessionObj==null)
        {
          return this.Promise.reject(new MoleculerClientError("No Such Session Found"));
        }
        else {
          let msisdn=sessionObj.msisdn;
          let menu=[...JSON.parse(sessionObj.menu)];
          this.logger.info(menu);
          let keys=Object.keys(menu);
          if(keys.includes(toBeSubscribed))
          {
            let menuName=menu[toBeSubscribed];
            this.logger.info(menuName);
            db.select(0);
            //db.hgetall(msisdn);
            db.hmset(msisdn,menuName,"-1");
            let subs=new subscriptionHistoryModel({
              products_subscribed:menuName,
              subscribedTo:msisdn,
              subscribedOn:new Date().toISOString(),
              session_id:sessionId
            });
            await subs.save();
            return this.Promise.resolve({message:menuName+" Successfully Suscribed On "+msisdn});
          }
          else {
            return this.Promise.reject(new MoleculerClientError("Invalid Option Selected"));
          }

        }
      }
    }
  },
}
