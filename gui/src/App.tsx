import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';

interface WindowInfo {
  id: number;
  name: string;
  ownerName: string;
  layer: number;
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
  const { t, i18n } = useTranslation();
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
      // Exception: Allow windows with empty title if they are on layer 0 (main app windows)
      const validWindows = wins.filter((w: WindowInfo) =>
        w.bounds.Width > 50 &&
        w.bounds.Height > 50 &&
        (
          (w.name && w.name.trim() !== '') ||
          w.layer === 0
        )
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

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('app.title')}</h1>
        <div className="language-switcher">
          <button onClick={() => changeLanguage('en')} className={i18n.language.startsWith('en') ? 'active' : ''}>EN</button>
          <button onClick={() => changeLanguage('ja')} className={i18n.language.startsWith('ja') ? 'active' : ''}>JA</button>
          <button onClick={() => changeLanguage('es')} className={i18n.language.startsWith('es') ? 'active' : ''}>ES</button>
          <button onClick={() => changeLanguage('zh')} className={i18n.language.startsWith('zh') ? 'active' : ''}>ZH</button>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{t('app.captureTarget')}</h2>
          <button className="refresh-btn" onClick={loadData}>
            {t('app.refreshList')}
          </button>
        </div>

        <div className="lists-container">
          <div className="list-group">
            <h3>{t('app.displays')}</h3>
            <div className="list">
              <div
                className={`item ${selectedDisplayId === 'main' ? 'selected' : ''}`}
                onClick={() => handleDisplaySelect('main')}
              >
                <span className="item-name">{t('app.mainDisplay')}</span>
                <span className="item-meta">{t('app.primary')}</span>
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
            <h3>{t('app.windows')}</h3>
            <div className="list">
              {windows.map((win) => (
                <div
                  key={win.id}
                  className={`item ${selectedWindowId === win.id ? 'selected' : ''}`}
                  onClick={() => handleWindowSelect(win.id)}
                >
                  <span className="item-name">{win.name || win.ownerName}</span>
                  <span className="item-meta">{win.name ? win.ownerName : t('app.noTitle')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>{t('app.currentStatus')}</h2>
        <div className="status-card">
          <div className="status-info">
            <span className="status-label">{t('app.activeTarget')}</span>
            <span className="status-value">
              {(() => {
                if (!settings?.target) return t('app.notConfigured');

                if (settings.target.type === 'screen') {
                  if (settings.target.screenId === 'main') return t('app.mainDisplay');
                  const disp = displays.find(d => d.id === Number(settings.target.screenId));
                  return disp ? disp.name : t('app.unknownDisplay');
                }

                if (settings.target.type === 'window') {
                  const win = windows.find(w => w.id === settings.target.windowId);
                  return win ? `${win.ownerName} - ${win.name}` : t('app.unknownWindow');
                }

                return t('app.notConfigured');
              })()}
            </span>
          </div>
          <div className="status-badge">
            {t('app.active')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
