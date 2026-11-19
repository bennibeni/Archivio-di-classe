// Pagina statica: mostra in sola lettura l'archivio esportato il 19/11/2026.
// Per aggiornarla, sostituisci il file JSON in data/ con un nuovo export e cambia l'import qui sotto.
import { createRoot } from 'react-dom/client';
import archive from './data/archivio-di-classe-2026-11-19.json';
import { labels } from './model.js';
import './style.css';

const order = { certain: 0, uncertain: 1, pending: 2 };
const people = archive.people.map(p => ({
  ...p,
  sources: p.sources.filter(s => s.status !== 'wrong').sort((a, b) => order[a.status] - order[b.status]),
}));
const exportedAt = new Date(archive.exportedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const initials = name => name.split(/\s+/).slice(0, 2).map(w => w[0]).join('');

function Person({ person }) {
  return <section className="profile static-card" id={person.id} aria-labelledby={person.id + '-name'}>
    <div className="profile-head"><div><div className="kicker">SCHEDA COMPAGNO</div><h2 id={person.id + '-name'}>{person.name}</h2></div>
      <span className="side-title"><span>{person.sources.length === 1 ? '1 fonte' : person.sources.length + ' fonti'}</span></span></div>
    {!person.sources.length && <p className="empty">Nessuna fonte archiviata.</p>}
    {person.sources.length > 0 && <ul className="static-sources">{person.sources.map(s => <li key={s.url}>
      <div>
        <a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>
        <small className="domain">{host(s.url)}</small>
        {s.facts?.length > 0 && <ul className="static-facts">{s.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
      </div>
      <span className={'badge ' + s.status}>{labels[s.status]}</span>
    </li>)}</ul>}
  </section>;
}

function Page() {
  return <>
    <header><div className="mast"><span className="mark" aria-hidden="true">▤</span><div>ARCHIVIO PERSONALE <small>Strumenti di classe</small></div></div>
      <span className="local">Copia statica · {exportedAt}</span></header>
    <main>
      <div className="intro"><div className="kicker">SOLA LETTURA</div><h1>Archivio di classe</h1>
        <p>Istantanea dell’archivio esportato il {exportedAt}: {people.length === 1 ? '1 compagno' : people.length + ' compagni'}. Le fonti errate sono escluse.</p>
        <p><a href="/">Apri l’app modificabile →</a></p></div>
      <div className="layout">
        <aside aria-label="Indice dei compagni"><div className="side-title"><h2>Compagni</h2><span>{people.length}</span></div>
          <nav>{people.map(p => <a key={p.id} className="person static-link" href={'#' + p.id}>
            <span className="initials">{initials(p.name)}</span>{p.name}</a>)}</nav>
        </aside>
        <div className="static-list">{people.map(p => <Person key={p.id} person={p} />)}</div>
      </div>
    </main>
    <footer className="projects-footer">
      <a href="https://links-page-bennibeni.vercel.app/">← ALL LINKS</a>
      <span>Archivio di classe · copia statica</span>
    </footer>
  </>;
}

createRoot(document.getElementById('root')).render(<Page />);
