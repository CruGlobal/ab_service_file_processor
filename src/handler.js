/**
 * handler
 * our Request handler.
 */
const async = require("async");
const fs = require("fs");
const path = require("path");

var config;

const Model = require(path.join(__dirname, "model"));

module.exports = {
   /**
    * init
    * setup our configuration & connections
    * @param {obj} options
    *        An object hash of important configuration data:
    *        .config  {obj} the config settings for this service.
    *        .DB {DBConnection} an instance of a live DB connection.
    *        ...
    */
   init: function (options) {
      options = options || {};
      config = options.config || null;
      Model.init(options.DB);
   },

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
      if (!config) {
         console.log("WARN: file.upload handler not setup properly.");
         err = new Error("file.upload: Missing config");
         err.code = "EMISSINGCONFIG";
         err.req = req;
         cb(err);
         return;
      }

      // check if we are enabled
      if (!config.enable) {
         // we shouldn't be getting notification.email messages
         console.log(
            "WARN: file_processor job received, but config.enable is false.",
         );
         err = new Error("file.upload service is disabled.");
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

      /*
         * perform action here.
         *
         * when job is finished then:
         cb(null, { status: "success" });

         * or if error then:
         cb(err, { status: "error", error: err });
         */

      console.log("jobData : ", req);

      var destPath = path.join(
         config.basePath,
         req.param.tenant,
         req.param.appKey,
      );

      var uuid; // the new uuid of the file

      async.series(
         [
            // make sure destination directory is created
            (next) => {
               fs.stat(destPath, function (err) {
                  if (err && err.code === "ENOENT") {
                     // create the directory!
                     console.log("making file_processor path:" + destPath);

                     fs.mkdir(destPath, { recursive: true }, function (err) {
                        if (err) err.code = 500;
                        next(err);
                     });
                  } else {
                     next();
                  }
               });
            },

            // move file to new location
            (next) => {
               var tempPath = path.join(
                  config.basePath,
                  config.uploadPath,
                  req.param.name,
               );
               var newPath = path.join(destPath, req.param.name);
               fs.rename(tempPath, newPath, function (err) {
                  next(err);
               });
            },

            // store file entry in DB
            (next) => {
               // uuid : the fileName without '.ext'
               uuid = req.param.name.split(".")[0];

               Model.create({
                  uuid: uuid,
                  appKey: req.param.appKey,
                  permission: req.param.permission,
                  file: req.param.name,
                  pathFile: destPath,
                  size: req.param.size,
                  type: req.param.type,
                  info: req.param,
                  uploadedBy: req.param.userUUID, // should be the user.uuid
               })
                  .then(() => {
                     next();
                  })
                  .catch((err) => {
                     err.code = 500;
                     next(err);
                  });
            },

            // return new file uuid
         ],
         (err) => {
            if (err) {
               cb(err);
            } else {
               cb(null, { uuid });
            }
         },
      );

      // cb(null, { uuid: "123456" });
   },
};
