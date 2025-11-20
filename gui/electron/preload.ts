import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    listWindows: () => ipcRenderer.invoke('list-windows'),
    listDisplays: () => ipcRenderer.invoke('list-displays'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
});
