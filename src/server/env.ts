import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  tursoUrl: required("TURSO_DATABASE_URL"),
  tursoToken: required("TURSO_AUTH_TOKEN"),
  cloudflareAccountId: required("CLOUDFLARE_ACCOUNT_ID"),
  r2AccessKeyId: required("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  r2Bucket: required("R2_BUCKET_NAME"),
  port: Number(process.env.PORT ?? 8788),
  publicAppUrl: process.env.PUBLIC_APP_URL,
};
