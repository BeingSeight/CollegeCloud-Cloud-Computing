---
title: "Case Study 2: Cloud Storage and File Management System"
subtitle: "CollegeCloud — Project Report"
author: "Semester 4 Cloud Computing"
---

# 1. Problem Statement

College students and faculty often exchange academic documents through pen drives, email attachments, and messaging applications. This causes duplicate files, version confusion, limited storage, accidental data loss, and difficulty accessing documents from different devices.

The proposed solution is **CollegeCloud**, a centralized cloud-based academic file-management system. It allows users to create folders, upload files, organize documents, download files, and create controlled sharing links.

# 2. Objectives

1. Provide centralized storage for academic documents.
2. Allow folders for Notes, Assignments, and Faculty Materials.
3. Support file upload, listing, download, deletion, and sharing.
4. Demonstrate object storage, access permissions, remote access, and cloud security.
5. Use only free-tier cloud services.
6. Avoid maintaining a physical college storage server.

# 3. Cloud Computing Concepts Used

## Cloud storage

Cloud storage means files are stored on provider-managed servers and accessed through the internet. It enables remote access from different devices and avoids dependency on one pen drive or computer.

## Local storage versus cloud storage

| Local storage | Cloud storage |
|---|---|
| Stored on a particular computer, hard disk, or pen drive | Stored on remote provider-managed infrastructure |
| Access is tied to the physical device | Accessible through the internet from authorized devices |
| Device loss can cause data loss | Centralized storage reduces dependence on one device |
| Sharing often creates duplicate copies | Sharing links and permissions control access to one central file |

## Object storage

Object storage keeps each uploaded document as an object with a unique object key and metadata. It is suitable for PDFs, DOCX files, PPTX files, images, and similar academic files.

## Synchronization and collaboration

Central storage gives users access to the same organized document collection. Sharing links with Viewer or Editor permission records support controlled collaboration.

# 4. Service Model and Deployment Model

The project uses the **Public Cloud** deployment model because Cloudflare, Turso, and Vercel are public cloud providers.

The solution combines managed cloud services:

- **Cloudflare R2:** object storage service for real uploaded documents.
- **Turso:** managed cloud SQL database for folders, file metadata, and sharing records.
- **Vercel:** managed deployment platform for the React frontend and serverless backend API.

Google Drive is a SaaS example suggested by the case study. CollegeCloud implements the same practical concepts as a custom cloud application using R2 and Turso.

# 5. Proposed Architecture

```text
User browser / React interface
            │
            │ HTTPS request
            ▼
Vercel serverless API (Node.js + Express)
      ┌─────┴─────┐
      ▼           ▼
Cloudflare R2    Turso Database
actual files     folders, metadata, sharing records
```

## Component responsibilities

| Component | Responsibility |
|---|---|
| React frontend | Shows folders/files and provides upload, download, delete, and share actions. |
| Node.js/Express API | Validates requests and safely communicates with cloud services. |
| Cloudflare R2 | Stores actual document objects in a private bucket. |
| Turso database | Stores folder names, object metadata, and Viewer/Editor share records. |
| Vercel | Deploys the frontend and serverless API on the internet. |

# 6. Practical Implementation Performed

1. Created a private Cloudflare R2 bucket for document objects.
2. Created a Turso database for structured records.
3. Created the folders **Notes**, **Assignments**, and **Faculty Materials**.
4. Built a React interface named CollegeCloud.
5. Added file upload, folder selection, listing, download, sharing, and deletion functions.
6. On upload, the API stores the document in R2 and saves its name, size, type, folder, and date in Turso.
7. On download, the API creates a time-limited signed URL for the private R2 object.
8. On share, the API saves a Viewer or Editor sharing record and generates a protected sharing link.
9. Deployed the application on Vercel.

Live application: `https://collegecloud-cloud-computing.vercel.app`

# 7. File Management Workflow

```text
Choose file + select folder
        ↓
API receives file
        ↓
R2 stores actual file object
        ↓
Turso stores metadata record
        ↓
React refreshes the file list
```

For download:

```text
User clicks Download → API verifies metadata → API creates short-lived signed URL → Browser downloads from private R2 object
```

# 8. Security and Privacy

- The R2 bucket is private; uploaded files are not openly public.
- Cloudflare and Turso secret values remain in backend environment variables, not in frontend code.
- The browser never receives R2 access keys.
- Downloads use short-lived signed URLs, reducing risk if a link is copied.
- Viewer and Editor permissions are recorded with sharing links.
- The principle of least privilege is followed: credentials are restricted to the required bucket and operations.

# 9. Scalability, Availability, Backup, and Disaster Recovery

**Scalability:** Managed object storage can grow without manually buying or installing college hard disks and servers.

**Availability:** The deployed application can be reached through the internet from authorized devices.

**Resource management:** R2 stores binary file objects efficiently, while Turso stores only lightweight structured metadata.

**Backup:** Important data should be exported or copied on a planned schedule. Cloud storage reduces dependence on one device but does not remove the need for backup policy.

**Disaster recovery:** Central files and metadata can be restored from backups after accidental deletion, account issues, or serious failure.

# 10. Observation and Limitation

The complete upload → list → signed download → delete workflow was verified against the real R2 bucket and Turso database.

Vercel free serverless functions have a 4.5 MB request-body limit. Therefore CollegeCloud limits uploads to **4 MB**, which is suitable for sample academic documents used in this case study.

# 11. Conclusion

CollegeCloud demonstrates how cloud computing enables centralized academic document management. By combining a React interface, Vercel serverless API, Cloudflare R2 object storage, and Turso database, the project supports organized file storage, remote access, secure downloads, and controlled sharing without maintaining a physical storage server.

# 12. Suggested Screenshots for Submission

1. CollegeCloud homepage with default folders.
2. Upload panel with a selected sample document.
3. Uploaded document shown in its folder.
4. Share dialog showing Viewer and Editor selection.
5. Generated sharing link opened in another browser/incognito window.
6. Cloudflare R2 dashboard showing the stored object.
7. Turso dashboard showing folder/file/share records.
8. Vercel dashboard or live deployment URL.
