import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const SITE_URL = 'https://boffincoders.github.io/finance-calculator';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Keeps <title>, meta description, canonical URL and Open Graph tags in sync
 * with the current route (the static per-route HTML generated at build time
 * carries the same values for crawlers that do not run JavaScript).
 */
export function usePageMeta(title: string, description?: string) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;
    const url = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/?$/, '/')}`;

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    }
  }, [title, description, pathname]);
}
