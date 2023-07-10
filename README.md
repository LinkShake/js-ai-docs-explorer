# AI Docs Explorer

## Descrizione del progetto

Il progetto in questione va ad integrare l’api di ChatGPT con Cognitive Search, per poter realizzare una chatbot in cui l’utente è in grado di porre all’AI delle domande circa la documentazione per lui disponibile (basandosi sul suo Id utente) riguardante sia il funzionamento del software Silwa sia della documentazione specifica per cliente.
In questo modo l’utente è in grado di ricevere una risposta, ricca e dettagliata, e in linguaggio naturale, senza che esso debba tentare di comprendere dati di Cognitive o oggetti json.

## Struttura dell'applicazione

L’applicazione si compone di diversi moduli:

- [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs/) dove vengono hostati i PDF da indicizzare
- [Azure Cognitive Search](https://azure.microsoft.com/en-us/products/search/?ef_id=_k_Cj0KCQjw756lBhDMARIsAEI0AgmIXocy1vZ86PghPU2Cp6E52UmvZ-kDmBw_sj0--KU4KVRpMKQ392QaAnZoEALw_wcB_k_&OCID=AIDcmmy6frl1tq_SEM__k_Cj0KCQjw756lBhDMARIsAEI0AgmIXocy1vZ86PghPU2Cp6E52UmvZ-kDmBw_sj0--KU4KVRpMKQ392QaAnZoEALw_wcB_k_&gclid=Cj0KCQjw756lBhDMARIsAEI0AgmIXocy1vZ86PghPU2Cp6E52UmvZ-kDmBw_sj0--KU4KVRpMKQ392QaAnZoEALw_wcB) che, collegato al BLOB Storage, riesce a ricercare dati indicizzati
- [Azure SQL](https://azure.microsoft.com/en-us/products/azure-sql) dove si trova la tabella di associazione UserId -> IndexId (in cui ogni IndexId corrisponde ad un indice del servizio Cognitive di Microsoft)
- [Next.js](https://nextjs.org/) frontend
- askChatGPT api: [socket](https://socket.io/) server che fa le richieste a ChatGPT
- Silwa api: [Fastify](https://fastify.io/) endpoint per fare query a Cognitive e Azure SQL

## Struttura della repo

| Folder                            | Functionality    |
| --------------------------------- | ---------------- |
| [api/askChatGPT](api/askChatGPT/) | socket server    |
| [api/Silwa](api/Silwa/)           | Fastify endpoint |
| [client](client)                  | Next.js frontend |

## Funzionamento dell'applicazione

- Quando l’utente raggiunge il sito dell’applicazione, viene richiesto il login

- Dopo l’autenticazione il client fa subito un fetch della Silwa api per poter ottenere tutti i possibili indici a lui associati in Cognitive Search

- Una volta fatto ciò l’utente è libero di fare le query a ChatGPT per richiedere chiarimenti/informazioni su varie parti della documentazione
- Quando ciò avviene il client instaura una connessione socket con askChatGPT api fornendo la query e i possibili indici associati all’utente stesso

- Ora il socket server fa una chiamata alla api di Silwa per ogni possibile indice così da avere i dati da inserire nella query a ChatGPT
- L’endpoint di Silwa prima di tutto fa uno stemming della query in linguaggio naturale e rimuove le stopping words; dopo aver fatto ciò fa una query a Cognitive Search e si comporta in due possibili modi diversi: se ottiene dei dati li manda come risposta al socket server, altrimenti rifà l’intero processo senza però lo stemming della query; se, una volta fatto ciò, trova dati allora li invia come risposta altrimenti rifà per un’ultima volta la ricerca con la query originale in linguaggio naturale

- Prima di poter fare la richiesta a ChatGPT il socket server controlla che la query interpolata con i dati non ecceda il numero massimo di token per il modello di GPT selezionato dall’utente e, nel caso, riduce i dati da utilizzare fino a che non rientra nel limite; inoltre la richiesta dell’utente viene inserita in un array (aggiornato ad ogni chiamata) che permette all’AI di avere una history della chat

- Fatto ciò tutto è pronto per fare la chiamata a ChatGPT e procedere con lo streaming dei dati al client che li vedrà arrivare non appena disponibili, facendo un update della UI fino a che non trova un messaggio di stop (nel nostro caso “[DONE]”): quando ciò avviene, nel socket server, anche la risposta di ChatGPT viene inserita nell’array
