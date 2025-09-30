const s3 = require("../config/S3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const mine = require("mime-types");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();



const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ||`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

  console.log("🌍 CLOUDFRONT_DOMAIN =", CLOUDFRONT_DOMAIN);


const uploadToS3 = async (buffer, originalFilename, uid) => {
  const ext = path.extname(originalFilename).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const key = `users/${uid}/${filename}`;
  
  let ContentType = mine.lookup(ext) || "application/octet-stream";

    if (ext === ".mp4") {
    ContentType = "video/mp4";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    ContentType = "image/jpeg";
  } else if (ext === ".png") {
    ContentType = "image/png";
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: ContentType,
  };
  
  const result = await s3.send(new PutObjectCommand(params));
  const Location = `${CLOUDFRONT_DOMAIN}/${key}`;

  console.log("✅ Upload lên S3 cloudfront:", Location);
  return Location;
};

module.exports = uploadToS3;