const s3 = require("../config/S3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const mine = require("mime-types");

const uploadToS3 = async (buffer, originalFilename, uid) => {
  const ext = path.extname(originalFilename) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const key = `users/${uid}/${filename}`;
  
  const ContentType = mine.lookup(ext) || "application/octet-stream";

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: ContentType,
  };
  console.log("🔐 ENV:", {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

  const result = await s3.upload(params).promise();

  console.log("✅ Upload lên S3:", result.Location);
  return result.Location;
};

module.exports = uploadToS3;