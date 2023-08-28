/**
 * file-base64
 * return a file as base64
 * our Request handler.
 */
const async = require("async");
const fs = require("fs");
const path = require("path");
// const Jimp = require("jimp");
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
      size: { number: true, required: true },
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

         const fileData = Buffer.from(file, "base64");

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

         const uniqueFileName = fileName.concat(
            "_",
            photoID,
            getFileExtensionFromType(type)
         );

         //
         async.series(
            {
               // TODO @achoobert
               // Scan for malware
               clamav: (next) => {
                  if (!(process.env.CLAMAV_ENABLED == "true")) {
                     return next();
                  }
                  child_process.execFile(
                     "clamdscan",
                     [tempPath, "--remove=yes", "--quiet"],
                     (err, stdout, stderr) => {
                        if (err) {
                           // ClamAV found a virus
                           if (err.code == 1) {
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
               // make sure destination directory is created
               make: (next) => {
                  PathUtils.makePath(destPath, req, next);
               },
               // create file to new location
               create: (next) => {
                  pathFile = path.join(destPath, uniqueFileName);
                  var filePath = pathFile;
                  // fs.rename(tempPath, pathFile, function (err) {
                  //    if (err) {
                  //       req.notify.developer(err, {
                  //          context: `Service:file_processor.file_upload: Error moving file [${tempPath}] -> [${pathFile}] `,
                  //          tempPath,
                  //          pathFile,
                  //       });
                  //    } else {
                  //       req.log(
                  //          `moved file [${tempPath}] -> [${pathFile}] `
                  //       );
                  //    }
                  //    next(err);
                  // });
                  // Write the file data to the specified path
                  fs.writeFile(pathFile, file, "base64", (err) => {
                     if (err) {
                        req.notify.developer(err, {
                           context: `Service:${serviceKey}: Error writing file '${pathFile}'`,
                        });
                     } else {
                        req.notify.developer({
                           context: `Service:${serviceKey}: File written successfully '${pathFile}'`,
                        });
                     }
                  });
               },

               // store file entry in DB
               uuid: (next) => {
                  // uuid : the fileName without '.ext'
                  // uuid = req.param("name").split(".")[0];

                  var newEntry = {
                     // uuid,
                     file: req.param("fileName"),
                     pathFile,
                     size: req.param("size"),
                     type: req.param("type"),
                     info: {},
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
                  cb(null, { uuid: results.uuid });
               }
            }
         );
         //
         // // if is a mobile fetch and file size is bigger than 2.5 MB
         // // look for a mobile render, create it if needed
         // if (isMobileImage && entry.size > 1.75 * 1000 * 1000) {
         //    const pathSplit = entry.pathFile.split("/");
         //    const mobileFileName = `mobile_${pathSplit.pop()}`;
         //    pathSplit.push(mobileFileName);
         //    const mobilePath = pathSplit.join("/");
         //    const mobileRenderExists = await checkFileAccess(mobilePath);
         //    if (!mobileRenderExists) {
         //       try {
         //          await createMobileRender(entry.pathFile, mobilePath, req);
         //       } catch (err) {
         //          // error already sent to notify.developer so just return
         //          err.code = 500;
         //          return cb(err);
         //       }
         //    }

         //    filePath = mobilePath;
         // }

         // Read the file
         // try {
         //    const contents = await fs.readFile(filePath);
         //    return cb(null, { image: contents });
         // } catch (err) {
         //    req.notify.developer(err, {
         //       context: `Service:${serviceKey}: Error reading file '${filePath}'`,
         //    });
         //    return cb(err);
         // }
      } catch (err) {
         req.notify.developer(err, {
            context: `Service:${serviceKey}: Error initializing ABFactory`,
         });
         return cb(err);
      }
   },
};

// /**
//  * Uses Jimp to create and save a smaller sized image
//  * @param {string} originalPath - path of the original image
//  * @param {string} mobilePath - path to save the new image
//  * @param {object} req - used to notify developers on errors
//  */
// async function createMobileRender(originalPath, mobilePath, req) {
//    let jimpImage;
//    try {
//       jimpImage = await Jimp.read(originalPath);
//    } catch (err) {
//       req.notify.developer(err, {
//          context: `Service:${serviceKey}: jimp error reading file '${originalPath}'`,
//       });
//       throw err;
//    }
//    try {
//       jimpImage.scaleToFit(2000, 2000, Jimp.RESIZE_BEZIER);
//       jimpImage.quality(80);
//       await jimpImage.writeAsync(mobilePath);
//    } catch (err) {
//       req.notify.developer(err, {
//          context: `Service:${serviceKey}: jimp error resizing/writing file '${mobilePath}'`,
//       });
//       throw err;
//    }
//    return;
// }

/**
 * Wrapper around fs.access to return true/false
 * @param {string} path file path
 * @returns {boolean}
 */
async function checkFileAccess(path) {
   try {
      await fs.access(path, fs.constants.R_OK);
      return true;
   } catch (err) {
      return false;
   }
}
