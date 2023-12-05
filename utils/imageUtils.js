/*
 * pathUtils.js
 * A common set of utility functions related to uploading / importing
 * files.
 */
const { exec } = require("child_process");
const path = require("path");

module.exports = {
   convert: async (imagePath, newImagePath, quality, resize) => {
      const args = ["convert"];
      if (quality != null) args.push(`-quality ${quality}`);
      if (resize != null) args.push(`-resize ${resize}`);
      args.push(imagePath, newImagePath);
      await new Promise((resolve, reject) => {
         exec(args.join(" "), (error) => {
            if (error) reject(error);
            resolve();
         });
      });
   },
};
