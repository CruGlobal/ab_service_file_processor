/*
 * File_Processor
 */
const AB = require("@digiserve/ab-utils");
const env = AB.defaults.env;
const path = require("path");

module.exports = {
   file_processor: {
      /*************************************************************************/
      /* enable: {bool} is this service active?                                */
      /*************************************************************************/
      enable: env("FILE_PROCESSOR_ENABLE", true),

      /*************************************************************************/
      /* basePath: {string} the root directory for where to store files        */
      /*           make sure this matches the directory where the files volume */
      /*           is mapped to for the container.                             */
      /*                                                                       */
      /*           the final stored file path should be:                       */
      /*           basePath/[tenant.id]/file_processor/[filename.ext]          */
      /*************************************************************************/
      basePath: env("FILE_PROCESSOR_PATH", path.sep + path.join("data")),

      /*************************************************************************/
      /* uploadPath: {string} the directory (under basePath) where uploaded    */
      /*             files are stored.                                         */
      /*************************************************************************/
      uploadPath: env("FILE_PROCESSOR_UPLOAD_DIR", "tmp"),

      /*************************************************************************/
      /* maxBytes: {Number} max size of uploaded file                              */
      /*************************************************************************/
      maxBytes: env("FILE_PROCESSOR_MAXBYTES", 10000000),
   },

   /**
    * datastores:
    * Sails style DB connection settings
    */
   datastores: AB.defaults.datastores(),
};
