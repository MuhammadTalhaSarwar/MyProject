"use strict";
const { MoleculerClientError } = require("moleculer").Errors;
module.exports ={
  name: "session",
  mixins: [],
  settings: {},
  actions: {
    createSession:{
      params: {
        msisdn:{type:"string"},
        menu:{type:"array"},
        db:{type:"object"}
      },
      async handler(ctx)
      {
          let sess_id=this.makeid(10);
          var sessionObject={session_id:sess_id,msisdn:ctx.params.msisdn,menu:JSON.stringify(ctx.params.menu)};
          let db=ctx.params.db;
          await db.select(2);
          let ifAdded=await db.hmset(sess_id,sessionObject);
          return [ifAdded,sess_id];
      }
    }
  },
  methods:{
   makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
  }
}
