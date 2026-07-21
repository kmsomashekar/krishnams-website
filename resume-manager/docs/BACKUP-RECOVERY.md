\# Resume Manager — Backup and Recovery



\## Purpose



This document explains how to back up and recover Resume Manager data.



A complete backup contains:



\- `database.sql` — D1 database data and schema

\- `r2/` — uploaded Resume Manager files

\- `manifest.json` — details of the backup set



Keep all three together.



\---



\## Creating a Backup



From the Resume Manager project folder, double-click:



`backup-resume-manager.cmd`



Or run:



`backup-resume-manager.cmd`



A successful backup displays:



`BACKUP COMPLETED SUCCESSFULLY`



A dated backup folder is created under:



`backups\\resume-manager-YYYY-MM-DD\_HH-MM-SS`



Do not consider a backup valid if the script reports:



`BACKUP FAILED / INCOMPLETE`



\---



\## Protecting Against PC or Disk Failure



The `backups` folder is on the local PC.



After creating an important backup, copy the entire latest dated backup folder to an independent location such as:



\- OneDrive

\- Google Drive

\- External storage



Do not copy only `database.sql`.



The database and R2 files should be kept together as one backup set.



\---



\## Recovery — Important



Do not restore over an existing working Resume Manager database unless recovery is genuinely required.



Before restoring:



1\. Stop the Resume Manager application.

2\. Preserve the current data if it is still accessible.

3\. Identify the correct dated backup folder.

4\. Confirm that it contains:

&#x20;  - `database.sql`

&#x20;  - `manifest.json`

&#x20;  - the `r2` folder



If possible, test recovery into isolated storage first.



\---



\## D1 Database Recovery



The tested local D1 recovery method uses Wrangler to execute the saved SQL backup.



Example:



`npx wrangler d1 execute DB --env dev --local --file "<backup-folder>\\database.sql"`



WARNING:



This command must only be used when the intended restore target has been confirmed.



For a production/remote D1 database, do not use the local command above. Confirm the correct Cloudflare environment and recovery procedure first.



\---



\## R2 File Recovery



R2 files are stored in the backup under:



`<backup-folder>\\r2\\`



The directory structure preserves each original R2 object key.



The D1 database stores the corresponding object key in:



`resume\_versions.r2\_object\_key`



To recover a file, upload it back to R2 using exactly the same object key.



Do not rename or flatten the backed-up R2 directory structure.



For bulk recovery, use a tested recovery script or restore procedure rather than manually reconstructing object keys.



\---



\## Verified Backup Test — July 21, 2026



The Phase 1 backup process was tested successfully with:



\- Complete local D1 SQL export

\- D1 restore into isolated local storage

\- Restored data verification

\- Automatic discovery of R2 object keys from D1

\- Successful backup of the referenced R2 PDF

\- Successful execution through `backup-resume-manager.cmd`



The tested D1 recovery copy contained:



\- 2 users

\- 2 opportunities

\- 1 outreach log



The tested backup automatically included 1 R2 file.



\---



\## Emergency Rule



If data loss occurs and you are uncertain about the restore procedure:



\*\*Do not delete, reset, migrate, or overwrite the existing D1 database or R2 storage.\*\*



Preserve the latest backup and the existing application data first, then perform recovery carefully.

