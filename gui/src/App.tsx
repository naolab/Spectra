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

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [activeTab, setActiveTab] = useState<'apps' | 'screens'>('apps');

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
      <div className="header-row">
        <h1>{t('app.title')}</h1>
        <div className="controls-group">
          <div className="view-switcher">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title={t('app.list')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title={t('app.grid')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>
          <div className="language-switcher">
            <button onClick={() => changeLanguage('en')} className={i18n.language.startsWith('en') ? 'active' : ''}>EN</button>
            <button onClick={() => changeLanguage('ja')} className={i18n.language.startsWith('ja') ? 'active' : ''}>JA</button>
            <button onClick={() => changeLanguage('es')} className={i18n.language.startsWith('es') ? 'active' : ''}>ES</button>
            <button onClick={() => changeLanguage('zh')} className={i18n.language.startsWith('zh') ? 'active' : ''}>ZH</button>
          </div>
        </div>
      </div>

      <div className="section main-section">
        <div className="section-header">
          {viewMode === 'grid' ? (
            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
                onClick={() => setActiveTab('apps')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                {t('app.apps')}
              </button>
              <button
                className={`tab-btn ${activeTab === 'screens' ? 'active' : ''}`}
                onClick={() => setActiveTab('screens')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                {t('app.screens')}
              </button>
            </div>
          ) : (
            <h2>{t('app.captureTarget')}</h2>
          )}
          <button className="refresh-btn" onClick={loadData}>
            {t('app.refreshList')}
          </button>
        </div>

        <div className="content-area">
          {viewMode === 'list' ? (
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
          ) : (
            <div className="grid-container">
              {activeTab === 'screens' && (
                <div className="grid">
                  <div
                    className={`grid-item ${selectedDisplayId === 'main' ? 'selected' : ''}`}
                    onClick={() => handleDisplaySelect('main')}
                  >
                    <div className="thumbnail-placeholder">
                      <span className="placeholder-icon">🖥️</span>
                    </div>
                    <div className="grid-item-info">
                      <span className="grid-item-name">{t('app.mainDisplay')}</span>
                      <span className="grid-item-meta">{t('app.primary')}</span>
                    </div>
                  </div>
                  {displays.map((disp) => (
                    <div
                      key={disp.id}
                      className={`grid-item ${selectedDisplayId === disp.id ? 'selected' : ''}`}
                      onClick={() => handleDisplaySelect(disp.id)}
                    >
                      <div className="thumbnail-placeholder">
                        <span className="placeholder-icon">🖥️</span>
                      </div>
                      <div className="grid-item-info">
                        <span className="grid-item-name">{disp.name}</span>
                        <span className="grid-item-meta">{disp.width}x{disp.height}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'apps' && (
                <div className="grid">
                  {windows.map((win) => (
                    <div
                      key={win.id}
                      className={`grid-item ${selectedWindowId === win.id ? 'selected' : ''}`}
                      onClick={() => handleWindowSelect(win.id)}
                    >
                      <div className="thumbnail-placeholder">
                        <span className="placeholder-icon">🪟</span>
                      </div>
                      <div className="grid-item-info">
                        <span className="grid-item-name">{win.name || win.ownerName}</span>
                        <span className="grid-item-meta">{win.name ? win.ownerName : t('app.noTitle')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
