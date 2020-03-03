"use strict";
const { MoleculerClientError } = require("moleculer").Errors;
const JsonFind = require('json-find');
var createClient = require('then-redis').createClient;
const ProductsModel=require('../models&db/ProductsModel');
const menuHistoryModel=require('../models&db/menuHistory');
const advertisedHistoryModel=require('../models&db/advertisedHistory');
const subscriptionHistoryModel=require('../models&db/subscriptionHistory');
const moment=require('moment');
const date=new Date();
const now=moment(date).format('YYYY-MM-DD HH:mm:ss');
const db =createClient({
  host: '10.226.122.8',
  port: 6379
})
var ISODate = require("isodate");
//
const gloabalValue=30;
const AllowedLimit='5';
const menuSize=3;
const prodvalue=15;
var bunyan = require('bunyan');
var log = bunyan.createLogger({
  name: 'USSD',
  streams: [
    {
      level: 'info',
      type: 'rotating-file',
      period: '1d',
      count: 90,
      path: './logs/access.log'  // log ERROR and above to a file
    }
  ]
});
module.exports ={
  name: "products",
  mixins: [],
  settings: {},
  actions: {
    getMsisdnUssdDetails:{
      params: {
        msisdn: { type: "string" }
      },
      async handler(ctx) {
        let postedMsisdn = ctx.params.msisdn;
        let verfiedMsisdn=this.validateMsisdn(postedMsisdn);
        var ttlCounts=await this.getThisMsisdnTotalCount(verfiedMsisdn);
        if(ttlCounts<gloabalValue)
        {
          let advertiseThese=await this.showProductsAndAdvertise(verfiedMsisdn);
          if(advertiseThese.length>0)
          {
            let sessionResult = await ctx.call("session.createSession", { msisdn:verfiedMsisdn,menu:advertiseThese,db:db });
            if(sessionResult[0]==='OK')
            {
              await db.select(2);
              let obj=await db.hgetall(sessionResult[1]);
              this.logger.info(obj);
              let sessId=obj.session_id;
              let resultedjson=new Object();
              for(var i=0;i<advertiseThese.length;i++)
              {
                resultedjson[i]="Press "+i+ " for " +advertiseThese[i];
                let ad=new advertisedHistoryModel({
                  products_advertised:advertiseThese[i],
                  advertisedTo:verfiedMsisdn,
                  sessionId:sessId,
                  advertisedOn:new Date().toISOString()
                });
                ad.save();
              }
              return this.Promise.resolve(resultedjson)

            }
          }
          else {
            return this.Promise.reject(new MoleculerClientError("Menu Ended"));
          }
        }
        else {
          return this.Promise.reject(new MoleculerClientError("Global Limit Reached "))
        }
      }
    },
    disconnectSocketPlease:{
      async handler(ctx)
      {
        return this.Promise.resolve();
      }
    },
    addNewProduct:{
    params: {
    productname:{type:"string"}
    },
    async handler(ctx)
    {
      let alreadyPresent=await ProductsModel.findOne({name:ctx.params.productname});

      if(alreadyPresent)
      {
      return this.Promise.reject({message:'Product Already Present'});
      }
      else {
     let newProd=new ProductsModel({
       name:ctx.params.productname,
       priority:''
     });
     await newProd.save();
     return this.Promise.resolve({message:"Product Saved"});
   }
    }
  },
  getAllProducts:{
    async handler()
    {
      let products=await ProductsModel.find({});
      return this.Promise.resolve(products);
    }
  },
  updateMenu:{
    async handler(ctx)
    {
      let keys=Object.keys(ctx.params);
      let arrofObjects=await JSON.parse(keys);
      db.select(10);
      var oldMenu=await db.zrange('products', 0, prodvalue, 'withscores');
      oldMenu=this.splitArray(oldMenu)[0];
      db.flushdb();
      var new_prod=new Array();
      for (var index = 0; index < arrofObjects.length-1; index++) {
      var ele = arrofObjects[index];
      await ProductsModel.update({name:ele.name}, {"$set":{"priority": ele.priority}});
      if(ele.priority!='' && ele.name!=undefined)
      {
      new_prod.push(ele.name);
      let count=await db.zcount('products','0',prodvalue);
      await db.zadd('products',count+1,ele.name);
      }
     }
     let menHist=new menuHistoryModel({
       updatedMenu:new Object({menu:new_prod}),
       oldMenu:new Object({menu:oldMenu}),
       modifiedOn:now,
       modifiedBy:arrofObjects[arrofObjects.length-1].user
     });
    await menHist.save();
      return this.Promise.resolve({message:'Updated Successfully'});
    }
  },
  subscribedGraph:{
    async handler(ctx)
    {

      let distinctSubscribedlast5Mins=await subscriptionHistoryModel.distinct("products_subscribed",{"subscribedOn" : {$gt:new Date(Date.now() - 60*60 * 1000)}});
      let finalArrSubs=[];
      for(var k=0;k<distinctSubscribedlast5Mins.length;k++)
      {
        let qSubs={
         products_subscribed:distinctSubscribedlast5Mins[k],
         subscribedOn: { // 60 minutes ago (from now)
             //$gt: new Date(date.getTime() - 1000 * 60 * 60)
            $gt: new Date(Date.now() - 1000 * 60 * 60)
         }
       };
       let subscribeCount=await subscriptionHistoryModel.find(qSubs).countDocuments();
       let objSubs=new Object({products:distinctSubscribedlast5Mins[k],count:subscribeCount});
       finalArrSubs.push(objSubs);
      }
      return this.Promise.resolve({resp:finalArrSubs});
    }
  },
  advertisedGraph:{
    async handler(ctx)
    {
      var finalArr=new Array();
    let distinctProductlast5Mins=await advertisedHistoryModel.distinct("products_advertised",{"advertisedOn" : {$gt:new Date(Date.now() - 5*60 * 1000)}})

    for(var k=0;k<distinctProductlast5Mins.length;k++)
    {
     let q={
      products_advertised:distinctProductlast5Mins[k],
      advertisedOn: { // 5 minutes ago (from now)
          $gt: new Date(Date.now() - 5*60*1000)
      }
    };
      let advertisedCount=await advertisedHistoryModel.find(q).countDocuments();
      let obj=new Object({products:distinctProductlast5Mins[k],count:advertisedCount});
      finalArr.push(obj);

    }
    return this.Promise.resolve({resp:finalArr});
    }
  },

  countProducts:{
    async handler(ctx)
    {
      let ttlProducts=await ProductsModel.countDocuments({});
      let ttlPrioritizedProducts=await ProductsModel.countDocuments({ priority: { $ne: "" }})
      return this.Promise.resolve({message:'success',ttlProducts:ttlProducts,ttlPrioritizedProducts:ttlPrioritizedProducts})
    }
  }
  },
  methods:{
    validateMsisdn(msisdn)
    {
      if(msisdn.length===10)
      {
        return '92'+msisdn;
      }
      else if (msisdn.length===11) {
        return '92'+msisdn.substring(1,11);
      }
      else {
        return msisdn;
      }
    },
    async getThisMsisdnTotalCount(msisdn)
    {
      db.select(1);
      var totalCounts=await db.get(msisdn);
      return totalCounts;
    },
    async showProductsAndAdvertise(msisdn)
    {

      db.select(10);
      var redis_save=false;
      var postTheseProducts=new Array();
      var dontPostThese=new Array();
      var completedKey=new Array();
      var combinedArr=new Array();
      var doc=new Object();
      let allProductsWithPriority=await db.zrange('products', 0, prodvalue, 'withscores');
      let getussdproducts=this.splitArray(allProductsWithPriority)[0];
      let priorityArr=this.splitArray(allProductsWithPriority)[1];
      db.select(0);
      let alreadyPostedProducts=await db.hgetall(msisdn);

      if(alreadyPostedProducts===null)
      {
        postTheseProducts = getussdproducts.slice(0,menuSize);
        redis_save=true;
      }
      else {

        doc = JsonFind(alreadyPostedProducts);
        //console.log(doc);
        let keys=Object.keys(doc);
        if(keys.length<=getussdproducts.length)
        {
          keys.forEach((key=>{
            if(doc[key]>=AllowedLimit)
            {
              completedKey.push(key);
            }
            else if(doc[key]=='-1')
            {
              dontPostThese.push(key);
            }
          }))
          postTheseProducts=this.createArr(getussdproducts,completedKey,dontPostThese);
          redis_save=true;
        }
      }
      if(redis_save==true)
      {
        db.multi()
        postTheseProducts.forEach(async (ele)=>{
          await db.hincrby(msisdn,ele,"1");
        })
        db.select(1);
        await db.incrby(msisdn, 1);
        await db.exec();
        log.info(msisdn+"-----> Pushed Menus ----->"+postTheseProducts);
        return postTheseProducts;
      }
      else {
        return [];
      }
    },
    splitArray(arr) {
      var oddOnes = [],
      evenOnes = [];
      for(var i=0; i<arr.length; i++)
      (i % 2 == 0 ? evenOnes : oddOnes).push(arr[i]);
      return [evenOnes, oddOnes];
    },
    createArr(main,completed,dont)
    {
      let count=0;
      let fn_arr=[];
      for(var i=0;i<main.length;i++)
      {
        if(!completed.includes(main[i]) && !dont.includes(main[i]))
        {	count=count+1;
          if(count<=menuSize && i<main.length)
          {
            fn_arr.push(main[i]);
          }
        }
      }
      return fn_arr;
    }
  },
}
