# MusicRip

Desktop application built with Vue 3, Vite, and Electron.

## Development

```powershell
npm run dev
```

Starts Vite and opens the Electron window. The interface automatically updates when files in `src` are saved.

## Commands

- `npm run build` generates the web build in `dist`.
- `npm run package` creates the Windows installer in `release`.

The Electron main process is located in `electron/main.cjs`; the API exposed to the UI is provided through `electron/preload.cjs`, with context isolation enabled.

## Audio Playback

Search uses the YouTube Data API key already configured in `electron/music.cjs`.

The main process launches `vendor/yt-dlp.exe` (Windows standalone version) to retrieve the audio stream and passes the URL and headers to `vendor/ffplay.exe`.

No Python scripts are executed, and Python does not need to be installed separately. These tools are included as external resources in the installer.

Stopping playback, starting a new search, or closing the application terminates the processes associated with the player.

Console windows are hidden. Search and playback errors are displayed on the home screen.

The old `stream_ytaudio.py` file is kept for reference but is no longer used.

`npm run test:audio` runs an online test with audio muted: it performs a search, starts FFplay, and verifies that the processes are terminated correctly. The test consumes one YouTube search request.

The tools in `vendor` are built for Windows x64; other platforms require compatible binaries.
I removed the `vendor` folder, which contained the `ffplay.exe` and `yt-dlp.exe` programs.
