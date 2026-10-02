const { randomUUID } = require("node:crypto");
const {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");

const bucket = process.env.STORAGE_BUCKET;
const client = new S3Client({ region: process.env.AWS_REGION });
const validKey =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$/;

function requireBucket() {
  if (!bucket) {
    throw new Error("STORAGE_BUCKET is required");
  }
}

async function saveImage(buffer, extension) {
  requireBucket();
  const key = `${randomUUID()}.${extension}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: extension === "png" ? "image/png" : "image/jpeg",
  }));
  return key;
}

async function readImage(key) {
  requireBucket();
  if (!validKey.test(key)) {
    return null;
  }

  try {
    const result = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    if (!result.Body) {
      return null;
    }
    return Buffer.from(await result.Body.transformToByteArray());
  } catch (error) {
    if (
      error instanceof NoSuchKey ||
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
}

module.exports = { saveImage, readImage };
