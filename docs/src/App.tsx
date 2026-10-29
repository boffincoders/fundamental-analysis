import { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout';
import Home from './pages/Home';
import MetricView from './pages/MetricView';
import ApiDocs from './pages/ApiDocs';
import Try from './pages/Try';

// Dark mode context
export const DarkModeContext = createContext<{ dark: boolean; toggle: () => void }>({
  dark: false,
  toggle: () => {},
});
export const useDark = () => useContext(DarkModeContext);

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readSaved(): boolean | null {
  try {
    const saved = localStorage.getItem('dark');
    return saved === null ? null : saved === 'true';
  } catch {
    return null;
  }
}

function App() {
  // Follow the OS theme until the visitor picks one with the toggle; only
  // that choice is saved (same behaviour as the other Boffin Coders docs).
  const [saved, setSaved] = useState<boolean | null>(readSaved);
  const [systemDark, setSystemDark] = useState(() => media().matches);
  const dark = saved ?? systemDark;

  useEffect(() => {
    const mq = media();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    setSaved(next);
    try { localStorage.setItem('dark', String(next)); } catch { /* storage unavailable */ }
  };

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      <BrowserRouter basename="/fundamental-analysis">
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="api-docs" element={<ApiDocs />} />
            <Route path="metrics/:id" element={<MetricView />} />
            <Route path="try" element={<Try />} />
            <Route path="try/:ticker" element={<Try />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DarkModeContext.Provider>
  );
}

export default App;
