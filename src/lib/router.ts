import { useCallback, useEffect, useState } from 'react';

export interface Route {
  path: string;
  segments: string[];
  params: Record<string, string>;
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.slice(1) || '/';
  const [path, queryString] = raw.split('?');
  const cleanPath = path.replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);
  return {
    path: cleanPath,
    segments,
    params: {},
    query: new URLSearchParams(queryString ?? ''),
  };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('#') ? to.slice(1) : to;
    if (target === window.location.hash.slice(1)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = target;
  }, []);

  return { route, navigate };
}
