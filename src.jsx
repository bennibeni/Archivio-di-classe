import { useId, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { labels, seed, mergeSources, linkKey } from './model.js';
import './style.css';

const storage = 'archivio-di-classe-v1';
const groups = {
  all: 'Tutte', certain: 'Certe', pending: 'Da valutare', uncertain: 'Incerte',
};
function load() {
  try { return JSON.parse(localStorage.getItem(storage)) ?? seed; } catch { return seed; }
}
const backupFormat = 'archivio-di-classe';
function exportArchive(people) {
  const payload = { format: backupFormat, version: 1, exportedAt: new Date().toISOString(), people };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'archivio-di-classe-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
// Accetta solo dati con la struttura dell'archivio; restituisce null se il file non è valido.
function parseArchive(text) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  const list = Array.isArray(data) ? data : data?.format === backupFormat ? data.people : null;
  if (!Array.isArray(list)) return null;
  const isText = (v, max) => typeof v === 'string' && v.trim() !== '' && v.length <= max;
  const ids = new Set();
  const people = [];
  for (const p of list) {
    if (!p || !isText(p.id, 100) || !isText(p.name, 100) || !Array.isArray(p.sources) || ids.has(p.id)) return null;
    ids.add(p.id);
    const sources = [];
    for (const s of p.sources) {
      if (!s || typeof s.url !== 'string' || !linkKey(s.url) || !(s.status in labels)) return null;
      const facts = Array.isArray(s.facts) ? s.facts.filter(f => typeof f === 'string' && f.trim()).map(f => f.slice(0, 350)) : [];
      sources.push({ url: s.url.trim(), title: isText(s.title, 300) ? s.title.trim() : new URL(s.url).hostname, status: s.status, facts });
    }
    people.push({ id: p.id, name: p.name.trim(), sources });
  }
  return people;
}
function Source({ source, update, remove }) {
  const [expanded, setExpanded] = useState(false);
  const [fact, setFact] = useState('');
  const detailsId = useId();
  return <>
    <tr className="source-summary">
      <th scope="row">
        <button type="button" className="source-toggle" aria-expanded={expanded} aria-controls={detailsId}
          onClick={() => setExpanded(open => !open)}>
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          <span>{source.title}<small className="domain">{new URL(source.url).hostname}</small></span>
        </button>
      </th>
      <td><span className={'badge ' + source.status}>{labels[source.status]}</span></td>
    </tr>
    <tr id={detailsId} className="source-details" hidden={!expanded}>
      <td colSpan={2}>
        <a href={source.url} target="_blank" rel="noreferrer" aria-label={'Apri fonte: ' + source.title}>Apri pagina ↗</a>
        <div className="actions" aria-label="Valutazione della fonte">
          {['certain', 'uncertain', 'wrong'].map(s =>
            <button key={s} type="button" className={s === 'wrong' ? 'danger' : ''} aria-pressed={source.status === s}
              aria-label={labels[s] + ': ' + source.title} onClick={() => update({ status: s })}>{labels[s]}</button>)}
        </div>
        {source.status === 'certain' && <div className="facts">
          <h4>Informazioni verificate</h4>
          {!source.facts.length && <p>Registra solo ciò che puoi verificare nella fonte.</p>}
          {source.facts.length > 0 && <ul>{source.facts.map((item, i) => <li key={i}>{item}
            <button className="danger" aria-label={'Rimuovi informazione: ' + item}
              onClick={() => update({ facts: source.facts.filter((_, index) => i !== index) })}>×</button></li>)}</ul>}
          <form className="row" onSubmit={e => {
            e.preventDefault();
            if (!fact.trim()) return;
            update({ facts: [...source.facts, fact.trim()] });
            setFact('');
          }}><input aria-label="Informazione verificata" placeholder="Aggiungi un’informazione" value={fact} maxLength={350} onChange={e => setFact(e.target.value)} />
            <button>Aggiungi</button></form>
        </div>}
        <div className="actions">
          <button type="button" className="danger" onClick={() => {
            const confirmed = window.confirm(
              'Rimuovere «' + source.title + '» e le sue annotazioni da questa scheda?'
            );
            if (confirmed) remove();
          }}>Rimuovi fonte</button>
        </div>
      </td>
    </tr>
  </>;
}
function App() {
  const [people, setPeople] = useState(load);
  const [active, setActive] = useState(() => load()[0]?.id);
  const [storageError, setStorageError] = useState(false);
  const person = people.find(p => p.id === active);
  function change(transform) {
    setPeople(previous => {
      const next = transform(previous);
      try { localStorage.setItem(storage, JSON.stringify(next)); }
      catch { queueMicrotask(() => setStorageError(true)); }
      return next;
    });
  }
  const [transferNotice, setTransferNotice] = useState('');
  function select(id) { setActive(id); }
  async function importArchive(e) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) return setTransferNotice('Il file è troppo grande.');
    const imported = parseArchive(await file.text());
    if (!imported) return setTransferNotice('Il file non è un archivio valido.');
    const count = imported.length === 1 ? '1 compagno' : imported.length + ' compagni';
    if (!window.confirm('Sostituire l’archivio di questo browser con ' + count + ' dal file «' + file.name + '»? Le schede attuali verranno sovrascritte.')) return;
    change(() => imported);
    setActive(imported[0]?.id);
    setTransferNotice('Archivio importato: ' + count + '.');
  }
  function add(e) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name').trim().replace(/\s+/g, ' ');
    if (!name) return;
    const prior = people.find(p => p.name.toLocaleLowerCase('it') === name.toLocaleLowerCase('it'));
    if (prior) select(prior.id);
    else {
      const id = crypto.randomUUID();
      change(list => [...list, { id, name, sources: [] }]);
      select(id);
    }
    e.currentTarget.reset();
  }
  return <>
    <header><div className="mast"><span className="mark" aria-hidden="true">▤</span><div>ARCHIVIO PERSONALE <small>Strumenti di classe</small></div></div>
      <span className="local">● Dati su questo browser</span></header>
    <main>
      <div className="intro"><div className="kicker">RUBRICA E FONTI WEB</div><h1>Archivio di classe</h1>
        <p>Un posto per ritrovare i compagni e verificare le fonti che li riguardano.</p></div>
      {storageError && <p role="alert">Il browser non riesce a salvare le modifiche.</p>}
      <div className="layout">
        <aside aria-label="Elenco dei compagni"><div className="side-title"><h2>Compagni</h2><span>{people.length}</span></div>
          <nav>{people.map(p => <button key={p.id} className="person" aria-current={p.id === active ? 'true' : undefined} onClick={() => select(p.id)}>
            <span className="initials">{p.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>{p.name}</button>)}</nav>
          <form className="add" onSubmit={add}><label htmlFor="new-name">Nuovo compagno</label>
            <input id="new-name" name="name" maxLength={100} required placeholder="Nome e cognome" /><button>+ Aggiungi</button></form>
          <div className="transfer"><h3>Backup</h3>
            <p>Salva l’archivio in un file e caricalo in un altro browser o indirizzo.</p>
            <button type="button" onClick={() => { exportArchive(people); setTransferNotice('File esportato.'); }}>Esporta archivio</button>
            <label className="file-button">Importa archivio
              <input type="file" accept="application/json,.json" onChange={importArchive} /></label>
            <div role="status" className="notice">{transferNotice}</div>
          </div>
        </aside>
        {person && <Profile key={person.id} {...{ person, change }} />}
      </div>
    </main>
    <footer className="projects-footer">
      <a href="https://links-page-bennibeni.vercel.app/">← ALL LINKS</a>
      <span>Archivio di classe</span>
    </footer>
  </>;
}
function Profile({ person, change }) {
  const [filter, setFilter] = useState('all');
  const [keywords, setKeywords] = useState('');
  const [notice, setNotice] = useState('');
  const [proposals, setProposals] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const update = fn => change(list => list.map(p => p.id === person.id ? fn(p) : p));
  const updateSources = fn => update(p => ({ ...p, sources: fn(p.sources) }));
  const visible = person.sources.filter(s => s.status !== 'wrong');
  const matching = visible.filter(s => filter === 'all' || s.status === filter);
  const savedKeys = new Set(person.sources.map(source => linkKey(source.url)));
  const newProposals = proposals?.filter(source => !savedKeys.has(linkKey(source.url)));
  function addLinks(items) {
    const count = mergeSources(person.sources, items).length - person.sources.length;
    updateSources(sources => mergeSources(sources, items));
    if (count) setFilter('pending');
    setNotice(count ? (count === 1 ? '1 nuova fonte da valutare.' : count + ' nuove fonti da valutare.') : 'Nessuna nuova fonte. I link già presenti o scartati non vengono aggiunti.');
  }
  async function search(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice('');
    setProposals(null);
    try {
      const response = await fetch('/api/search?' + new URLSearchParams({ name: person.name, extra: keywords }));
      const data = await response.json();
      if (!response.ok) setNotice(data.error);
      else setProposals(mergeSources([], data.results));
    } catch { setNotice('Ricerca non disponibile. Usa Google e aggiungi il link.'); }
    finally { setBusy(false); }
  }
  function saveName(e) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name').trim().replace(/\s+/g, ' ');
    if (!name) return;
    setProposals(null);
    update(p => ({ ...p, name }));
    setEditing(false);
  }
  return <section className="profile" aria-label={'Scheda di ' + person.name}>
    <div className="profile-head"><div><div className="kicker">SCHEDA COMPAGNO</div><h2>{person.name}</h2></div>
      <button onClick={() => setEditing(!editing)} aria-expanded={editing}>Modifica nome</button></div>
    {editing && <form className="row rename" onSubmit={saveName}><input aria-label="Nome del compagno" name="name" defaultValue={person.name} maxLength={100} required /><button disabled={busy}>Salva</button></form>}
    <div className="search"><h3>Cerca nuove fonti</h3><p>Usa il nome del compagno e, se serve, aggiungi un dettaglio per distinguere gli omonimi.</p>
      <form className="row" onSubmit={search}><input aria-label="Parole chiave facoltative" placeholder="Es. città, scuola, professione" maxLength={150} value={keywords} onChange={e => setKeywords(e.target.value)} />
        <button className="primary" disabled={busy}>{busy ? 'Ricerca…' : 'Cerca sul web'}</button></form>
      <div className="search-links">
        <a className="manual" href={'https://www.google.com/search?q=' + encodeURIComponent('"' + person.name + '" ' + keywords)} rel="noreferrer" target="_blank">Apri ricerca su Google ↗</a>
        <a className="manual" href="https://api-dashboard.search.brave.com/app/dashboard" rel="noreferrer" target="_blank">Controlla credito Brave ↗</a>
      </div>
      <details><summary>Aggiungi un link</summary><form className="row import" onSubmit={e => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (!linkKey(data.get('url'))) return setNotice('Inserisci un indirizzo HTTP o HTTPS valido.');
        addLinks([{ url: data.get('url'), title: data.get('title') }]);
        e.currentTarget.reset();
      }}><input type="url" name="url" required aria-label="Indirizzo della fonte" placeholder="https://…" />
        <input name="title" maxLength={150} aria-label="Titolo della fonte" placeholder="Titolo (facoltativo)" /><button>Aggiungi</button></form></details>
      <div role="status" className={notice ? 'notice' : ''}>{notice}</div>
    </div>
    {newProposals && <section className="search" aria-label="Proposte temporanee di Brave">
      <div className="source-head">
        <h3>Proposte di Brave ({newProposals.length})</h3>
        <button type="button" onClick={() => setProposals(null)}>Chiudi proposte</button>
      </div>
      <p role="status">{newProposals.length
        ? 'Apri la pagina originale e usa «Aggiungi un link» per archiviarla manualmente.'
        : 'Nessuna nuova fonte nei risultati.'}</p>
      {newProposals.length > 0 && <ul className="proposal-list">{newProposals.map(source =>
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>
          <small className="domain">{new URL(source.url).hostname}</small>
          <button type="button" aria-label={'Nascondi proposta: ' + source.title}
            onClick={() => setProposals(current => current?.filter(item => item.url !== source.url) ?? null)}>
            Nascondi
          </button>
        </li>)}</ul>}
    </section>}
    <div className="section-head"><h3>Fonti web</h3><p>Le fonti archiviate come errate vengono escluse anche dalle ricerche successive.</p></div>
    <div className="filters" aria-label="Filtra le fonti">{Object.entries(groups).map(([id, label]) =>
      <button key={id} aria-pressed={id === filter} onClick={() => setFilter(id)}>{label}
        <span>{id === 'all' ? visible.length : visible.filter(s => s.status === id).length}</span></button>)}</div>
    {!matching.length && <p className="empty">Nessuna fonte in questa vista.</p>}
    {matching.length > 0 && <table className="sources-table" aria-label="Fonti web">
      <thead><tr><th scope="col">Fonte</th><th scope="col">Valutazione</th></tr></thead>
      <tbody>{matching.map(source => <Source
        key={source.url}
        source={source}
        update={patch => updateSources(sources => sources.map(s => s.url === source.url ? { ...s, ...patch } : s))}
        remove={() => updateSources(sources => sources.filter(s => s.url !== source.url))}
      />)}</tbody>
    </table>}
  </section>;
}
createRoot(document.getElementById('root')).render(<App />);
