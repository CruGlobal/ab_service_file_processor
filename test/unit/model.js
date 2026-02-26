/**
 * model
 * test the definitions for DB operations.
 */
//var _ = require("lodash");
var expect = require("chai").expect;
//var fs = require("fs");
var path = require("path");
//var rimraf = require("rimraf");
// Our model:
var model = require(path.join(__dirname, "..", "..", "src", "model"));

describe("file_processor: model", function () {
   //Test create functions:
   describe("->create functions", function () {
      it("Check for proper initialization ", function () {
         model.init(null);
         model
            .create()
            .then(() => {
               expect(1).to.equal(2);
            })
            .catch((err) => {
               expect(err).to.exist;
               expect(err).to.be.an("error");
            });
      });
      //create function should return promise
      it("should return a return promise ", function () {
         model.init(null);
         expect(model.create().catch(function () {})).to.be.a("promise");
      });
      it("should prevent requst when connection not initialized ", function (done) {
         let testModel = model;
         testModel.init();
         testModel
            .create()
            .then(() => {
               expect("This should not be called").to.equal("Doh!");
               done();
            })
            .catch((err) => {
               // make sure this error is as expected.
               expect(err).to.have.property(
                  "message",
                  "No dbConnection defined.",
               );
               done();
            });
      });
      it("should perform insert, to mysql", function (done) {
         let testModel = model;
         let insertQuery = "";
         let mockDB = {
            query: function (str, arr, callback) {
               insertQuery = str;
               callback();
            },
         };
         testModel.init(mockDB);
         testModel
            .create({})
            .then(() => {
               // check if query string contains insert
               expect(insertQuery.toLowerCase()).to.include(`insert`);
               done();
            })
            .catch(() => {
               expect("err").to.equal("Doh!");
               done();
            });
      });
      it("should also include created/updated at fields ", function (done) {
         let testModel = model;
         let insertQuery = "";
         let mockDB = {
            query: function (str, arr, callback) {
               insertQuery = str;
               callback();
            },
         };
         testModel.init(mockDB);
         testModel
            .create({})
            .then(() => {
               expect(insertQuery).to.include("createdAt");
               expect(insertQuery).to.include("updatedAt");
               done();
            })
            .catch((err) => {
               expect(err).to.equal("Doh!");
               done();
            });
      });
      it("on error, should return the database error ", function (done) {
         let testModel = model;
         let mockDB = {
            query: function (str, arr, callback) {
               let err = new Error("Database error or some sort");
               err.code = "ECONNREFUSED";
               err.fatal = true;
               callback(err);
            },
         };
         testModel.init(mockDB);
         testModel
            .create({})
            .then(() => {
               expect("This should not be called").to.equal("Doh!");
               done();
            })
            .catch((err) => {
               // make sure this error is as expected.
               expect(err).to.have.property(
                  "message",
                  "Database error or some sort",
               );
               done();
            });
      });
      it("on success, should !return ", function (done) {
         let testModel = model;
         let successDB = {
            query: function (str, arr, callback) {
               callback();
            },
         };
         testModel.init(successDB);
         testModel
            .create({})
            .then((results) => {
               expect(results).to.not.exist;
               done();
            })
            .catch(() => {
               expect("err").to.equal("Doh!");
               done();
            });
      });
   });
});
