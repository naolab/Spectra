import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    listWindows: () => ipcRenderer.invoke('list-windows'),
    listDisplays: () => ipcRenderer.invoke('list-displays'),
    getWindowThumbnail: (windowId: number) => ipcRenderer.invoke('get-window-thumbnail', windowId),
    getDisplayThumbnail: (displayId: number) => ipcRenderer.invoke('get-display-thumbnail', displayId),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
});
