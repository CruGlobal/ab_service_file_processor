/**
 * file_import
 * our Request handler.
 */
const async = require("async");
const fs = require("fs");
const path = require("path");

const PathUtils = require("../utils/pathUtils.js");
const SQLUpdateUUID = require("../queries/updateUUID.js");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file_processor.file_import",

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    * Format:
    * "parameterName" : {
    *    {joi.fn}   : {bool},  // performs: joi.{fn}();
    *    {joi.fn}   : {
    *       {joi.fn1} : true,   // performs: joi.{fn}().{fn1}();
    *       {joi.fn2} : { options } // performs: joi.{fn}().{fn2}({options})
    *    }
    *    // examples:
    *    "required" : {bool},
    *    "optional" : {bool},
    *
    *    // custom:
    *        "validation" : {fn} a function(value, {allValues hash}) that
    *                       returns { error:{null || {new Error("Error Message")} }, value: {normalize(value)}}
    * }
    */
   inputValidation: {
      uuid: { string: { uuid: true }, required: true },
      entry: { object: true, required: true },
      contents: { string: true, required: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/file_processor/file_import.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: function handler(req, cb) {
      req.log("file_processor.file_import:");

      // get the AB for the current tenant
      ABBootstrap.init(req)
         .then((AB) => { // eslint-disable-line
            // access your config settings if you need them:

            var destPath = PathUtils.destPath(req);

            var contents = req.param("contents");
            var entry = req.param("entry");
            var uuid = req.param("uuid");

            async.series(
               [
                  (done) => {
                     // make sure destPath exists
                     PathUtils.makePath(destPath, req, done);
                  },
                  (done) => {
                     // save the file to disk:
                     var fileName = path.join(destPath, entry.file);
                     var data = new Buffer(contents, "base64");
                     fs.writeFile(fileName, data, (err) => {
                        if (err) return done(err);

                        entry.pathFile = fileName;
                        done();
                     });
                  },
                  (done) => {
                     // remove any existing File Entry
                     var SiteFile = AB.objectFile().model();
                     req.retry(() => SiteFile.delete(uuid))
                        .then(() => {
                           done();
                        })
                        .catch(done);
                  },
                  (done) => {
                     // now save the File DB Entry
                     var SiteFile = AB.objectFile().model();
                     req.retry(() => SiteFile.create(entry))
                        .then(function (entry) {
                           // now make sure the UUID is set correctly
                           SQLUpdateUUID(req, entry.uuid, uuid)
                              .then(() => {
                                 done();
                              })
                              .catch((err) => {
                                 done(err);
                              });
                        })
                        .catch(function (err) {
                           req.notify.developer(err, {
                              context:
                                 "Service:file_processor.file_import: Error creating File DB: ",
                              entry,
                           });
                           err.code = 500;
                           done(err);
                        });
                  },
               ],
               (err) => {
                  if (err) {
                     req.notify.developer(err, {
                        context: "File-Import: error importing file",
                        entry,
                        uuid,
                     });
                     return cb(err);
                  }
                  cb(null, { status: "success" });
               },
            );
         })
         .catch((err) => {
            req.notify.developer(err, {
               context:
                  "Service:file_processor.file_import: Error initializing ABFactory",
            });
            cb(err);
         });
   },
};
