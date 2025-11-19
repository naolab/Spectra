export { };

declare global {
    interface Window {
        electron: {
            listWindows: () => Promise<any[]>;
            getSettings: () => Promise<any>;
            saveSettings: (settings: any) => Promise<boolean>;
        };
    }
}
