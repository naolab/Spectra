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

      // Filter out windows with no title or very small dimensions (likely background/system windows)
      const validWindows = wins.filter((w: WindowInfo) =>
        w.name &&
        w.name.trim() !== '' &&
        w.bounds.Width > 50 &&
        w.bounds.Height > 50
      );

      setWindows(validWindows);
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
      <h1>Spectra</h1>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Capture Target</h2>
          <button className="refresh-btn" onClick={loadData}>
            Refresh List
          </button>
        </div>

        <div className="lists-container">
          <div className="list-group">
            <h3>Displays</h3>
            <div className="list">
              <div
                className={`item ${selectedDisplayId === 'main' ? 'selected' : ''}`}
                onClick={() => handleDisplaySelect('main')}
              >
                <span className="item-name">Main Display</span>
                <span className="item-meta">Primary</span>
              </div>
              {displays.map((disp) => (
                <div
                  key={disp.id}
                  className={`item ${selectedDisplayId === disp.id ? 'selected' : ''}`}
                  onClick={() => handleDisplaySelect(disp.id)}
                >
                  <span className="item-name">{disp.name}</span>
                  <span className="item-meta">{disp.width}x{disp.height}</span>
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
                  <span className="item-name">{win.name || '(No Title)'}</span>
                  <span className="item-meta">{win.ownerName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Current Status</h2>
        <div className="status-card">
          <div className="status-info">
            <span className="status-label">Active Target</span>
            <span className="status-value">
              {(() => {
                if (!settings?.target) return 'Not Configured';

                if (settings.target.type === 'screen') {
                  if (settings.target.screenId === 'main') return 'Main Display';
                  const disp = displays.find(d => d.id === Number(settings.target.screenId));
                  return disp ? disp.name : 'Unknown Display';
                }

                if (settings.target.type === 'window') {
                  const win = windows.find(w => w.id === settings.target.windowId);
                  return win ? `${win.ownerName} - ${win.name}` : 'Unknown Window';
                }

                return 'Not Configured';
              })()}
            </span>
          </div>
          <div className="status-badge">
            Active
          </div>
        </div>
        {/* Debug info hidden but accessible if needed */}
        {/* <pre style={{ fontSize: '0.7rem', opacity: 0.5 }}>{JSON.stringify(settings, null, 2)}</pre> */}
      </div>
    </div>
  );
}

export default App;
