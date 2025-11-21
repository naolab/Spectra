import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);

// Helper to run capture command
const runCaptureCommand = async (command: string, args: string[] = [], timeout: number = 30000): Promise<string> => {
    const { stdout } = await execFileAsync(SWIFT_BINARY_PATH, [command, ...args], {
        maxBuffer: 50 * 1024 * 1024,
        timeout: timeout
    });
    return stdout;
};

// Path to Swift binary
// In dev: ../capture/mac/.build/debug/mac (relative to gui root)
// In prod: resources/mac (or similar)
const isDev = process.env.NODE_ENV === 'development';
const PROJECT_ROOT = path.resolve(__dirname, '../..'); // gui/dist-electron -> gui -> Spectra

const SWIFT_BINARY_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'mac') // TODO: Verify prod path
    : path.join(__dirname, '../../capture/mac/.build/release/mac');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

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
        const stdout = await runCaptureCommand('list_windows');
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Failed to list windows:', error);
        return [];
    }
});

ipcMain.handle('list-displays', async () => {
    try {
        const stdout = await runCaptureCommand('list_displays');
        return JSON.parse(stdout);
    } catch (error) {
        console.error('Failed to list displays:', error);
        return [];
    }
});

ipcMain.handle('get-window-thumbnail', async (_event, windowId: number) => {
    try {
        const startTime = Date.now();
        console.log(`[IPC] Requesting thumbnail for window ${windowId}`);

        const cmdStart = Date.now();
        const stdout = await runCaptureCommand('get_window_thumbnail', [windowId.toString()], 200); // 200ms timeout
        const cmdDuration = Date.now() - cmdStart;

        const parseStart = Date.now();
        const result = JSON.parse(stdout);
        const parseDuration = Date.now() - parseStart;

        const totalDuration = Date.now() - startTime;
        console.log(`[IPC] Got thumbnail for window ${windowId}, length: ${result.thumbnail?.length}, cmd: ${cmdDuration}ms, parse: ${parseDuration}ms, total: ${totalDuration}ms`);
        return result;
    } catch (error) {
        console.error(`Failed to get thumbnail for window ${windowId}:`, error);
        return { id: windowId, thumbnail: '' };
    }
});

ipcMain.handle('get-display-thumbnail', async (_event, displayId: number) => {
    try {
        const stdout = await runCaptureCommand('get_display_thumbnail', [displayId.toString()]);
        return JSON.parse(stdout);
    } catch (error) {
        console.error(`Failed to get thumbnail for display ${displayId}:`, error);
        return { id: displayId, thumbnail: '' };
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
        await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
});
