/*
 * File_Processor
 */
function env(envKey, defaultValue) {
   if (typeof process.env[envKey] == "undefined") {
      return defaultValue;
   }
   try {
      return JSON.parse(process.env[envKey]);
   } catch (e) {
      console.log(e);
      console.log(process.env[envKey]);
      return process.env[envKey];
   }
}
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
   datastores: {
      appbuilder: {
         adapter: "sails-mysql",
         host: env("MYSQL_HOST", "db"),
         port: env("MYSQL_PORT", 3306),
         user: env("MYSQL_USER", "root"),
         password: process.env.MYSQL_PASSWORD,
         database: env("MYSQL_DBPREFIX", "appbuilder"),
      },
      site: {
         adapter: "sails-mysql",
         host: env("MYSQL_HOST", "db"),
         port: env("MYSQL_PORT", 3306),
         user: env("MYSQL_USER", "root"),
         password: process.env.MYSQL_PASSWORD,
         database: env("MYSQL_DBADMIN", "appbuilder-admin"),
      },
   },
};
