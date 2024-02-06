/**
 * image-rotate
 * our Request handler for rotate images.
 */
const path = require("path");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const imageUtils = require("../utils/imageUtils.js");
const pathUtils = require("../utils/pathUtils.js");

// setup our base path:
// const pathFiles = sails.config.file_processor
// ? sails.config.file_processor.basePath
// : false || path.sep + path.join("data");

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file_processor.image-rotate",

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    */
   inputValidation: {
      uuid: { string: { uuid: true }, required: true },
      direction: { string: true, required: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/file_processor/image-rotate.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: async function handler(req, cb) {
      req.log("file_processor.image-rotate:");

      const fileId = req.param("uuid");
      const direction = req.param("direction");

      try {
        // get the AB for the current tenant
        const AB = await ABBootstrap.init(req);

        // Get file path
        const fileObject = AB.objectFile();
        const SiteFile = fileObject.model();
        const entry = await req.retry(() =>
            SiteFile.find({ uuid: fileId })
        );
        const file = entry[0];
        if (file == null) {
           const error = new Error("File info not found.");
           error.code = 404;
           throw error;
        }
        const filePath = file.pathFile;

        // Webp file path
        const parsedFilePath = path.parse(filePath);
        const webpFilePath = path.join(
            parsedFilePath.dir,
            `${parsedFilePath.name}.webp`
         );

        // Verify image exists
        if (!(await pathUtils.checkPath(webpFilePath))) {
            const error = new Error("webp format file not found.");
            error.code = 404;
            throw error; 
        }

        // Rotate the image
         await imageUtils.rotate(webpFilePath, webpFilePath, direction);

         cb();
      } catch (err) {
         req.notify.developer(err, {
            context:
               `Service:file_processor.image-rotate: Error rotating Image file Id: ${fileId}, Direction: ${direction}`,
         });
         cb(err);
      }
   },
};
