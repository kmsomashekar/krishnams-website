const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const BACKUPS_ROOT = path.join(PROJECT_ROOT, 'backups');

const mode = (process.argv[2] || '').toLowerCase();

const CONFIG = {
  dev: {
    source: 'local-development',
    environment: 'dev',
    database: 'DB',
    bucket: 'resume-manager-dev',
    locationFlag: '--local',
    folderPrefix: 'resume-manager-dev'
  },
  prod: {
    source: 'production',
    environment: 'prod',
    database: 'resume-manager-prod',
    bucket: 'resume-manager-prod',
    locationFlag: '--remote',
    folderPrefix: 'resume-manager-prod'
  }
};

if (!CONFIG[mode]) {
  console.error('');
  console.error('Invalid or missing backup mode.');
  console.error('');
  console.error('Usage:');
  console.error('  node backup-resume-manager.js dev');
  console.error('  node backup-resume-manager.js prod');
  console.error('');
  process.exit(1);
}

const config = CONFIG[mode];

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
    `${config.folderPrefix}-${timestamp()}`
  );

  const databaseFile = path.join(backupFolder, 'database.sql');
  const r2Folder = path.join(backupFolder, 'r2');
  const manifestFile = path.join(backupFolder, 'manifest.json');

  fs.mkdirSync(r2Folder, { recursive: true });

  console.log('');
  console.log('Job Search Manager Backup');
  console.log('=========================');
  console.log(`Mode:          ${mode.toUpperCase()}`);
  console.log(`Source:        ${config.source}`);
  console.log(`D1 database:   ${config.database}`);
  console.log(`R2 bucket:     ${config.bucket}`);
  console.log(`Backup folder: ${backupFolder}`);
  console.log('');

  if (mode === 'prod') {
    console.log('PRODUCTION BACKUP - READ-ONLY EXPORT/DOWNLOAD');
    console.log('No restore, delete, or write operation will be performed.');
    console.log('');
  }

  console.log(`1. Exporting ${config.source} D1 database...`);

  runWrangler([
    'd1',
    'export',
    config.database,
    '--env',
    config.environment,
    config.locationFlag,
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
    config.database,
    '--env',
    config.environment,
    config.locationFlag,
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
      `${config.bucket}/${objectKey}`,
      '--env',
      config.environment,
      config.locationFlag,
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
    backup_version: 2,
    created_at: new Date().toISOString(),
    source: config.source,
    mode,
    d1: {
      database: config.database,
      environment: config.environment,
      location: config.locationFlag === '--remote' ? 'remote' : 'local',
      file: 'database.sql',
      size_bytes: databaseSize
    },
    r2: {
      bucket: config.bucket,
      location: config.locationFlag === '--remote' ? 'remote' : 'local',
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
  console.log(`Mode:        ${mode.toUpperCase()}`);
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