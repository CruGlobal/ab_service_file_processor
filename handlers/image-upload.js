/**
 * image-upload
 * our Request handler for images being uploaded by the ABDesigner.
 */
const path = require("path");
const Handler_File_Upload = require("./file_upload.js");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const imageUtils = require("../utils/imageUtils.js");

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file_processor.image-upload",

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    */
   inputValidation: {
      name: { string: true, required: true },
      size: { number: { integer: true }, required: true },
      type: { string: true, required: true },
      fileName: { string: true, required: true },
      uploadedBy: { string: true, required: true },
      convertToExtensions: { array: true, optional: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the request object sent by the
    *        api_sails/api/controllers/file_processor/file_upload.
    * @param {fn} cb
    *        a node style callback(err, results) to send data when job is finished
    */
   fn: async function handler(req, cb) {
      req.log("file_processor.image-upload:");

      try {
         const AB = await ABBootstrap.init(req);

         // OK, image uploads are basically File Uploads without the Object
         // + File references.  So we will spoof those and reuse the
         // file_upload handler to perform the actual registering of the file.

         // So we will just take the first field from the SiteUser object and
         // pretend we are uploading a file for that. (doesn't matter what
         // field it actually is)
         const SiteUser = AB.objectUser();
         req.data.object = SiteUser.id;
         req.data.field = SiteUser.fields()[0].id;

         // Now reuse the file_upload handler to process the file:
         Handler_File_Upload.fn(req, async (err, results) => {
            if (err) {
               req.log("Error uploading image:", err);
               cb(err);
               return;
            }
            // go ahead and return the response to the user
            cb(null, results);
            let errorContext =
               "Service:file_processor.image-upload: Error updating uploaded image";
            try {
               // on a successful save, we need to modify the entry to
               // remove the object & file references.
               const SiteFile = AB.objectFile().model();
               const { pathFile } = await req.retry(() =>
                  SiteFile.update(results.uuid, {
                     object: null,
                     field: null,
                  })
               );
               errorContext =
                  "Service:file_processor.image-upload: Error converting uploaded image";
               const convertToExtensions = req.param("convertToExtensions");
               if (
                  !Array.isArray(convertToExtensions) ||
                  convertToExtensions.length === 0
               )
                  return;
               const fileObject = AB.objectFile();
               const parsedPathFile = path.parse(pathFile);
               convertToExtensions.forEach(async (e) => {
                  if (!fileObject.validExtension(e))
                     throw new Error(`The file extension "${e}" is invalid.`);
                  const newPathFile = path.join(
                     parsedPathFile.dir,
                     `${parsedPathFile.name}.${e}`
                  );
                  imageUtils.convert(pathFile, newPathFile);
               });
            } catch (err2) {
               req.notify.developer(err2, {
                  context: errorContext,
               });
            }
         });
      } catch (err) {
         req.notify.developer(err, {
            context:
               "Service:file_processor.file_upload: Error initializing ABFactory",
         });
         cb(err);
      }
   },
};
