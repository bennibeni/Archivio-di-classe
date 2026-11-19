# Archivio di classe

App React locale per gestire un elenco di compagni e valutare le fonti web.

## Avvio

In PowerShell, nella cartella del progetto:

    npm ci
    npm run dev

Apri http://127.0.0.1:5188/. Per compilare l'app usa npm run build e per aprire la compilazione usa npm run preview.

L'archivio è salvato nel browser, per questo indirizzo. Usa sempre lo stesso browser e indirizzo. Se cancelli i dati del sito, perdi le modifiche. Le pagine scartate sono conservate come esclusioni e non compaiono nelle viste né quando ritornano fra i risultati di ricerca.

## Ricerca web

Per mostrare i risultati di Brave Search nell'app, copia .env.example in .env.local, inserisci la tua chiave in BRAVE_SEARCH_API_KEY e riavvia l'app. La chiave rimane nel server locale. Brave riceve il nome e le parole chiave solo quando avvii la ricerca.

Le proposte di Brave restano in memoria. Si cancellano quando chiudi i risultati, cambi scheda, avvii un'altra ricerca o ricarichi l'app. Nascondere una proposta ha effetto solo sulla ricerca corrente.

Per archiviare una fonte, apri la pagina originale e inserisci il suo indirizzo con Aggiungi un link. Ogni nuova fonte entra in Da valutare. Dopo aver scelto Certa, puoi annotare le informazioni che hai verificato. Le fonti archiviate come Errata restano escluse dalle ricerche successive.

Senza chiave, usa Apri ricerca su Google. Le versioni precedenti salvavano anche i risultati automatici e non indicavano la provenienza delle singole fonti.

## Pagina privata della classe

La pagina privato/classe-1979.html contiene dati personali (recapiti, indirizzi, date di nascita). La cartella privato/ è esclusa da git, quindi la pagina non arriva su GitHub né su Vercel. Si apre solo in locale con npm run dev, all'indirizzo http://127.0.0.1:5188/privato/classe-1979.html, oppure con il link nel piè di pagina dell'app (visibile solo in locale).

## Pagina pubblica della classe

La pagina public/classe-1979.html è la copia pubblicabile, senza recapiti, indirizzi, date di nascita e senza i profili da confermare. Va online con l'app all'indirizzo /classe-1979.html. Se aggiorni la versione privata, rigenera anche questa senza dati personali.
