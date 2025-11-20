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

interface DisplayInfo {
  id: number;
  width: number;
  height: number;
  name: string;
  isMain: boolean;
}

interface Settings {
  target: {
    type: 'window' | 'screen' | 'region';
    windowId?: number;
    screenId?: number | 'main'; // Updated type to include 'main'
    region?: { x: number; y: number; width: number; height: number };
  };
}

function App() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | 'main' | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if ((window as any).electron) {
      const [wins, disps, currentSettings] = await Promise.all([
        (window as any).electron.listWindows(),
        (window as any).electron.listDisplays(),
        (window as any).electron.getSettings(),
      ]);
      setWindows(wins);
      setDisplays(disps);
      setSettings(currentSettings);

      if (currentSettings.target.type === 'window') {
        setSelectedWindowId(currentSettings.target.windowId || null);
        setSelectedDisplayId(null);
      } else if (currentSettings.target.type === 'screen') {
        const screenId = currentSettings.target.screenId;
        setSelectedDisplayId(screenId === 'main' ? 'main' : (screenId !== undefined ? parseInt(screenId as string) : null));
        setSelectedWindowId(null);
      }
    }
  };

  const handleWindowSelect = async (windowId: number) => {
    setSelectedWindowId(windowId);
    setSelectedDisplayId(null);
    const newSettings: Settings = {
      target: {
        type: 'window',
        windowId: windowId,
      },
    };
    setSettings(newSettings);
    if ((window as any).electron) {
      await (window as any).electron.saveSettings(newSettings);
    }
  };

  const handleDisplaySelect = async (displayId: number | 'main') => {
    setSelectedDisplayId(displayId);
    setSelectedWindowId(null);
    const newSettings: Settings = {
      target: {
        type: 'screen',
        screenId: displayId
      }
    };
    setSettings(newSettings);
    if ((window as any).electron) {
      await (window as any).electron.saveSettings(newSettings);
    }
  };

  return (
    <div className="container">
      <h1>Spectra Settings</h1>

      <div className="section">
        <h2>Select Target</h2>
        <button onClick={loadData}>Refresh List</button>

        <div className="lists-container" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div className="list-group">
            <h3>Displays</h3>
            <div className="list">
              <div
                className={`item ${selectedDisplayId === 'main' ? 'selected' : ''}`}
                onClick={() => handleDisplaySelect('main')}
              >
                Main Display
              </div>
              {displays.map((disp) => (
                <div
                  key={disp.id}
                  className={`item ${selectedDisplayId === disp.id ? 'selected' : ''}`}
                  onClick={() => handleDisplaySelect(disp.id)}
                >
                  {disp.name} ({disp.width}x{disp.height})
                </div>
              ))}
            </div>
          </div>

          <div className="list-group">
            <h3>Windows</h3>
            <div className="list">
              {windows.map((win) => (
                <div
                  key={win.id}
                  className={`item ${selectedWindowId === win.id ? 'selected' : ''}`}
                  onClick={() => handleWindowSelect(win.id)}
                >
                  [{win.ownerName}] {win.name || '(No Title)'}
                </div>
              ))}
            </div>
          </div>
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
