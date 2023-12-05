/**
 * file-get
 * our Request handler.
 */
const path = require("path");
const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const imageUtils = require("../utils/imageUtils.js");
const pathUtils = require("../utils/pathUtils.js");

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file_processor.file-get",

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
      extension: { string: true, optional: true },
      needOriginalFile: { boolean: true, optional: true },
      // email: { string: { email: true }, optional: true },
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
      req.log("file_processor.file-get:");
      let errorContext = "Error initializing ABFactory.";
      try {
         // get the AB for the current tenant
         const AB = await ABBootstrap.init(req);
         const fileObject = AB.objectFile();
         const SiteFile = fileObject.model();
         const entry = await req.retry(() =>
            SiteFile.find({ uuid: req.param("uuid") })
         );
         const file = entry[0];
         if (file == null) {
            const error = new Error("File not found.");
            errorContext = error.message;
            error.code = 404;
            throw error;
         }
         if (req.param("needOriginalFile") ?? false) {
            cb(null, {
               url: file.pathFile,
            });
            return;
         }
         let filePath = file.pathFile;
         const parsedFilePath = path.parse(filePath);
         const newFileExtension = req.param("extension");
         switch (file.type) {
            case "image/heic":
            case "image/jpeg":
            case "image/png":
            case "image/tiff":
            case "image/webp":
               {
                  const newFilePath = path.join(
                     parsedFilePath.dir,
                     `${parsedFilePath.name}.${newFileExtension || "webp"}`
                  );
                  if (!fileObject.validExtension(newFilePath))
                     throw new Error(`The file extension "${newFileExtension}" is invalid.`);
                  if (!(await pathUtils.checkPath(newFilePath))) {
                     if (await pathUtils.checkPath(filePath))
                        imageUtils.convert(filePath, newFilePath);
                     break;
                  }
                  filePath = newFilePath;
               }
               break;
            default:
               break;
         }
         cb(null, {
            url: filePath,
         });
      } catch (error) {
         req.notify.developer(error, {
            context: `Service:file_processor.file-get: ${errorContext}`,
         });
         cb(error);
      }
   },
};
