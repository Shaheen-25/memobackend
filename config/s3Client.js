import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the S3 client for Backblaze B2
export const s3 = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT,
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  signatureVersion: 'v4',
});