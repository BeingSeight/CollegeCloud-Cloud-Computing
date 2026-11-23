import { S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@libsql/client";
import { env } from "./env.js";

export const db = createClient({ url: env.tursoUrl, authToken: env.tursoToken });

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.cloudflareAccountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
});
