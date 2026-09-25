const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('node:path')
const { MusicPlayer } = require('./music.cjs')
const { searchLyrics, fetchLyrics } = require('./genius.cjs')

const isDevelopment = !app.isPackaged
app.setName('MusicRip')
const player = new MusicPlayer(path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'vendor'))

function createWindow() {
  const iconPath = path.join(
    app.isPackaged ? app.getAppPath() : process.cwd(),
    app.isPackaged ? 'dist/icon.png' : 'public/icon.png',
  )
  const window = new BrowserWindow({
    title: 'MusicRip',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDevelopment) {
    window.loadURL('http://localhost:5173')
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  window.on('closed', () => app.quit())
  const update = state => {
    if (!window.isDestroyed()) window.webContents.send('audio-state', state)
  }
  const queueUpdate = state => {
    if (!window.isDestroyed()) window.webContents.send('queue', state)
  }
  player.on('state', update)
  player.on('queue', queueUpdate)
  player.on('loop', queueUpdate)
  window.on('closed', () => {
    player.off('state', update)
    player.off('queue', queueUpdate)
    player.off('loop', queueUpdate)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  ipcMain.handle('play-audio', (_event, query, options) => player.play(query, options || {}))
  ipcMain.handle('stop-audio', () => player.stop())
  ipcMain.handle('toggle-pause-audio', () => player.togglePause())
  ipcMain.handle('toggle-loop-audio', () => {
    player.setLoop(!player.loop)
    return player.loop
  })
  ipcMain.handle('queue-audio', (_event, track) => {
    player.queueTrack(track)
    return player.queue.length
  })
  ipcMain.handle('next-audio', () => player.nextFromQueue())
  ipcMain.handle('search-genius-lyrics', (_event, query) => searchLyrics(query))
  ipcMain.handle('fetch-genius-lyrics', (_event, url) => fetchLyrics(url))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => player.stop())
