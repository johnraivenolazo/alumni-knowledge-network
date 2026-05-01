const { S3Client } = require('@aws-sdk/client-s3');
try {
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
  console.log('S3Client instantiated successfully');
} catch (e) {
  console.error('S3Client error:', e.message);
}
