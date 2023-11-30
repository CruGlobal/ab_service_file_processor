/*
 * pathUtils.js
 * A common set of utility functions related to uploading / importing
 * files.
 */
const { exec } = require("child_process");
const fs = require("fs");
const { reject } = require("lodash");
const path = require("path");

module.exports = {
   convert: async (imagePath, extension, quality, resize) => {
      switch (extension) {
         case "heic":
         case "jpg":
         case "png":
         case "tiff":
         case "webp":
            break;
         default:
            return;
      }
      const args = ["convert"];
      if (quality != null) args.push(`-quality ${quality}`);
      if (resize != null) args.push(`-resize ${resize}`);
      args.push(imagePath);
      const parsedImagePath = path.parse(imagePath);
      args.push(path.join(parsedImagePath.dir, `${parsedImagePath.name}.${extension}`));
      await new Promise((resolve) => {
         exec(args.join(" "), (error) => {
            if (error) reject(error);
            resolve();
         });
      });
   },
};
