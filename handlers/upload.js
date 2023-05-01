/**
 * handler
 * our Request handler.
 */
const async = require("async");
const fs = require("fs");
const path = require("path");

// const Model = require(path.join(__dirname, "model"));

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file.upload",

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

      var config = req.config();

      // if config not set, we have not be initialized properly.
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
            var email = req.param("email");
            if (!email) {
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

      req.log("jobData : ", req.data);

      var destPath = path.join(
         config.basePath,
         req.data.tenant,
         req.data.appKey
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
                  req.data.name
               );
               var newPath = path.join(destPath, req.data.name);
               fs.rename(tempPath, newPath, function (err) {
                  if (err) {
                     req.log(
                        `Error moving file [${tempPath}] -> [${newPath}] `,
                        err
                     );
                  } else {
                     req.log(`moved file [${tempPath}] -> [${newPath}] `);
                  }
                  next(err);
               });
            },

            // store file entry in DB
            (next) => {
               // uuid : the fileName without '.ext'
               uuid = req.data.name.split(".")[0];

               // then handle .userUUID  -> req.user.id
               var Model = req.Model("FileProcessor");
               Model.create({
                  uuid: uuid,
                  appKey: req.data.appKey,
                  permission: req.data.permission,
                  file: req.data.name,
                  pathFile: destPath,
                  size: req.data.size,
                  type: req.data.type,
                  info: req.data,
                  uploadedBy: req.data.userUUID, // should be the user.uuid
               })
                  .then(function () {
                     req.log(`file entry saved for [${uuid}]`);
                     next();
                  })
                  .catch(function (err) {
                     req.log("Error updating DB: ", err);
                     err.code = 500;
                     next(err);
                  });
            },

            // return new file uuid
         ],
         (err) => {
            if (err) {
               req.log("Error uploading file:", err);
               cb(err);
            } else {
               cb(null, { uuid });
            }
         }
      );

      // cb(null, { uuid: "123456" });
   },
};
