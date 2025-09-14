const AWS = require('aws-sdk');
const S3Client = requere('@aws-sdk/client-s3');
const dotenv = require('dotenv').config();

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION
})

module.exports = s3;
