# Job Search Manager — Backup and Recovery

## Purpose

This document explains how to back up and recover Job Search Manager data.

A complete backup contains:

- `database.sql` — D1 database data and schema
- `r2/` — uploaded Job Search Manager files referenced by D1
- `manifest.json` — details identifying the backup source and contents

Keep all three together as one backup set.

---

## Backup Environments

Job Search Manager supports two explicit backup modes.

### Development Backup

Run from the project folder:

`backup-resume-manager.cmd dev`

This backs up:

- Local development D1 database
- Local `resume-manager-dev` R2 bucket

The backup folder is named:

`backups\resume-manager-dev-YYYY-MM-DD_HH-MM-SS`

### Production Backup

Run from the project folder:

`backup-resume-manager.cmd prod`

This backs up:

- Remote production D1 database: `resume-manager-prod`
- Remote production R2 bucket: `resume-manager-prod`

The backup folder is named:

`backups\resume-manager-prod-YYYY-MM-DD_HH-MM-SS`

Production backup performs export/read/download operations only. It does not restore, delete, or modify production data.

---

## Backup Safety

A backup environment must always be explicitly specified.

Running:

`backup-resume-manager.cmd`

without `dev` or `prod` will refuse to perform a backup.

This is intentional and prevents accidental confusion between development and production.

Do not consider a backup valid if the script reports:

`BACKUP FAILED / INCOMPLETE`

A successful backup must report:

`BACKUP COMPLETED SUCCESSFULLY`

---

## Wrangler Requirement

Production D1 export was successfully validated using:

`Wrangler 4.113.0`

Wrangler 4.112.0 produced an authentication error when performing the remote D1 export even though normal remote D1 queries succeeded.

Use Wrangler 4.113.0 or a subsequently validated version for production backups.

---

## Verifying a Backup

After an important production backup, inspect:

`manifest.json`

Confirm that it contains:

- `"source": "production"`
- `"mode": "prod"`
- D1 database: `resume-manager-prod`
- D1 location: `remote`
- R2 bucket: `resume-manager-prod`
- R2 location: `remote`

Also confirm:

- `database.sql` exists and is not empty
- `r2/` contains the expected referenced files
- R2 object counts and file sizes are recorded in the manifest

---

## Protecting Against PC or Disk Failure

The `backups` folder is stored on the local PC.

After creating an important backup, copy the entire latest dated backup folder to an independent location such as:

- OneDrive
- Google Drive
- External storage

Do not copy only `database.sql`.

The database, R2 files, and `manifest.json` must be kept together as one backup set.

---

## Recovery — Important

Do not restore over an existing working Job Search Manager production database unless recovery is genuinely required.

Before restoring:

1. Preserve the current production data if it is still accessible.
2. Identify the correct dated backup folder.
3. Verify whether the backup is DEV or PROD using `manifest.json`.
4. Confirm that the backup contains:
   - `database.sql`
   - `manifest.json`
   - the `r2` folder
5. Confirm the intended restore target.
6. Test recovery into isolated storage first whenever possible.

Never assume that a backup folder is production based only on its date.

Always verify `manifest.json`.

---

## Development D1 Recovery

The tested local D1 recovery method uses Wrangler to execute the saved SQL backup.

Example:

`npx wrangler d1 execute DB --env dev --local --file "<backup-folder>\database.sql"`

WARNING:

This command must only be used when the intended restore target has been confirmed.

---

## Production D1 Recovery

Production restore is intentionally not automated by the normal backup script.

Do not run a restore directly against `resume-manager-prod` merely to test a backup.

Production recovery should first be tested against an isolated temporary/test D1 database.

Only after the backup has been validated and the recovery target has been explicitly confirmed should a production restore procedure be executed.

---

## R2 File Recovery

R2 files are stored in the backup under:

`<backup-folder>\r2\`

The directory structure preserves each original R2 object key.

The D1 database stores the corresponding object key in:

`resume_versions.r2_object_key`

To recover a file, it must be uploaded back to the correct R2 bucket using exactly the same object key.

Do not rename or flatten the backed-up R2 directory structure.

For bulk recovery, use a tested recovery script or restore procedure rather than manually reconstructing object keys.

---

## Verified Development Backup and Recovery Test — July 21, 2026

The development backup process was successfully tested with:

- Complete local D1 SQL export
- D1 restore into isolated local storage
- Restored data verification
- Automatic discovery of R2 object keys from D1
- Successful backup of the referenced R2 PDF
- Successful execution through `backup-resume-manager.cmd`

The tested D1 recovery copy contained:

- 2 users
- 2 opportunities
- 1 outreach log

The tested backup automatically included 1 R2 file.

---

## Verified Production Backup Test — July 22, 2026

The production backup process was successfully tested against the live production environment.

Verified:

- Remote D1 database: `resume-manager-prod`
- Remote R2 bucket: `resume-manager-prod`
- Complete production D1 SQL export
- Automatic discovery of R2 object keys from production D1
- Successful download of the referenced production R2 file
- Production-specific dated backup folder
- Production `manifest.json`
- Explicit `prod` mode and remote-source identification

The verified production backup contained:

- D1 SQL backup: 25,537 bytes
- R2 objects: 1
- Backed-up R2 PDF: 76,117 bytes

A restore into the live production environment was intentionally not performed.

---

## Emergency Rule

If data loss occurs and the correct restore procedure is uncertain:

**Do not delete, reset, migrate, or overwrite the existing D1 database or R2 storage.**

Preserve both:

- the latest valid backup
- whatever existing application data remains accessible

Recovery should then be performed carefully, preferably against isolated storage first.