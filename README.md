# CollegeCloud

CollegeCloud is a focused cloud storage and file-management system for academic documents. It demonstrates the Cloud Storage and File Management System case study with real object storage and a managed cloud database.

## Included case-study functions

- Create document folders.
- Upload academic documents to private Cloudflare R2 object storage.
- List and organize files by folder.
- Download files through a time-limited signed URL.
- Generate viewer or editor sharing links.
- Record folders, metadata, and sharing permissions in Turso.
- Access the system from any internet-connected device after deployment.

## Architecture

```text
React user interface
        ↓ HTTPS
Node.js / Express API
        ├── Cloudflare R2: actual PDF, DOCX, PPTX, and image objects
        └── Turso: folders, file metadata, access permission and sharing-link records
```

R2 is private. The backend creates short-lived download URLs, so bucket credentials never reach the browser.

## Run locally

1. Keep the supplied `.env` file in this folder.
2. Install dependencies: `npm install`
3. Initialise the database: `npm run db:init`
4. Start both apps: `npm run dev`
5. Open `http://localhost:5173`

The API runs at `http://localhost:8788`.

## Deployment

Deploy it as one Node web service. In production, Express serves the built React interface and the API from the same domain.

### API environment variables

Set these values in the API host (for example Render):

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
CLOUDFLARE_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
PUBLIC_APP_URL=https://your-frontend-domain
```

Build command: `npm run build`  
Start command: `npm start`

Use the included `render.yaml` blueprint. Its required values are listed in the Render Environment section; the frontend needs no API URL because it calls the same deployed domain.

## Practical screenshots to take for the report

1. Empty CollegeCloud folder view.
2. Folder creation: Notes, Assignments, Faculty Materials.
3. Uploading a sample PDF/DOCX.
4. Listed uploaded document with its folder and upload date.
5. Sharing dialog with Viewer and Editor options.
6. Generated protected sharing link opened in another browser/incognito window.
7. Cloudflare R2 dashboard showing the stored object.
8. Turso dashboard showing the `folders`, `files`, and `shares` records.

## Security and cloud concepts demonstrated

- **Object storage:** R2 stores each file as an object using a unique object key.
- **Access permissions:** sharing records store Viewer or Editor permission; files remain in a private bucket.
- **Privacy:** R2 credentials are server-only and downloads use temporary signed URLs.
- **Availability:** managed cloud services provide remote access without a college-owned storage server.
- **Scalability:** object storage can grow without manually adding local hard disks.
- **Backup/disaster recovery:** the logical file record is separated from the object; important production data should additionally use scheduled export/backup policies.
