import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useDark } from '../App';
import { CATEGORIES } from '../data/navigation';
import { SearchDialog, SearchIcon } from './Search';

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

/** Boffin Coders logo: the gold mark on a transparent background, in both
 *  themes (shared with the other Boffin Coders docs). */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}brand/bc-gold.png`}
      alt=""
      width={size}
      height={size}
      className="block shrink-0"
    />
  );
}

const AppLayout: React.FC = () => {
  const location = useLocation();
  const { dark, toggle } = useDark();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    CATEGORIES.forEach(c => { init[c.label] = false; });
    // Auto-expand category of current page
    return init;
  });

  // Like the other Boffin Coders docs: the home page has no sidebar; doc
  // pages put a sticky sidebar under the top bar and use the full width.
  const isHome = location.pathname === '/';

  const toggleCat = (label: string) => {
    setExpandedCats(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isMetricActive = (id: string) => location.pathname === `/metrics/${id}`;

  const sidebar = (
    <nav className="flex flex-col min-h-full py-6" aria-label="Documentation">
      <div className="px-3 mb-2">
        <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Pages</p>
        <NavLink to="/" label="Overview & Playground" onClick={() => setMobileOpen(false)} />
        <NavLink to="/try" label="Try it on real stocks" onClick={() => setMobileOpen(false)} />
        <NavLink to="/api-docs" label="API Reference & Guide" onClick={() => setMobileOpen(false)} />
      </div>

      <div className="mx-5 my-3 border-t" style={{ borderColor: 'var(--border)' }} />

      {/* Metric categories */}
      <div className="px-3 flex-1">
        <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Metrics</p>
        {CATEGORIES.map(cat => {
          const isExpanded = expandedCats[cat.label] || cat.items.some(i => isMetricActive(i.id));
          return (
            <div key={cat.label} className="mb-1">
              <button
                onClick={() => toggleCat(cat.label)}
                className="w-full flex justify-between items-center px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer"
                style={{ color: 'var(--text-3)', background: 'transparent', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                <span>{cat.label}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {isExpanded && (
                <div className="ml-2 pl-3 mt-0.5 mb-1" style={{ borderLeft: '1px solid var(--border)' }}>
                  {cat.items.map(item => (
                    <Link
                      key={item.id}
                      to={`/metrics/${item.id}`}
                      onClick={() => setMobileOpen(false)}
                      className="block py-1 px-2 rounded text-[13px] no-underline transition-colors"
                      style={{
                        color: isMetricActive(item.id) ? 'var(--blue)' : 'var(--text-3)',
                        fontWeight: isMetricActive(item.id) ? '500' : '400',
                        background: isMetricActive(item.id) ? 'var(--blue-bg)' : 'transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom version badge */}
      <div className="px-5 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <a href="https://www.npmjs.com/package/fundamental-analysis" target="_blank" rel="noreferrer" className="no-underline">
          <img src="https://img.shields.io/npm/v/fundamental-analysis.svg?style=flat-square&label=npm&color=cb3837" alt="npm" className="h-5" />
        </a>
      </div>
    </nav>
  );

  const iconBtn = { background: 'var(--bg)', color: 'var(--text-3)', border: '1px solid var(--border)' };
  const content = <div className="page-enter"><Outlet /></div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        className="sticky top-0 z-30 flex items-center gap-4 h-[60px] px-4 sm:px-5"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', borderBottom: '1px solid var(--border)', backdropFilter: 'saturate(150%) blur(10px)' }}
      >
        <button
          className="min-[900px]:hidden flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer"
          style={iconBtn}
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          <MenuIcon />
        </button>
        <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="fundamental-analysis home">
          <BrandMark />
          <span className="hidden min-[440px]:flex flex-col leading-tight">
            <span className="font-bold text-[15px]" style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>fundamental-analysis</span>
            <span className="text-[11px]" style={{ color: 'var(--text-4)' }}>by Boffin Coders</span>
          </span>
        </Link>
        <nav className="hidden min-[900px]:flex gap-1 ml-2" aria-label="Main">
          <TopLink to="/try" label="Try it" />
          <TopLink to="/api-docs" label="Guide & API" />
          <TopLink to="/metrics/pe" match="/metrics/" label="Metrics" />
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-2.5 rounded-lg text-[13px] cursor-pointer"
            style={iconBtn}
            aria-label="Search"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline font-mono text-[11px] px-1.5 rounded" style={{ border: '1px solid var(--border)' }}>⌘K</kbd>
          </button>
          <button onClick={toggle} className="flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer" style={iconBtn} aria-label="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <a href="https://github.com/boffincoders/fundamental-analysis" target="_blank" rel="noreferrer" className="flex items-center justify-center w-9 h-9 rounded-lg no-underline" style={iconBtn} aria-label="GitHub repository">
            <GitHubIcon />
          </a>
        </div>
      </header>

      {/* Small screens: the sidebar opens over the page on every route */}
      {mobileOpen && (
        <div className="min-[900px]:hidden fixed inset-x-0 bottom-0 top-[60px] z-20 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          {sidebar}
        </div>
      )}

      {isHome ? (
        <main className="flex-1 w-full px-4 sm:px-5 pt-8 pb-12">{content}</main>
      ) : (
        <div className="flex-1 w-full grid grid-cols-1 min-[900px]:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden min-[900px]:block sticky top-[60px] self-start h-[calc(100vh-60px)] overflow-y-auto" style={{ borderRight: '1px solid var(--border)' }}>
            {sidebar}
          </aside>
          <main className="min-w-0 pt-10 pb-20" style={{ paddingInline: 'clamp(16px, 3vw, 48px)' }}>{content}</main>
        </div>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Shared Boffin Coders footer pattern (same as the other package docs) */}
      <footer className="px-6 py-8 text-center text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-4)' }}>
        <a
          href="https://boffincoders.com/?utm_source=docs&utm_medium=footer&utm_campaign=fundamental-analysis"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-3 no-underline mb-3"
        >
          <BrandMark size={36} />
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>Built and maintained by Boffin Coders</span>
        </a>
        <p className="m-0">
          fundamental-analysis {__PKG_VERSION__} · MIT licence ·{' '}
          <a href="https://github.com/boffincoders/fundamental-analysis" target="_blank" rel="noopener" style={{ color: 'var(--text-4)' }}>GitHub</a>
          {' '}·{' '}
          <a href="https://www.npmjs.com/package/fundamental-analysis" target="_blank" rel="noopener" style={{ color: 'var(--text-4)' }}>npm</a>
        </p>
        <p className="m-0 mt-2">
          More open source by Boffin Coders:{' '}
          <a href="https://boffincoders.github.io/akamai-netstorageapi-typescript/" target="_blank" rel="noopener" style={{ color: 'var(--text-4)' }}>ts-netstorageapi-akamai</a>
          {' '}·{' '}
          <a href="https://boffincoders.github.io/durable_queue/" target="_blank" rel="noopener" style={{ color: 'var(--text-4)' }}>durable_queue</a>
          {' '}·{' '}
          <a href="https://github.com/boffincoders" target="_blank" rel="noopener" style={{ color: 'var(--text-4)' }}>github.com/boffincoders</a>
          {' '}·{' '}
          <a href="https://boffincoders.github.io/" style={{ color: 'var(--text-4)' }}>All Boffin Coders open source</a>
        </p>
        <p className="m-0 mt-2 text-[12px]">
          Ratings and verdicts are generic rules of thumb, not investment advice. Thresholds vary by sector.
        </p>
      </footer>
    </div>
  );
};

// Top bar link; active on its own path or, with match, any path under it.
function TopLink({ to, label, match }: { to: string; label: string; match?: string }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(`${match ?? to}/`) || (match != null && pathname.startsWith(match));
  return (
    <Link
      to={to}
      className="px-2.5 py-1.5 rounded-lg text-[14px] no-underline"
      style={{ color: active ? 'var(--text)' : 'var(--text-3)', background: active ? 'var(--bg-subtle)' : 'transparent' }}
    >
      {label}
    </Link>
  );
}

// Reusable top-level nav link
function NavLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`));
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center px-2 py-1.5 rounded-md text-[13px] no-underline transition-colors mb-0.5"
      style={{
        color: active ? 'var(--blue)' : 'var(--text-2)',
        fontWeight: active ? '500' : '400',
        background: active ? 'var(--blue-bg)' : 'transparent',
      }}
    >
      {label}
    </Link>
  );
}

export default AppLayout;
