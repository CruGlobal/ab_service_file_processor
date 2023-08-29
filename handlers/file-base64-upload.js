/**
 * file-base64
 * return a file as base64
 * our Request handler.
 */
const async = require("async");
const fs = require("fs");
const path = require("path");
const PathUtils = require("../utils/pathUtils.js");
const child_process = require("child_process");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const serviceKey = "file_processor.file-base64-upload"; // this is how listeners will identify this service.

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: serviceKey,
   inputValidation: {
      // uuid: { string: { uuid: true }, required: true },
      photoID: { string: { uuid: true }, required: true },
      object: { string: { uuid: true }, required: true },
      field: { string: { uuid: true }, required: true },
      file: { string: true, required: true }, // raw base64 file
      uploadedBy: { string: true, required: false },
      size: { number: true, required: true }, // we reject oversized files on upload
      type: { string: true, required: true },
      fileName: { string: true, required: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/file_processor/file-get.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: async function handler(req, cb) {
      req.log(`${serviceKey}:`);
      var destPath = PathUtils.destPath(req);

      try {
         // get the AB for the current tenant
         const AB = await ABBootstrap.init(req);
         // const uuid = req.param("uuid");
         const objID = req.param("object");
         var object = AB.objectByID(objID);
         if (!object) {
            var errObj = new Error(
               "file_processor.file_upload: unknown object reference"
            );
            req.notify.builder(errObj, {
               object: req.param("object"),
            });
            cb(errObj);
            return;
         }
         const fieldID = req.param("field");
         if (fieldID != "defaultImage") {
            var field = object.fieldByID(fieldID);
            if (!field) {
               var errField = new Error(
                  "file_processor.file_upload: unknown field reference"
               );
               req.notify.builder(errField, {
                  object,
                  fieldID: req.param("field"),
                  AB: AB,
               });
               cb(errField);
               return;
            }
         }

         const photoID = req.param("photoID");
         let file = req.param("file");

         const size = req.param("size");
         const type = req.param("type");

         // Function to get file extension from type
         function getFileExtensionFromType(fileType) {
            const parts = fileType.split("/");
            if (parts.length === 2) {
               return "." + parts[1];
            } else {
               return "";
            }
         }

         const fileName = req.param("fileName");
         const uploadedBy = req.param("uploadedBy") ?? req.user.username;

         async.series(
            {
               // make sure destination directory is created
               make: (next) => {
                  PathUtils.makePath(destPath, req, next);
               },
               // create file to new location
               create: (next) => {
                  pathFile = path.join(destPath, fileName);
                  // Write the file data to the specified path
                  fs.writeFile(pathFile, file, "base64", (err) => {
                     if (err) {
                        req.notify.developer(err, {
                           context: `Service:${serviceKey}: Error writing file '${pathFile}'`,
                        });
                        next(err);
                     } else {
                        req.notify.developer({
                           context: `Service:${serviceKey}: File written successfully '${pathFile}'`,
                        });
                        next();
                     }
                  });
               },

               // Scan for malware
               clamav: (next) => {
                  if (!(process.env.CLAMAV_ENABLED == "true")) {
                     return next();
                  }
                  child_process.execFile(
                     "clamdscan",
                     [pathFile, "--remove=yes", "--quiet"],
                     (err, stdout, stderr) => {
                        if (err) {
                           // ClamAV found a virus
                           if (err.code == 1) {
                              req.log("Malware detected in upload");
                              err.message = "Malware detected in upload";
                           }
                           // Some other system error
                           else {
                              req.log("Problem running ClamAV");
                              req.log(stderr);
                           }
                           next(err);
                        } else {
                           next();
                        }
                     }
                  );
               },
               // store file entry in DB
               uuid: (next) => {
                  // build info object
                  let info = {
                     name: fileName,
                     object: objID,
                     field: fieldID,
                     size: size,
                     type: type,
                     fileName: fileName,
                     uploadedBy: uploadedBy,
                  };

                  var newEntry = {
                     uuid: photoID,
                     file: req.param("fileName"),
                     pathFile: pathFile,
                     size: req.param("size"),
                     type: req.param("type"),
                     info: info,
                     object: objID,
                     field: fieldID,
                     uploadedBy: req.param("uploadedBy"),
                  };
                  var SiteFile = AB.objectFile().model();
                  req.retry(() => SiteFile.create(newEntry))
                     .then(function (entry) {
                        req.log(`file entry saved for [${entry.uuid}]`);
                        next(null, entry.uuid);
                     })
                     .catch(function (err) {
                        req.notify.developer(err, {
                           context:
                              "Service:file_processor.file_upload: Error updating DB: ",
                           req: req.data,
                        });
                        err.code = 500;
                        next(err);
                     });
               },
            },
            (err, results) => {
               if (err) {
                  req.log("Error uploading file:", err);
                  cb(err);
               } else {
                  let returnID = results?.uuid || photoID;
                  cb(null, { uuid: returnID });
               }
            }
         );
      } catch (err) {
         req.notify.developer(err, {
            context: `Service:${serviceKey}: Error initializing ABFactory`,
         });
         return cb(err);
      }
   },
};
