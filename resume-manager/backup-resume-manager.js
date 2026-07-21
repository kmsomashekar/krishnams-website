const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const BACKUPS_ROOT = path.join(PROJECT_ROOT, 'backups');
const BUCKET_NAME = 'resume-manager-dev';

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function runWrangler(args, captureOutput = false) {
  const result = spawnSync(
    'cmd.exe',
    ['/d', '/s', '/c', 'npx.cmd', 'wrangler', ...args],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const details = captureOutput
      ? `${result.stdout || ''}\n${result.stderr || ''}`.trim()
      : '';

    throw new Error(
      `Wrangler command failed with exit code ${result.status}` +
      (details ? `:\n${details}` : '')
    );
  }

  return captureOutput ? result.stdout : '';
}

function main() {
  const backupFolder = path.join(
    BACKUPS_ROOT,
    `resume-manager-${timestamp()}`
  );

  const databaseFile = path.join(backupFolder, 'database.sql');
  const r2Folder = path.join(backupFolder, 'r2');
  const manifestFile = path.join(backupFolder, 'manifest.json');

  fs.mkdirSync(r2Folder, { recursive: true });

  console.log('');
  console.log('Resume Manager Backup');
  console.log('=====================');
  console.log(`Backup folder: ${backupFolder}`);
  console.log('');

  console.log('1. Exporting local D1 database...');

  runWrangler([
    'd1',
    'export',
    'DB',
    '--env',
    'dev',
    '--local',
    '--output',
    databaseFile,
    '--skip-confirmation'
  ]);

  if (!fs.existsSync(databaseFile)) {
    throw new Error('D1 backup file was not created.');
  }

  const databaseSize = fs.statSync(databaseFile).size;

  if (databaseSize === 0) {
    throw new Error('D1 backup file is empty.');
  }

  console.log('');
  console.log('2. Discovering R2 files referenced by D1...');

  const queryOutput = runWrangler([
    'd1',
    'execute',
    'DB',
    '--env',
    'dev',
    '--local',
    '--json',
    '--command',
    "SELECT r2_object_key FROM resume_versions WHERE r2_object_key IS NOT NULL AND r2_object_key <> '';"
  ], true);

  const parsed = JSON.parse(queryOutput);

  if (
    !Array.isArray(parsed) ||
    !parsed[0] ||
    parsed[0].success !== true ||
    !Array.isArray(parsed[0].results)
  ) {
    throw new Error('Could not read R2 object keys from D1.');
  }

  const objectKeys = [
    ...new Set(
      parsed[0].results
        .map((row) => row.r2_object_key)
        .filter(Boolean)
    )
  ];

  console.log(`Found ${objectKeys.length} R2 file(s).`);
  console.log('');
  console.log('3. Backing up R2 files...');

  const backedUpObjects = [];

  for (const objectKey of objectKeys) {
    const safeParts = objectKey
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..');

    const destination = path.join(r2Folder, ...safeParts);

    fs.mkdirSync(path.dirname(destination), { recursive: true });

    console.log(`   ${objectKey}`);

    runWrangler([
      'r2',
      'object',
      'get',
      `${BUCKET_NAME}/${objectKey}`,
      '--env',
      'dev',
      '--local',
      '--file',
      destination
    ]);

    if (!fs.existsSync(destination)) {
      throw new Error(`R2 file was not backed up: ${objectKey}`);
    }

    const fileSize = fs.statSync(destination).size;

    if (fileSize === 0) {
      throw new Error(`R2 backup produced an empty file: ${objectKey}`);
    }

    backedUpObjects.push({
      object_key: objectKey,
      relative_backup_path: path.relative(backupFolder, destination),
      size_bytes: fileSize
    });
  }

  const manifest = {
    backup_version: 1,
    created_at: new Date().toISOString(),
    source: 'local-development',
    d1: {
      binding: 'DB',
      environment: 'dev',
      file: 'database.sql',
      size_bytes: databaseSize
    },
    r2: {
      bucket: BUCKET_NAME,
      object_count: backedUpObjects.length,
      objects: backedUpObjects
    }
  };

  fs.writeFileSync(
    manifestFile,
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  console.log('');
  console.log('BACKUP COMPLETED SUCCESSFULLY');
  console.log('=============================');
  console.log(`D1 database: ${databaseSize} bytes`);
  console.log(`R2 files:    ${backedUpObjects.length}`);
  console.log(`Location:    ${backupFolder}`);
  console.log('');
  console.log('IMPORTANT: Copy this dated backup folder to OneDrive,');
  console.log('Google Drive, or another location outside this PC.');
}

try {
  main();
} catch (error) {
  console.error('');
  console.error('BACKUP FAILED / INCOMPLETE');
  console.error('==========================');
  console.error(error.message);
  console.error('');
  process.exitCode = 1;
}