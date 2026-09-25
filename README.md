# MusicRip

Applicazione desktop con interfaccia Vue 3, Vite ed Electron.

## Sviluppo

```powershell
npm run dev
```

Avvia Vite e apre la finestra Electron. L'interfaccia si aggiorna al salvataggio dei file in `src`.

## Comandi

- `npm run build` genera la build web in `dist`.
- `npm run package` crea l'installer Windows in `release`.

Il processo Electron è in `electron/main.cjs`; l'API esposta alla UI passa da `electron/preload.cjs` con context isolation attivo.

## Riproduzione audio

La ricerca usa la chiave YouTube Data API già configurata in `electron/music.cjs`.
Il processo principale avvia `vendor/yt-dlp.exe` (versione Windows standalone)
per ottenere lo stream e passa URL e header a `vendor/ffplay.exe`.
Non vengono eseguiti script Python e non occorre installare Python separatamente.
Questi strumenti vengono inclusi nelle risorse esterne dell'installer.

Stop, nuova ricerca e chiusura dell'app terminano i processi appartenenti al lettore.
Le finestre console sono nascoste. Gli errori di ricerca e riproduzione sono mostrati nella home.
Il vecchio `stream_ytaudio.py` è conservato come riferimento, ma non viene usato.

`npm run test:audio` esegue un test online con audio silenziato: ricerca, avvio di FFplay
e verifica della terminazione dei processi. Consuma una richiesta di ricerca YouTube.
Gli strumenti in `vendor` sono per Windows x64; per altre piattaforme servono binari compatibili.
