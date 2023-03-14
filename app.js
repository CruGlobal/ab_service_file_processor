//
// file_processor
// A service to manage uploaded files.
//
// const path = require("path");
const AB = require("ab-utils");
const child_process = require("child_process");

var controller = AB.controller("file_processor");
// controller.afterStartup((cb)=>{ return cb(/* err */) });
// controller.beforeShutdown((cb)=>{ return cb(/* err */) });
controller.init();

if (process.env.CLAMAV_ENABLED == "true") {
   child_process.execFile(
      "chown",
      ["-R", "clamav:clamav", "/var/lib/clamav"],
      (err, stdout, stderr) => {
         if (err) {
            console.error("Could not initialize clamav volume.");
            console.error(stderr);
            console.error(err);
         } else {
            // Automatically refresh virus definition DB throughout the day
            child_process.execFile("freshclam", ["-d", "--daemon-notify"]);
            // Load the ClamAV daemon
            child_process.execFile("clamd", (err, stdout, stderr) => {
               if (err) {
                  console.error("Could not start ClamAV daemon.");
                  console.error(stderr);
                  console.error(err);
               } else {
                  console.log("ClamAV daemon ready");
               }
            });
         }
      }
   );
}
