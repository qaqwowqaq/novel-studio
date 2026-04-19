import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron';
import electronUpdaterPkg from 'electron-updater';
import electronLog from 'electron-log';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { autoUpdater } = electronUpdaterPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.commandLine.appendSwitch('disk-cache-dir', path.join(app.getPath('userData'), 'chromium-cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function getStoragePath() {
  return path.join(app.getPath('userData'), 'novel-studio-data.json');
}

function getSecretsPath() {
  return path.join(app.getPath('userData'), 'secrets.json');
}

async function loadSecretsFile() {
  try {
    const raw = await readFile(getSecretsPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSecretsFile(map) {
  await mkdir(path.dirname(getSecretsPath()), { recursive: true });
  await writeFile(getSecretsPath(), JSON.stringify(map, null, 2), 'utf8');
}

async function setSecret(key, value) {
  const map = await loadSecretsFile();
  if (safeStorage.isEncryptionAvailable()) {
    const buf = safeStorage.encryptString(value);
    map[key] = { v: 1, enc: true, data: buf.toString('base64') };
  } else {
    map[key] = { v: 1, enc: false, data: Buffer.from(value, 'utf8').toString('base64') };
  }
  await saveSecretsFile(map);
  return true;
}

async function getSecret(key) {
  const map = await loadSecretsFile();
  const entry = map[key];
  if (!entry) return null;
  try {
    const buf = Buffer.from(entry.data, 'base64');
    if (entry.enc && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buf);
    }
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

async function deleteSecret(key) {
  const map = await loadSecretsFile();
  if (!(key in map)) return false;
  delete map[key];
  await saveSecretsFile(map);
  return true;
}

async function hasSecret(key) {
  const map = await loadSecretsFile();
  return Boolean(map[key]);
}

function getAiWorkspacePath() {
  return path.join(app.getPath('userData'), 'codex-writing-workspace');
}

async function ensureStorageDir() {
  await mkdir(path.dirname(getStoragePath()), { recursive: true });
}

async function ensureAiWorkspaceDir() {
  await mkdir(getAiWorkspacePath(), { recursive: true });
}

async function loadDataFile() {
  await ensureStorageDir();
  try {
    const raw = await readFile(getStoragePath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveDataFile(payload) {
  await ensureStorageDir();
  await writeFile(getStoragePath(), JSON.stringify(payload, null, 2), 'utf8');
  return { savedAt: new Date().toISOString() };
}

function getCodexCommand() {
  return 'codex';
}

function quoteWindowsArg(arg) {
  if (arg.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`;
}

function runProcess(command, args, options = {}) {
  const {
    cwd = app.getPath('userData'),
    input = '',
    timeoutMs = 180000,
    captureStdout = true,
    onChildStarted,
  } = options;

  return new Promise((resolve, reject) => {
    const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : command;
    const spawnArgs = process.platform === 'win32'
      ? ['/d', '/s', '/c', `${[command, ...args].map(quoteWindowsArg).join(' ')}`]
      : args;

    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      env: process.env,
      windowsHide: true,
      stdio: ['pipe', captureStdout ? 'pipe' : 'ignore', 'pipe'],
    });

    if (onChildStarted) {
      try { onChildStarted(child); } catch { /* ignore */ }
    }

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      reject(new Error('Codex 调用超时，请稍后再试。'));
    }, timeoutMs);

    child.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    if (captureStdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error((stderr || stdout || `exit ${code}`).trim()));
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function getCodexStatus() {
  try {
    const { stdout } = await runProcess(getCodexCommand(), ['--version'], { timeoutMs: 15000 });
    return {
      available: true,
      version: stdout.trim() || 'codex-cli',
    };
  } catch (error) {
    return {
      available: false,
      version: '',
      detail: error instanceof Error ? error.message : 'Codex CLI 不可用',
    };
  }
}

const activeCodexRuns = new Map();

async function runCodexPrompt(prompt, requestId) {
  await ensureAiWorkspaceDir();

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'novel-studio-codex-'));
  const outputPath = path.join(tempDir, 'last-message.txt');
  const runId = requestId || `codex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await runProcess(
      getCodexCommand(),
      [
        'exec',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--color',
        'never',
        '-C',
        getAiWorkspacePath(),
        '--output-last-message',
        outputPath,
        '-',
      ],
      {
        input: prompt,
        captureStdout: false,
        timeoutMs: 600000,
        onChildStarted: (child) => activeCodexRuns.set(runId, child),
      },
    );

    const content = (await readFile(outputPath, 'utf8')).trim();
    if (!content) {
      throw new Error('Codex 没有返回内容。');
    }

    const status = await getCodexStatus();

    return {
      content,
      version: status.version || 'codex-cli',
      requestId: runId,
    };
  } finally {
    activeCodexRuns.delete(runId);
    await rm(tempDir, { recursive: true, force: true });
  }
}

function cancelCodexRun(requestId) {
  if (!requestId) {
    let cancelled = 0;
    for (const child of activeCodexRuns.values()) {
      try { child.kill(); cancelled++; } catch { /* ignore */ }
    }
    activeCodexRuns.clear();
    return cancelled > 0;
  }
  const child = activeCodexRuns.get(requestId);
  if (!child) return false;
  try { child.kill(); } catch { /* ignore */ }
  activeCodexRuns.delete(requestId);
  return true;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    frame: false,
    title: '卷灯',
    backgroundColor: '#f8f3eb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    void mainWindow.loadURL(devServer);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const hasBridge = await mainWindow.webContents.executeJavaScript('Boolean(window.novelStudio)');
      console.log('[novel-studio] desktop bridge:', hasBridge);
    } catch (error) {
      console.error('[novel-studio] desktop bridge check failed:', error);
    }

    // Quietly probe for updates a few seconds after launch so the renderer is ready.
    setTimeout(() => { void checkForUpdates({ silent: true }); }, 4000);
  });
}

Menu.setApplicationMenu(null);

// --- Auto update (GitHub Releases via electron-updater) -----------------------
electronLog.transports.file.level = 'info';
autoUpdater.logger = electronLog;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let updateState = {
  status: 'idle',
  version: '',
  message: '',
  progressPercent: 0,
  downloaded: false,
};

function broadcastUpdateState() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:state', updateState);
  }
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  broadcastUpdateState();
}

autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking', message: '检查更新中…' }));
autoUpdater.on('update-available', (info) => setUpdateState({ status: 'available', version: info?.version ?? '', message: '发现新版本,后台下载中…' }));
autoUpdater.on('update-not-available', () => setUpdateState({ status: 'idle', message: '已是最新版本' }));
autoUpdater.on('error', (err) => setUpdateState({ status: 'error', message: err?.message ?? '更新失败' }));
autoUpdater.on('download-progress', (p) => setUpdateState({ status: 'downloading', progressPercent: Math.round(p?.percent ?? 0) }));
autoUpdater.on('update-downloaded', (info) => {
  setUpdateState({ status: 'downloaded', version: info?.version ?? updateState.version, downloaded: true, message: '下载完成,重启即可应用更新' });
});

async function checkForUpdates({ silent } = { silent: true }) {
  if (!app.isPackaged) {
    setUpdateState({ status: 'idle', message: '开发模式不检查更新' });
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    if (!silent) {
      dialog.showErrorBox('检查更新失败', err?.message ?? String(err));
    }
  }
}

async function quitAndInstallUpdate() {
  if (!updateState.downloaded) return false;
  setImmediate(() => autoUpdater.quitAndInstall());
  return true;
}

ipcMain.handle('updater:check', async () => { await checkForUpdates({ silent: false }); return updateState; });
ipcMain.handle('updater:state', async () => updateState);
ipcMain.handle('updater:install', async () => quitAndInstallUpdate());
ipcMain.handle('app:openReleases', async () => shell.openExternal('https://github.com/qaqwowqaq/novel-studio/releases'));

ipcMain.handle('storage:load', async () => loadDataFile());
ipcMain.handle('storage:save', async (_, payload) => saveDataFile(payload));
ipcMain.handle('codex:status', async () => getCodexStatus());
ipcMain.handle('codex:run', async (_, payload) => runCodexPrompt(payload.prompt, payload.requestId));
ipcMain.handle('codex:cancel', async (_, payload) => cancelCodexRun(payload?.requestId));
ipcMain.handle('secret:set', async (_, { key, value }) => setSecret(key, value));
ipcMain.handle('secret:get', async (_, { key }) => getSecret(key));
ipcMain.handle('secret:delete', async (_, { key }) => deleteSecret(key));
ipcMain.handle('secret:has', async (_, { key }) => hasSecret(key));

ipcMain.handle('window:minimize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return false;
  }

  win.minimize();
  return true;
});

ipcMain.handle('window:maximize', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return false;
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }

  return true;
});

ipcMain.handle('window:close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return false;
  }

  // This app currently has no shutdown confirmation or cleanup gate,
  // so destroy the single window immediately instead of waiting for a
  // graceful renderer close cycle.
  win.destroy();
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
