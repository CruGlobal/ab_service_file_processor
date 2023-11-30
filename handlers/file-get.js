/**
 * file-get
 * our Request handler.
 */
const path = require("path");
const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const pathUtils = require("../utils/pathUtils.js");

const getFilePath = async (req, file) => {
   let filePath = file.pathFile;
   switch (file.type) {
      case "image/heic":
      case "image/jpeg":
      case "image/png":
      case "image/tiff":
      case "image/webp":
         const parsedImagePath = path.parse(filePath);
         const imageWEBPPath = path.join(
            parsedImagePath.dir,
            `${parsedImagePath.name}.webp`
         );
         if (await pathUtils.checkPath(imageWEBPPath)) {
            filePath = imageWEBPPath;
            break;
         }
         if (await pathUtils.checkPath(filePath))
            req.worker(
               async (imagePath, extension) => {
                  // I tried to figure out how to use require() but it is not working.
                  // On Nodejs document say process.mainModule is deprecated but it's still working here.
                  const path = process.mainModule.require("path");
                  const imageUtils = process.mainModule.require(
                     `${path.join(path.resolve(), "/utils/imageUtils.js")}`
                  );
                  await imageUtils.convert(imagePath, extension);
               },
               [filePath, "webp"]
            );
         break;
      default:
         break;
   }
   return filePath;
};

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
         const SiteFile = AB.objectFile().model();
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
         cb(null, { url: await getFilePath(req, file) });
      } catch (error) {
         req.notify.developer(error, {
            context: `Service:file_processor.file-get: ${errorContext}`,
         });
         cb(error);
      }
   },
};
