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
  thumbnail?: string;
}

interface DisplayInfo {
  id: number;
  width: number;
  height: number;
  name: string;
  isMain: boolean;
  thumbnail?: string;
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
  const { t, i18n } = useTranslation();
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<number | null>(null);
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [activeTab, setActiveTab] = useState<'apps' | 'screens'>('apps');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if ((window as any).electron) {
      try {
        // 1. Fetch lists (fast, no thumbnails)
        const [wins, disps, currentSettings] = await Promise.all([
          (window as any).electron.listWindows(),
          (window as any).electron.listDisplays(),
          (window as any).electron.getSettings(),
        ]);

        setWindows(wins);
        setDisplays(disps);
        setRefreshTrigger(prev => prev + 1); // Trigger thumbnail reload
        if (currentSettings) {
          setSettings(currentSettings);
          if (currentSettings.target) {
            if (currentSettings.target.type === 'window') {
              setSelectedWindowId(currentSettings.target.windowId);
              setSelectedDisplayId(null);
            } else if (currentSettings.target.type === 'screen') {
              setSelectedDisplayId(currentSettings.target.screenId ?? null);
              setSelectedWindowId(null);
            }
          }
        }

        // 2. Lazy load thumbnails - Removed from here, handled by useEffect
        // loadThumbnails(wins, disps);

      } catch (error) {
        console.error("Failed to load data:", error);
      }
    }
  };

  // Effect to load thumbnails when windows/displays change and have missing thumbnails
  useEffect(() => {
    let isMounted = true;

    const loadMissingThumbnails = async () => {
      if (!(window as any).electron) return;

      // Check for windows without thumbnails
      const windowsNeedingThumbnails = windows.filter(w => !w.thumbnail);
      if (windowsNeedingThumbnails.length > 0) {
        console.log(`Loading thumbnails for ${windowsNeedingThumbnails.length} windows...`);

        // Process one at a time to avoid overwhelming the backend/UI
        const chunkSize = 1;
        for (let i = 0; i < windowsNeedingThumbnails.length; i += chunkSize) {
          if (!isMounted) return;

          const chunk = windowsNeedingThumbnails.slice(i, i + chunkSize);
          const results = await Promise.all(chunk.map(async (win) => {
            try {
              const result = await (window as any).electron.getWindowThumbnail(win.id);
              return { id: win.id, thumbnail: result?.thumbnail };
            } catch (e) {
              console.error(`Failed to load thumbnail for window ${win.id}`, e);
              return null;
            }
          }));

          if (!isMounted) return;

          // Update state with the batch of results
          setWindows(prev => {
            const newWindows = [...prev];
            results.forEach(res => {
              if (res && res.thumbnail) {
                const index = newWindows.findIndex(w => w.id === res.id);
                if (index !== -1) {
                  newWindows[index] = { ...newWindows[index], thumbnail: res.thumbnail };
                }
              }
            });
            return newWindows;
          });

          // Small delay to allow UI to breathe
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Check for displays without thumbnails
      const displaysNeedingThumbnails = displays.filter(d => !d.thumbnail);
      if (displaysNeedingThumbnails.length > 0) {
        for (const disp of displaysNeedingThumbnails) {
          if (!isMounted) return;
          try {
            const result = await (window as any).electron.getDisplayThumbnail(disp.id);
            if (result && result.thumbnail) {
              setDisplays(prev => prev.map(d => d.id === disp.id ? { ...d, thumbnail: result.thumbnail } : d));
            }
          } catch (e) {
            console.error(`Failed to load thumbnail for display ${disp.id}`, e);
          }
        }
      }
    };

    loadMissingThumbnails();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]); // Trigger on refresh



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

  const handleDisplaySelect = async (displayId: number) => {
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
                  {displays.map((disp) => (
                    <div
                      key={disp.id}
                      className={`item ${selectedDisplayId === disp.id ? 'selected' : ''}`}
                      onClick={() => handleDisplaySelect(disp.id)}
                    >
                      <span className="item-name">{disp.name}{disp.isMain ? ' (Main)' : ''}</span>
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
                  {displays.map((disp) => (
                    <div
                      key={disp.id}
                      className={`grid-item ${selectedDisplayId === disp.id ? 'selected' : ''}`}
                      onClick={() => handleDisplaySelect(disp.id)}
                    >
                      {disp.thumbnail ? (
                        <img src={`data:image/jpeg;base64,${disp.thumbnail}`} alt={disp.name} className="thumbnail-image" />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                          </svg>
                        </div>
                      )}
                      <div className="grid-item-info">
                        <span className="grid-item-name">{disp.name}{disp.isMain ? ' (Main)' : ''}</span>
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
                      {win.thumbnail ? (
                        <img src={`data:image/jpeg;base64,${win.thumbnail}`} alt={win.name} className="thumbnail-image" />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                            <rect x="9" y="9" width="6" height="6"></rect>
                            <line x1="9" y1="1" x2="9" y2="4"></line>
                            <line x1="15" y1="1" x2="15" y2="4"></line>
                            <line x1="9" y1="20" x2="9" y2="23"></line>
                            <line x1="15" y1="20" x2="15" y2="23"></line>
                            <line x1="20" y1="9" x2="23" y2="9"></line>
                            <line x1="20" y1="14" x2="23" y2="14"></line>
                            <line x1="1" y1="9" x2="4" y2="9"></line>
                            <line x1="1" y1="14" x2="4" y2="14"></line>
                          </svg>
                        </div>
                      )}
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
                  const disp = displays.find(d => d.id === settings.target.screenId);
                  return disp ? `${disp.name}${disp.isMain ? ' (Main)' : ''}` : t('app.unknownDisplay');
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
