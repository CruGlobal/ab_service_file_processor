//
// file_processor
// A service to manage uploaded files.
//
// const path = require("path");
const AB = require("@digiserve/ab-utils");

var controller = AB.controller("file_processor");
// controller.afterStartup((cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((cb)=>{ return cb(/* err */) });
controller.init();
