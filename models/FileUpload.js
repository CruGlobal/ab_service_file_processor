/**
 * model.js
 * define our DB operations.
 */
const AB = require("@digiserve/ab-utils");
module.exports = {
   table_name: "op_fileupload",
   attributes: {
      uuid: { type: "uuid", required: true },
      appKey: "string",
      permission: "string",
      file: "string",
      pathFile: "string",
      size: "int",
      type: "string",
      info: "string",
      uploadedBy: "number",
   },
   beforeCreate: function (valuesToCreate, cb) {
      if (!valuesToCreate.uuid) {
         valuesToCreate.uuid = AB.uuid();
      }
      cb();
   },
};
