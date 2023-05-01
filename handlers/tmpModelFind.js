/**
 * handler
 * our Request handler.
 */
// const async = require("async");
// const fs = require("fs");
// const path = require("path");

// const Model = require(path.join(__dirname, "model"));

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "model.find",

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the apiSails controller.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: function handler(req, cb) {
      var err;

      // if config not set, we have not be initialized properly.
      var config = req.config();
      if (!config) {
         req.log(`WARN: ${this.key} handler not setup properly.`);
         err = new Error(`${this.key}: Missing config`);
         err.code = "EMISSINGCONFIG";
         err.req = req;
         cb(err);
         return;
      }

      // check if we are enabled
      if (!config.enable) {
         // we shouldn't be getting notification.email messages
         req.log(`WARN: ${this.key} job received, but config.enable is false.`);
         err = new Error(`${this.key} service is disabled.`);
         err.code = "EDISABLED";
         cb(err);
         return;
      }

      // verify required parameters in job
      /*
            if (!req.email) {
              var err2 = new Error(
                ".email parameter required in file.upload service."
              );
              err2.code = "EMISSINGPARAM";
              cb(err2);
              return;
            }
         */

      cb(null, { found: "it" });

      // cb(null, { uuid: "123456" });
   },
};
