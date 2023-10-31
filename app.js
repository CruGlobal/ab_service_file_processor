//
// file_processor
// A service to manage uploaded files.
//
// const path = require("path");
const AB = require("@digiserve/ab-utils");
const child_process = require("child_process");
const { version } = require("./package");
// Use sentry by default, but can override with env.TELEMETRY_PROVIDER
if (AB.defaults.env("TELEMETRY_PROVIDER", "sentry") == "sentry") {
   AB.telemetry.init("sentry", {
      dsn: AB.defaults.env(
         "SENTRY_DSN",
         "https://095e01fe2fc16e08935122417f0dbac2@o144358.ingest.sentry.io/4506143774998528"
      ),
      release: version,
   });
}

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
