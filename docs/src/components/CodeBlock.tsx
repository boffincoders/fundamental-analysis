import { useEffect, useState } from 'react';
import { createHighlighter, type Highlighter } from 'shiki';
import { useDark } from '../App';

// ── Shiki code block ────────────────────────────────────────────────────────
let _hl: Highlighter | null = null;
async function getHighlighter() {
  if (!_hl) {
    _hl = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['typescript', 'bash', 'json'],
    });
  }
  return _hl;
}

export function CodeBlock({ code, lang = 'typescript' }: { code: string; lang?: string }) {
  const { dark } = useDark();
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(hl => {
      if (!cancelled) {
        setHtml(hl.codeToHtml(code.trim(), {
          lang,
          theme: dark ? 'github-dark' : 'github-light',
        }));
      }
    });
    return () => { cancelled = true; };
  }, [code, lang, dark]);

  const copy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-4)' }}>{lang}</span>
        <button
          onClick={copy}
          className="text-[11px] px-2 py-0.5 rounded transition-colors"
          style={{ background: 'var(--bg)', color: copied ? 'var(--green)' : 'var(--text-4)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} style={{ fontSize: 13 }} />
        : <pre className="px-5 py-4 text-[13px] font-mono overflow-x-auto" style={{ background: dark ? '#0d1117' : '#f6f8fa', color: 'var(--text-2)', margin: 0 }}>{code.trim()}</pre>
      }
    </div>
  );
}


/** Highlighted code on the dark code background in both themes (home page tabs). */
export function DarkCode({ code, lang = 'typescript' }: { code: string; lang?: string }) {
  const [html, setHtml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then(hl => {
      if (!cancelled) setHtml(hl.codeToHtml(code.trim(), { lang, theme: 'github-dark' }));
    });
    return () => { cancelled = true; };
  }, [code, lang]);

  return (
    <div className="dark-code relative group">
      <button
        onClick={() => { navigator.clipboard?.writeText(code.trim()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="absolute top-2.5 right-2.5 z-10 text-[11px] px-2 py-0.5 rounded-md cursor-pointer opacity-80 group-hover:opacity-100"
        style={{ background: '#121c31', color: copied ? '#7ee787' : '#b6c2d6', border: '1px solid #2c3a57' }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      {html
        ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : <pre className="shiki"><code>{code.trim()}</code></pre>}
    </div>
  );
}
