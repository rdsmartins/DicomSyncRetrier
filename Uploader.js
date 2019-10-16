const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const instance = axios.create({
  httpsAgent: new require("https").Agent({
    rejectUnauthorized: false
  })
});
const getLength = formData => {
  return new Promise((resolve, reject) => {
    formData.getLength(async (err, len) => {
      if (err) return reject(err);
      resolve(len);
    });
  });
};
class HttpUploader {
  static async uploadFile(url, filePath) {
    const hugeStream = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append("file", hugeStream);
    const len = await getLength(formData);
    const headers = formData.getHeaders({ "content-length": len });

    // console.log('Processing File:', filePath, 'len', len);
    let ret = null;
    try {
      ret = await instance({
        method: "post",
        url: url,
        headers: headers,
        data: formData,
        maxContentLength: len
      });
      return {
        server: url,
        file: filePath,
        status: ret.status,
        ts: new Date()
      };
    } catch (error) {
      throw new Error(error.msg || error.message || error);
    }

    // console.log(ret.status, filePath);
  }
}

module.exports = HttpUploader;
