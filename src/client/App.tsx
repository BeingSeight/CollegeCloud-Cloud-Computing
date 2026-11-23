import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

type Folder = { id: string; name: string; fileCount: number };
type CloudFile = { id: string; originalName: string; folderId: string; folderName: string; contentType: string | null; sizeBytes: number; createdAt: string; shareCount: number };
type SharedFile = { originalName: string; sizeBytes: number; permission: string; downloadUrl: string };

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)); }
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

function SharedView({ token }: { token: string }) {
  const [file, setFile] = useState<SharedFile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { request<SharedFile>(`/api/shared/${token}`).then(setFile).catch((e: Error) => setError(e.message)); }, [token]);
  return <main className="shared-page"><div className="shared-card"><div className="mark">CC</div><p className="eyebrow">COLLEGE CLOUD</p><h1>{file?.originalName || "Shared academic file"}</h1>{error ? <p className="error">{error}</p> : !file ? <p className="muted">Opening secure link…</p> : <><p className="muted">{formatBytes(file.sizeBytes)} · Permission: <strong>{file.permission}</strong></p><a className="primary-button" href={file.downloadUrl}>Download file</a><p className="hint">This protected download link expires in 10 minutes.</p></>}</div></main>;
}

export default function App() {
  const shareToken = /^\/shared\/([^/]+)$/.exec(window.location.pathname)?.[1];
  if (shareToken) return <SharedView token={shareToken} />;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [activeFolder, setActiveFolder] = useState("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState("notes");
  const [folderName, setFolderName] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareFile, setShareFile] = useState<CloudFile | null>(null);
  const [permission, setPermission] = useState("viewer");
  const [shareLink, setShareLink] = useState("");

  const activeName = useMemo(() => activeFolder === "all" ? "All files" : folders.find((folder) => folder.id === activeFolder)?.name || "Folder", [activeFolder, folders]);
  async function refresh(folder = activeFolder) {
    const [nextFolders, nextFiles] = await Promise.all([request<Folder[]>("/api/folders"), request<CloudFile[]>(`/api/files?folderId=${encodeURIComponent(folder)}`)]);
    setFolders(nextFolders); setFiles(nextFiles);
    if (!nextFolders.some((folder) => folder.id === uploadFolder)) setUploadFolder(nextFolders[0]?.id || "");
  }
  useEffect(() => { refresh().catch((e: Error) => setError(e.message)); }, []);
  async function chooseFolder(id: string) { setActiveFolder(id); setError(""); try { setFiles(await request<CloudFile[]>(`/api/files?folderId=${id}`)); } catch (e) { setError((e as Error).message); } }
  async function uploadFile(event: FormEvent) {
    event.preventDefault(); if (!selectedFile) return setError("Choose an academic document first.");
    setBusy(true); setError("");
    try { const form = new FormData(); form.append("file", selectedFile); form.append("folderId", uploadFolder); await request("/api/files", { method: "POST", body: form }); setSelectedFile(null); (document.getElementById("file-input") as HTMLInputElement).value = ""; setNotice("File uploaded securely to cloud storage."); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function createFolder(event: FormEvent) {
    event.preventDefault(); if (!folderName.trim()) return;
    try { const folder = await request<Folder>("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: folderName }) }); setFolderName(""); setUploadFolder(folder.id); setNotice("Folder created."); await refresh(); } catch (e) { setError((e as Error).message); }
  }
  async function downloadFile(file: CloudFile) { try { const result = await request<{ url: string }>(`/api/files/${file.id}/download`); window.open(result.url, "_blank", "noopener,noreferrer"); } catch (e) { setError((e as Error).message); } }
  async function createShare() {
    if (!shareFile) return; setBusy(true); setError("");
    try { const result = await request<{ link: string }>(`/api/files/${shareFile.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permission }) }); setShareLink(result.link); navigator.clipboard?.writeText(result.link); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function deleteFile(file: CloudFile) { if (!window.confirm(`Remove “${file.originalName}” from cloud storage?`)) return; try { await request(`/api/files/${file.id}`, { method: "DELETE" }); setNotice("File removed."); await refresh(); } catch (e) { setError((e as Error).message); } }
  return <main className="app-shell">
    <header><div className="brand"><span className="mark">CC</span><span>CollegeCloud</span></div><p>Centralized academic document storage</p></header>
    <section className="intro"><div><p className="eyebrow">CLOUD STORAGE · CASE STUDY 2</p><h1>One secure place for college documents.</h1><p>Upload, organize, download, and share academic files from any device.</p></div><div className="storage-note"><strong>Cloudflare R2</strong><span>Object storage</span><strong>Turso</strong><span>File metadata & access records</span></div></section>
    <div className="workspace">
      <aside><div className="side-title"><span>Folders</span><button className="text-button" onClick={() => document.getElementById("folder-name")?.focus()}>New</button></div><button className={`folder ${activeFolder === "all" ? "selected" : ""}`} onClick={() => chooseFolder("all")}>All files</button>{folders.map((folder) => <button key={folder.id} className={`folder ${activeFolder === folder.id ? "selected" : ""}`} onClick={() => chooseFolder(folder.id)}><span>{folder.name}</span><small>{folder.fileCount}</small></button>)}<form className="folder-form" onSubmit={createFolder}><input id="folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="New folder name" maxLength={60} /><button aria-label="Create folder">+</button></form></aside>
      <section className="content"><div className="content-heading"><div><p className="eyebrow">DOCUMENTS</p><h2>{activeName}</h2></div></div>
        <form className="upload-panel" onSubmit={uploadFile}><label className="file-picker" htmlFor="file-input"><span>{selectedFile ? selectedFile.name : "Choose document"}</span><small>PDF, DOCX, PPTX, image, etc. · max 25 MB</small></label><input id="file-input" type="file" onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null)} /><select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} aria-label="Upload folder">{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><button className="primary-button" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button></form>
        {(notice || error) && <div className={error ? "message error" : "message"}>{error || notice}<button onClick={() => { setNotice(""); setError(""); }}>×</button></div>}
        <div className="file-table"><div className="table-head"><span>Name</span><span>Folder</span><span>Added</span><span>Actions</span></div>{files.length === 0 ? <div className="empty"><strong>No documents here yet.</strong><span>Upload a sample academic file to begin.</span></div> : files.map((file) => <div className="file-row" key={file.id}><div className="file-name"><span className="file-icon">{file.originalName.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span><span><strong>{file.originalName}</strong><small>{formatBytes(file.sizeBytes)}{file.shareCount > 0 ? ` · ${file.shareCount} shared link${file.shareCount > 1 ? "s" : ""}` : ""}</small></span></div><span className="folder-label">{file.folderName}</span><span className="date">{formatDate(file.createdAt)}</span><div className="actions"><button onClick={() => downloadFile(file)}>Download</button><button onClick={() => { setShareFile(file); setShareLink(""); setPermission("viewer"); }}>Share</button><button className="danger" onClick={() => deleteFile(file)}>Delete</button></div></div>)}</div>
      </section>
    </div>
    {shareFile && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-label="Share document"><button className="close" onClick={() => setShareFile(null)}>×</button><p className="eyebrow">SHARE FILE</p><h2>{shareFile.originalName}</h2>{shareLink ? <><p className="muted">Secure link created and copied to your clipboard.</p><input className="share-link" value={shareLink} readOnly onFocus={(e) => e.currentTarget.select()} /><div className="modal-actions"><button className="primary-button" onClick={() => navigator.clipboard?.writeText(shareLink)}>Copy link</button><button onClick={() => setShareFile(null)}>Done</button></div></> : <><label className="permission-label">Link permission<select value={permission} onChange={(e) => setPermission(e.target.value)}><option value="viewer">Viewer — can download</option><option value="editor">Editor — collaboration permission</option></select></label><p className="hint">Links are saved in the access records. Downloads use a short-lived protected URL.</p><div className="modal-actions"><button className="primary-button" disabled={busy} onClick={createShare}>{busy ? "Creating…" : "Create share link"}</button><button onClick={() => setShareFile(null)}>Cancel</button></div></>}</section></div>}
  </main>;
}
