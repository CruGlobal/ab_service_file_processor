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

      // NOTE: Fix orient of image when convert from JPEG to WEBP
      // https://bugs.chromium.org/p/webp/issues/detail?id=427
      args.push("-auto-orient");

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

   rotate: async (imagePath, newImagePath, direction = "left") => {
      const degree = (direction == "left" ? 270 : 90);
      const cmd = `convert ${imagePath} -rotate ${degree} ${newImagePath}`;

      return await new Promise((resolve, reject) => {
         exec(cmd, (error) => {
            if (error) reject(error);
            resolve();
         });
      });

   }
};
