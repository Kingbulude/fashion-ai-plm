import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

export async function uploadFile(file: File, key: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });
  
  await r2Client.send(command);
  
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${key}`;
}

export async function getFileUrl(key: string): Promise<string> {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await r2Client.send(command);
}

export { r2Client };
