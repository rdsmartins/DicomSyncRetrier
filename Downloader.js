const axios = require("axios");
const https = require("https");
const fs = require("fs");
const instance = axios.create({
  httpsAgent: new require("https").Agent({
    rejectUnauthorized: false
  })
});
const DownLoader = (host, instanceId, pathToSave) => {
  var url = host + "/instances/" + instanceId + "/file";

  return new Promise((resolve, reject) => {
    instance({
      method: "get",
      url: url,
      responseType: "stream"
    }).then(function(response) {
      const filePath = `${pathToSave}/${instanceId}.dcm`;
      const pipe = response.data.pipe(fs.createWriteStream(filePath));

      pipe.on("finish", () => {
        console.log("DownLoader instance", instanceId, "Finished");

        resolve({
          filePath
        });
      });
    });
  });
};

module.exports = DownLoader;
