export const labels = { pending: 'Da valutare', certain: 'Certa', uncertain: 'Incerta', wrong: 'Errata' };

export function linkKey(value) {
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.*|fbclid|gclid|trk|trackingId)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    const host = /^(?:[a-z]{2,3}\.)?linkedin\.com$/.test(url.hostname)
      ? 'linkedin.com' : url.host.replace(/^www\./, '');
    return host + url.pathname.replace(/\/+$/, '') + url.search;
  } catch {
    return null;
  }
}

export function mergeSources(sources, incoming) {
  const seen = new Set(sources.map(source => linkKey(source.url)));
  const added = [];
  for (const item of incoming) {
    const key = linkKey(item.url || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    added.push({ url: item.url.trim(), title: item.title?.trim() || new URL(item.url).hostname, status: 'pending', facts: [] });
  }
  return [...sources, ...added];
}

const province = 'https://www.provincia.benevento.it';
export const seed = [{
  id: 'michele-orsillo',
  name: 'Michele Orsillo',
  sources: [
    { title: 'Profilo LinkedIn', url: 'https://it.linkedin.com/in/michele-orsillo-0999841a6', status: 'certain', facts: [] },
    { title: 'Provincia di Benevento · Determina n. 366/2026', url: province + '/node/59856', status: 'pending', facts: [] },
    { title: 'Provincia di Benevento · Determina n. 995/2026', url: province + '/node/60805', status: 'pending', facts: [] },
  ]
}];
