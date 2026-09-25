const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  playAudio: (query, options) => ipcRenderer.invoke('play-audio', query, options),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  togglePauseAudio: () => ipcRenderer.invoke('toggle-pause-audio'),
  toggleLoopAudio: () => ipcRenderer.invoke('toggle-loop-audio'),
  queueAudio: (track) => ipcRenderer.invoke('queue-audio', track),
  nextAudio: () => ipcRenderer.invoke('next-audio'),
  searchGeniusLyrics: (query) => ipcRenderer.invoke('search-genius-lyrics', query),
  fetchGeniusLyrics: (url) => ipcRenderer.invoke('fetch-genius-lyrics', url),
  onAudioState: (callback) => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('audio-state', listener)
    return () => ipcRenderer.removeListener('audio-state', listener)
  },
  onQueueState: (callback) => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('queue', listener)
    return () => ipcRenderer.removeListener('queue', listener)
  },
})
