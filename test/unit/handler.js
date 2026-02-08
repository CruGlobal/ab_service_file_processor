/**
 * Handler
 * test the interface for our default service handler.
 */
var _ = require("lodash");
var expect = require("chai").expect;
var fs = require("fs");
var path = require("path");
var rimraf = require("rimraf");

// Base config value.
var defaultConfig = require(
   path.join(__dirname, "..", "..", "config", "file_processor"),
);

var basePath = path.join(__dirname, "..", "testDir");
var testReq = {
   param: {
      tenant: "tenant",
      appKey: "appKey",
      name: "app2.js", // our uploaded file name (app2.js)
   },
};

// Our service handler:
var Handler = require(path.join(__dirname, "..", "..", "src", "handler"));

describe("file_processor: handler", function () {
   // Check for proper initialization
   describe("-> missing config", function () {
      it("should return an error when receiving a job request #missingconfig ", function (done) {
         Handler.init(null); // clear the config in case it is already set
         var request = {};
         Handler.fn(request, (err, response) => {
            expect(err).to.exist;
            expect(err).to.have.property("code", "EMISSINGCONFIG");
            expect(response).to.not.exist;
            done();
         });
      });
   });

   // handle a disabled state:
   describe("-> disabled ", function () {
      var disabledConfig = _.clone(defaultConfig, true);
      disabledConfig.enable = false;

      it("should return an error when receiving a job request #disabled ", function (done) {
         Handler.init({ config: disabledConfig });
         var request = {};
         Handler.fn(request, (err, response) => {
            expect(err).to.have.property("code", "EDISABLED");
            expect(response).to.not.exist;
            done();
         });
      });
   });

   // A properly uploaded file,
   describe("-> A properly uploaded file", function () {
      // should create the expected destination directory if not there and
      // should end up in expected directory,
      it("should end up in an expected directory", function (done) {
         resetFileTest({ uuid: "app2" });

         // call Handler.fn with data that moves the file
         Handler.fn(testReq, (err, response) => {
            expect(err).to.be.null;
            expect(response).to.exist;
            // expect(response).to.have.property("uuid", "app2");
            expect(
               fs.existsSync(
                  path.join(basePath, "tenant", "appKey", "app2.js"),
               ),
            ).to.be.true;

            done();
         });
      });

      // returned uuid should match the DB entry
      it("returned uuid should match filename", function (done) {
         resetFileTest({ uuid: "app2" });

         //get db
         Handler.fn(testReq, (err, response) => {
            expect(err).to.be.null;
            expect(response).to.exist;
            expect(response).to.have.property("uuid", "app2");

            done();
         });
      });

      //   DB entry should be fully populated
      it("DB entry should be fully populated", function (done) {
         var valuesIn = [];
         resetFileTest({
            uuid: "app2",
            dbConn: {
               query: (str, values, cb) => {
                  valuesIn = values;
                  cb(null);
               },
            },
         });
         //get db
         Handler.fn(testReq, (err, response) => {
            expect(err).to.be.null;
            expect(response).to.exist;
            //(uuid, appKey, permission, file, pathFile, size, type, info, uploadedBy, createdAt, updatedAt)
            expect(valuesIn).to.be.an("array");
            expect(valuesIn).to.have.property("length", 11);

            done();
         });
      });
   });
});

//
// helper functions
//

/**
 * resetFileTest()
 * reset our expected testing files / directory to a non processed state
 * before running another test.
 * @param {obj} options
 *        .uuid {string} the value of what our expected uuid should be.
 *        .dbConn {obj} a mock db connection object
 */
function resetFileTest(options) {
   options = options || {};

   // default uuid = "app2"
   options.uuid = options.uuid || "moved-file";

   // use a default dbConn that auto callsback with no errors.
   options.dbConn = options.dbConn || {
      query: (str, values, cb) => {
         cb(null);
      },
   };

   // clear our test directory for files
   var cwd = process.cwd();
   process.chdir(path.join("test", "testDir"));
   rimraf.sync(path.join("tenant"));

   // copy our expected test file so we don't loose it.
   fs.copyFileSync(
      path.join(basePath, "tmp", "testFile.js"),
      path.join(basePath, "tmp", options.uuid + ".js"),
   );

   // send config settings that point to that directory
   Handler.init({
      config: {
         enable: true,
         basePath: basePath,
         uploadPath: "tmp",
      },
      DB: options.dbConn,
   });
   process.chdir(cwd);
}
