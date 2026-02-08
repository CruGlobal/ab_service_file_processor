/**
 * @function updateUUID
 * modify an entry in SITE_FILE to change the uuid from one value to another.
 *
 * This is used in file_import.js because imported files need to maintain the
 * original uuid value as given.  Our SiteFile.create() will create a new uuid
 * that must be updated.
 *
 * @param {ABUtil.serviceRequest} req
 * @param {string:uuid} from
 * 		  the current uuid of the entry we are changing.
 * @param {string:uuid} to
 * 		  the new uuid value.
 *
 */
module.exports = function (req, from, to) {
   return new Promise((resolve, reject) => {
      let tenantDB = req.queryTenantDB(reject);
      if (!tenantDB) {
         // reject() has already been called in .queryTenantDB()
         return;
      }

      tenantDB += ".";

      let sql = `
update ${tenantDB}\`SITE_FILE\`
SET \`uuid\` = ?
WHERE \`uuid\` = ?`;

      req.query(sql, [to, from], (error, results /*fields*/) => {
         if (error) {
            req.log(sql);
            reject(error);
         } else {
            resolve(results);
         }
      });
   });
};
