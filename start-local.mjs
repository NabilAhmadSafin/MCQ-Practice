import { spawn, spawnSync, exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const APP_URL = 'http://localhost:3000';
const rootDir = process.cwd();
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const isSilent = process.argv.includes('--silent');

function openBrowser(url) {
  const cmd =
    process.platform === 'win32'
      ? `cmd /c start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, err => {
    if (err && !isSilent) {
      console.log(`Please open your browser manually to: ${url}`);
    }
  });
}

async function isServerRunning() {
  try {
    const res = await fetch(`${APP_URL}/api/db/status`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitAndOpenBrowser() {
  for (let i = 0; i < 120; i++) {
    if (await isServerRunning()) {
      if (!isSilent) {
        console.log(`Server is ready! Opening ${APP_URL} in your browser...`);
      }
      openBrowser(APP_URL);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  openBrowser(APP_URL);
}

async function main() {
  if (await isServerRunning()) {
    if (!isSilent) {
      console.log(`Server is already running. Opening ${APP_URL}...`);
    }
    openBrowser(APP_URL);
    return;
  }

  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    console.log('First-time setup: Installing dependencies (npm install)...');
    const install = spawnSync(npmCmd, ['install'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    if (install.status !== 0) {
      console.error('npm install failed. Please check your internet connection and Node.js installation.');
      process.exit(install.status ?? 1);
    }
  }

  console.log('Starting Fast MCQ Practice local server...');
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  waitAndOpenBrowser();

  child.on('exit', code => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
