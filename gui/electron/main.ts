import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

// Path to Swift binary
// In dev: ../capture/mac/.build/debug/mac (relative to gui root)
// In prod: resources/mac (or similar)
const isDev = process.env.NODE_ENV === 'development';
const PROJECT_ROOT = path.resolve(__dirname, '../..'); // gui/dist-electron -> gui -> Spectra

const SWIFT_BINARY_PATH = isDev
    ? path.resolve(PROJECT_ROOT, 'capture/mac/.build/debug/mac')
    : path.join(process.resourcesPath, 'mac'); // TODO: Verify prod path

const SETTINGS_PATH = path.resolve(PROJECT_ROOT, 'settings.json');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers
ipcMain.handle('list-windows', async () => {
    try {
        const { stdout } = await execFileAsync(SWIFT_BINARY_PATH, ['list_windows'], { maxBuffer: 50 * 1024 * 1024 });
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Failed to list windows:', error);
        return [];
    }
});

ipcMain.handle('list-displays', async () => {
    try {
        const { stdout } = await execFileAsync(SWIFT_BINARY_PATH, ['list_displays'], { maxBuffer: 50 * 1024 * 1024 });
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Failed to list displays:', error);
        return [];
    }
});

ipcMain.handle('get-settings', async () => {
    try {
        const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { target: { type: 'screen' } };
    }
});

ipcMain.handle('save-settings', async (event, settings) => {
    try {
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
});
