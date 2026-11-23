import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import multer from "multer";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env.js";
import { db, r2 } from "./services.js";
import { initialiseDatabase } from "./schema.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });
const allowedPermissions = new Set(["viewer", "editor"]);

app.use(cors({ origin: true }));
app.use(express.json());

function id() { return crypto.randomUUID(); }
function safeFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "_"); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Unexpected server error"; }

app.get("/api/health", (_req, res) => res.json({ status: "ok", storage: "Cloudflare R2", database: "Turso" }));

app.get("/api/folders", async (_req, res) => {
  const result = await db.execute(`SELECT f.id, f.name, f.created_at AS createdAt, COUNT(files.id) AS fileCount
    FROM folders f LEFT JOIN files ON files.folder_id = f.id GROUP BY f.id ORDER BY f.name`);
  res.json(result.rows);
});

app.post("/api/folders", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name || name.length > 60) return res.status(400).json({ error: "Enter a folder name (maximum 60 characters)." });
  try {
    const folder = { id: id(), name, createdAt: new Date().toISOString() };
    await db.execute({ sql: "INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)", args: [folder.id, folder.name, folder.createdAt] });
    res.status(201).json(folder);
  } catch { res.status(409).json({ error: "A folder with that name already exists." }); }
});

app.get("/api/files", async (req, res) => {
  const folderId = typeof req.query.folderId === "string" ? req.query.folderId : "all";
  const filter = folderId === "all" ? "" : "WHERE files.folder_id = ?";
  const result = await db.execute({
    sql: `SELECT files.id, files.folder_id AS folderId, files.original_name AS originalName, files.content_type AS contentType,
      files.size_bytes AS sizeBytes, files.created_at AS createdAt, folders.name AS folderName,
      (SELECT COUNT(*) FROM shares WHERE shares.file_id = files.id AND shares.revoked_at IS NULL) AS shareCount
      FROM files JOIN folders ON folders.id = files.folder_id ${filter} ORDER BY files.created_at DESC`,
    args: folderId === "all" ? [] : [folderId],
  });
  res.json(result.rows);
});

app.post("/api/files", upload.single("file"), async (req, res) => {
  const file = req.file;
  const folderId = String(req.body?.folderId ?? "");
  if (!file) return res.status(400).json({ error: "Choose a file to upload." });
  const exists = await db.execute({ sql: "SELECT id FROM folders WHERE id = ?", args: [folderId] });
  if (!exists.rows.length) return res.status(400).json({ error: "Choose a valid folder." });
  const fileId = id();
  const objectKey = `${folderId}/${fileId}-${safeFileName(file.originalname)}`;
  try {
    await r2.send(new PutObjectCommand({ Bucket: env.r2Bucket, Key: objectKey, Body: file.buffer, ContentType: file.mimetype }));
    const createdAt = new Date().toISOString();
    await db.execute({ sql: `INSERT INTO files (id, folder_id, original_name, object_key, content_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [fileId, folderId, file.originalname, objectKey, file.mimetype || null, file.size, createdAt] });
    res.status(201).json({ id: fileId, originalName: file.originalname, folderId, sizeBytes: file.size, createdAt });
  } catch (error) { res.status(500).json({ error: `Upload failed: ${errorMessage(error)}` }); }
});

app.get("/api/files/:id/download", async (req, res) => {
  const result = await db.execute({ sql: "SELECT object_key FROM files WHERE id = ?", args: [req.params.id] });
  if (!result.rows.length) return res.status(404).json({ error: "File not found." });
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.r2Bucket, Key: String(result.rows[0].object_key) }), { expiresIn: 600 });
  res.json({ url, expiresInSeconds: 600 });
});

app.post("/api/files/:id/share", async (req, res) => {
  const permission = String(req.body?.permission ?? "viewer");
  if (!allowedPermissions.has(permission)) return res.status(400).json({ error: "Permission must be viewer or editor." });
  const exists = await db.execute({ sql: "SELECT id FROM files WHERE id = ?", args: [req.params.id] });
  if (!exists.rows.length) return res.status(404).json({ error: "File not found." });
  const token = crypto.randomBytes(18).toString("base64url");
  await db.execute({ sql: "INSERT INTO shares (id, file_id, token, permission, created_at) VALUES (?, ?, ?, ?, ?)", args: [id(), req.params.id, token, permission, new Date().toISOString()] });
  const appUrl = env.publicAppUrl?.replace(/\/$/, "") || `${req.protocol}://${req.get("host")}`;
  res.status(201).json({ token, permission, link: `${appUrl}/shared/${token}` });
});

app.get("/api/shared/:token", async (req, res) => {
  const result = await db.execute({ sql: `SELECT shares.permission, files.id, files.original_name AS originalName, files.object_key AS objectKey,
    files.size_bytes AS sizeBytes, files.content_type AS contentType FROM shares JOIN files ON files.id = shares.file_id
    WHERE shares.token = ? AND shares.revoked_at IS NULL`, args: [req.params.token] });
  if (!result.rows.length) return res.status(404).json({ error: "This link is invalid or has been revoked." });
  const file = result.rows[0];
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: env.r2Bucket, Key: String(file.objectKey) }), { expiresIn: 600 });
  res.json({ id: file.id, originalName: file.originalName, sizeBytes: file.sizeBytes, contentType: file.contentType, permission: file.permission, downloadUrl: url });
});

app.delete("/api/files/:id", async (req, res) => {
  const result = await db.execute({ sql: "SELECT object_key FROM files WHERE id = ?", args: [req.params.id] });
  if (!result.rows.length) return res.status(404).json({ error: "File not found." });
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: String(result.rows[0].object_key) }));
    await db.batch([
      { sql: "DELETE FROM shares WHERE file_id = ?", args: [req.params.id] },
      { sql: "DELETE FROM files WHERE id = ?", args: [req.params.id] },
    ]);
    res.status(204).end();
  } catch (error) { res.status(500).json({ error: `Delete failed: ${errorMessage(error)}` }); }
});

// In production, one Render service serves both the React app and its API.
if (process.env.NODE_ENV === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDirectory = path.resolve(here, "../dist");
  app.use(express.static(clientDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(clientDirectory, "index.html")));
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: "Files must be 4 MB or smaller." });
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

await initialiseDatabase();

// Vercel imports the Express app as a serverless function. Locally and on Render,
// this module starts the regular HTTP server instead.
if (!process.env.VERCEL) {
  app.listen(env.port, () => console.log(`CollegeCloud API at http://localhost:${env.port}`));
}

export default app;
