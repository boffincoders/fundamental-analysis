import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/navigation';
import { metricsData } from '../data/metrics';
import { DEMO_INDEX } from '../data/demo';

interface Entry { title: string; hint: string; to: string }

const ENTRIES: Entry[] = [
  { title: 'Overview', hint: 'Home', to: '/' },
  { title: 'Try it on real companies', hint: 'Demo', to: '/try' },
  { title: 'API reference & guide', hint: 'Docs', to: '/api-docs' },
  ...CATEGORIES.flatMap(c => c.items.map(i => ({
    title: i.label,
    hint: `${c.label}${metricsData[i.id]?.formula ? ` · ${metricsData[i.id].formula}` : ''}`,
    to: `/metrics/${i.id}`,
  }))),
  ...DEMO_INDEX.map(c => ({ title: `${c.name} (${c.ticker})`, hint: 'Try it · fundamental analysis', to: `/try/${c.ticker}` })),
];

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** ⌘K / Ctrl+K search over pages, metrics and demo companies. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? ENTRIES.filter(e => `${e.title} ${e.hint}`.toLowerCase().includes(t)) : ENTRIES.slice(0, 8);
    return list.slice(0, 12);
  }, [q]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const go = (e?: Entry) => {
    if (!e) return;
    navigate(e.to);
    setQ('');
    setActive(0);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}
      className="p-0 rounded-2xl backdrop:bg-black/50"
      style={{ width: 'min(640px, calc(100vw - 32px))', margin: '12vh auto auto', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxShadow: 'var(--shadow)' }}
    >
      <input
        autoFocus
        value={q}
        onChange={e => { setQ(e.target.value); setActive(0); }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          if (e.key === 'Enter') go(results[active]);
        }}
        placeholder="Search metrics, companies and pages…"
        aria-label="Search"
        className="w-full bg-transparent outline-none text-[16px] px-5 py-4"
        style={{ color: 'var(--text)', border: 'none', borderBottom: '1px solid var(--border)' }}
      />
      <ul className="list-none m-0 p-1.5 overflow-y-auto" style={{ maxHeight: '55vh' }}>
        {results.length === 0 && <li className="px-3 py-3 text-[14px]" style={{ color: 'var(--text-4)' }}>No matches.</li>}
        {results.map((r, i) => (
          <li key={r.to}>
            <button
              onClick={() => go(r)}
              onMouseEnter={() => setActive(i)}
              className="w-full text-left px-3 py-2 rounded-lg cursor-pointer"
              style={{ background: i === active ? 'var(--blue-bg)' : 'transparent', border: 'none', color: 'var(--text)' }}
            >
              <span className="block text-[14px]">{r.title}</span>
              <span className="block text-[12px] truncate" style={{ color: 'var(--text-4)' }}>{r.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
