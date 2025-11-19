import { useState, useEffect } from 'react';
import './App.css';

interface WindowInfo {
  id: number;
  name: string;
  ownerName: string;
  bounds: {
    X: number;
    Y: number;
    Width: number;
    Height: number;
  };
}

interface Settings {
  target: {
    type: 'window' | 'screen' | 'region';
    windowId?: number;
    screenId?: number;
    region?: { x: number; y: number; width: number; height: number };
  };
}

function App() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.electron) {
      const wins = await window.electron.listWindows();
      setWindows(wins);
      const currentSettings = await window.electron.getSettings();
      setSettings(currentSettings);
      if (currentSettings.target.type === 'window') {
        setSelectedWindowId(currentSettings.target.windowId || null);
      }
    }
  };

  const handleWindowSelect = async (windowId: number) => {
    setSelectedWindowId(windowId);
    const newSettings: Settings = {
      target: {
        type: 'window',
        windowId: windowId,
      },
    };
    setSettings(newSettings);
    if (window.electron) {
      await window.electron.saveSettings(newSettings);
    }
  };

  return (
    <div className="container">
      <h1>Spectra Settings</h1>
      <div className="section">
        <h2>Select Target Window</h2>
        <button onClick={loadData}>Refresh List</button>
        <div className="window-list">
          {windows.map((win) => (
            <div
              key={win.id}
              className={`window-item ${selectedWindowId === win.id ? 'selected' : ''}`}
              onClick={() => handleWindowSelect(win.id)}
            >
              <strong>{win.ownerName}</strong> - {win.name || '(No Title)'}
              <br />
              <small>ID: {win.id} | {win.bounds.Width}x{win.bounds.Height}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <h2>Current Settings</h2>
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
