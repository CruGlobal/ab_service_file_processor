/**
 * file-base64
 * return a file as base64
 * our Request handler.
 */
const fs = require("fs/promises");
const Jimp = require("jimp");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.
const serviceKey = "file_processor.file-base64";

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: serviceKey,
   inputValidation: {
      uuid: { string: { uuid: true }, required: true },
      mobile: { boolean: true, optional: true },
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
      req.log("file_processor.file-base64:");

      try {
         // get the AB for the current tenant
         const AB = await ABBootstrap.init(req);
         const uuid = req.param("uuid");
         const SiteFile = AB.objectFile().model();
         const entries = await req.retry(() => SiteFile.find({ uuid }));
         if (entries.length < 1) {
            const err = new Error("File not found.");
            err.code = 404;
            return cb(err);
         }
         const entry = entries[0];
         const isMobile = req.param("mobile") ?? false;
         const isMobileImage = isMobile && /image\//.test(entry.type);
         let filePath = entry.pathFile;

         // if is a mobile fetch and file size is bigger than 2.5 MB
         // look for a mobile render, create it if needed
         if (isMobileImage && entry.size > 1.75 * 1000 * 1000) {
            const pathSplit = entry.pathFile.split("/");
            const mobileFileName = `mobile_${pathSplit.pop()}`;
            pathSplit.push(mobileFileName);
            const mobilePath = pathSplit.join("/");
            const mobileRenderExists = await checkFileAccess(mobilePath);
            if (!mobileRenderExists) {
               try {
                  await createMobileRender(entry.pathFile, mobilePath, req);
               } catch (err) {
                  // error already sent to notify.developer so just return
                  err.code = 500;
                  return cb(err);
               }
            }

            filePath = mobilePath;
         }

         // Read the file
         try {
            const contents = await fs.readFile(filePath, {
               encoding: "base64",
            });
            return cb(null, { image: contents });
         } catch (err) {
            req.notify.developer(err, {
               context: `Service:${serviceKey}: Error reading file '${filePath}'`,
            });
            return cb(err);
         }
      } catch (err) {
         req.notify.developer(err, {
            context: `Service:${serviceKey}: Error initializing ABFactory`,
         });
         return cb(err);
      }
   },
};

/**
 * Uses Jimp to create and save a smaller sized image
 * @param {string} originalPath - path of the original image
 * @param {string} mobilePath - path to save the new image
 * @param {object} req - used to notify developers on errors
 */
async function createMobileRender(originalPath, mobilePath, req) {
   let jimpImage;
   try {
      jimpImage = await Jimp.read(originalPath);
   } catch (err) {
      req.notify.developer(err, {
         context: `Service:${serviceKey}: jimp error reading file '${originalPath}'`,
      });
      throw err;
   }
   try {
      jimpImage.scaleToFit(2000, 2000, Jimp.RESIZE_BEZIER);
      jimpImage.quality(80);
      await jimpImage.writeAsync(mobilePath);
   } catch (err) {
      req.notify.developer(err, {
         context: `Service:${serviceKey}: jimp error resizing/writing file '${mobilePath}'`,
      });
      throw err;
   }
   return;
}

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
