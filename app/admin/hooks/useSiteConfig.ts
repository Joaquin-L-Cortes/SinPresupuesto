import { useState, useEffect } from 'react';

export function useSiteConfig() {
  const [footer, setFooter] = useState<any>(null);
  const [donaciones, setDonaciones] = useState<any>(null);
  const [seo, setSeo] = useState<any>(null);
  const [nav, setNav] = useState<any>(null);
  const [redes, setRedes] = useState<any[]>([]);
  const [hero, setHero] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [f, d, s, n, r, h] = await Promise.all([
        fetch('/api/config?file=footer.json').then(res => res.json()),
        fetch('/api/config?file=donaciones.json').then(res => res.json()),
        fetch('/api/config?file=seo.json').then(res => res.json()),
        fetch('/api/config?file=nav.json').then(res => res.json()),
        fetch('/api/config?file=redes').then(res => res.json()),
        fetch('/api/config?file=hero.json').then(res => res.json()),
      ]);
      setFooter(f);
      setDonaciones(d);
      setSeo(s);
      setNav(n);
      setRedes(r);
      setHero(h);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveFile = async (file: string, data: any, filename?: string) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, data, filename })
    });
    if (res.ok) await fetchData();
    return res.ok;
  };

  const deleteRed = async (filename: string) => {
    const res = await fetch('/api/config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'redes', filename })
    });
    if (res.ok) await fetchData();
    return res.ok;
  };

  return { footer, donaciones, seo, nav, redes, hero, loading, saveFile, deleteRed, refresh: fetchData };
}
