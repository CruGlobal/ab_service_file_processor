/*
 * pathUtils.js
 * A common set of utility functions related to uploading / importing
 * files.
 */
const fs = require("fs");
const path = require("path");

module.exports = {
   /**
    * @function destPath
    * return the destination path for files stored in the file_processor.
    * @param {ABUtils.Request} req
    * @return {string}
    */
   destPath: (req) => {
      var config = req.config();
      return path.join(config.basePath, req.tenantID(), "file_processor");
   },

   /**
    * @function makePath
    * ensure the desired destPath exists before we try to save a file.
    * @param {string} destPath
    * @param {ABRequest} req
    * @param {fn} next
    * 		 callback(err, data) function
    */
   makePath: (destPath, req, next) => {
      fs.stat(destPath, function (err) {
         if (err && err.code === "ENOENT") {
            // create the directory!
            req.log("making file_processor path:" + destPath);

            fs.mkdir(destPath, { recursive: true }, function (err) {
               if (err) err.code = 500;
               next(err);
            });
         } else {
            next();
         }
      });
   },

   /**
    * @function tempPath
    * return the temporary path for a file named fileName.
    * @param {ABUtils.Request} req
    * @param {string} fileName
    *        the name of the temp file.
    * @return {string}
    */
   tempPath: (req, fileName) => {
      var config = req.config();
      return path.join(config.basePath, config.uploadPath, fileName);
   },
};
