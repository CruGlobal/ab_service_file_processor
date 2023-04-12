/**
 * file-export
 * This handler returns an export friendly version of the requested file.
 */
const fs = require("fs/promises");

const ABBootstrap = require("../AppBuilder/ABBootstrap");
// {ABBootstrap}
// responsible for initializing and returning an {ABFactory} that will work
// with the current tenant for the incoming request.

module.exports = {
   /**
    * Key: the cote message key we respond to.
    */
   key: "file_processor.file-export",

   /**
    * inputValidation
    * define the expected inputs to this service handler:
    */
   inputValidation: {
      uuid: { string: { uuid: true }, required: true },
   },

   /**
    * fn
    * our Request handler.
    * @param {obj} req
    *        the current request object.
    * @param {fn} cb
    *        a node style callback(err, results)
    */
   fn: async function handler(req, cb) {
      req.log("file_processor.file-export:");

      // get the AB for the current tenant
      try {
         const AB = await ABBootstrap.init(req);

         const uuid = req.param("uuid");

         const SiteFile = AB.objectFile().model();
         const list = await req.retry(() => SiteFile.find({ uuid }));
         if (!list || list.length == 0) return cb(null, null);
         const entry = list[0];

         req.log("entry:", entry);

         const contents = await fs.readFile(entry.pathFile, {
            encoding: "base64",
         });

         cb(null, {
            meta: {
               // Wanted:
               created_at: AB.rules.toSQLDateTime(entry.created_at),
               updated_at: AB.rules.toSQLDateTime(entry.updated_at),
               field: entry.field,
               object: entry.object,
               // pathFile: ???
               file: entry.file, // the name of the original file
               size: entry.size,
               uploadedBy: null,
               type: entry.type,
               info: entry.info,
            },
            contents,
         });
      } catch (err) {
         req.notify.developer(err, {
            context: "Service:file_processor.file-export: Error exporting file",
         });
         cb(err);
      }
   },
};
