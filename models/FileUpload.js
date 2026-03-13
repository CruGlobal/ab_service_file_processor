/**
 * model.js
 * define our DB operations.
 */
import AB from "@digiserve/ab-utils";

export default {
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
