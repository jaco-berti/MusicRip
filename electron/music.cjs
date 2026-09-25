const { spawn, execFileSync } = require('node:child_process')
const path = require('node:path')
const { existsSync } = require('node:fs')
const { EventEmitter } = require('node:events')
const { PlaybackClock } = require('./playback-clock.cjs')

const API_KEY = ''

class MusicPlayer extends EventEmitter {
  constructor(binaryDir, { volume = 100 } = {}) {
    super()
    this.binaryDir = binaryDir
    this.volume = volume
    this.children = new Set()
    this.generation = 0
    this.request = null
    this.track = null
    this.position = 0
    this.playback = null
    this.paused = false
    this.loop = false
    this.queue = []
  }

  emitQueueState() {
    this.emit('queue', {
      queue: this.queue.map(item => ({
        title: item.title,
        thumbnail: item.thumbnail,
        duration: item.duration,
        query: item.query,
      })),
    })
  }

  terminate(child) {
    if (!child?.pid || child.exitCode !== null) return
    try {
      if (process.platform === 'win32') {
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true, stdio: 'pipe', timeout: 5000,
        })
      } else child.kill('SIGTERM')
    } catch { child.kill() }
  }

  publish(status) {
    const { title, thumbnail, duration } = this.track || {}
    this.emit('state', { status, title, thumbnail, duration, position: this.position })
  }

  togglePause() {
    if (!this.track) return
    if (this.paused) {
      this.paused = false
      this.startPlayback()
    } else if (this.playback) {
      const child = this.playback
      this.playback = null
      this.paused = true
      this.terminate(child)
      this.publish('paused')
    }
  }

  async searchTrack(query) {
    if (typeof query !== 'string' || !query.trim() || query.length > 500) {
      throw new Error('Inserisci un titolo o un artista (massimo 500 caratteri).')
    }

    const generation = this.generation
    const current = () => generation === this.generation
    const request = new AbortController()
    this.request = request
    const params = new URLSearchParams({
      key: API_KEY, q: query.trim(), part: 'snippet', type: 'video', maxResults: '1',
    })
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error?.message || 'Ricerca YouTube non disponibile.')
    const videoId = result.items?.[0]?.id?.videoId
    if (!videoId) throw new Error('Nessun brano trovato.')
    if (!current()) return null

    const info = await new Promise((resolve, reject) => {
      const child = this.launch('yt-dlp', [
        '--ignore-config', '--no-playlist', '--no-warnings',
        '--socket-timeout', '15', '--retries', '2',
        '--js-runtimes', `node:${process.execPath}`,
        '--dump-single-json', '--skip-download', '-f', 'bestaudio',
        '--', `https://www.youtube.com/watch?v=${videoId}`,
      ])
      let output = ''
      const timer = setTimeout(() => {
        if (current()) this.emit('state', { status: 'error', message: 'YouTube non ha risposto in tempo. Riprova.' })
        reject(new Error('YouTube non ha risposto in tempo. Riprova.'))
      }, 60000)
      child.stdout.on('data', data => { output += data })
      child.stderr.resume()
      child.once('error', () => { clearTimeout(timer); reject(new Error('Impossibile avviare yt-dlp.')) })
      child.once('close', code => {
        clearTimeout(timer)
        if (code !== 0) return reject(new Error('yt-dlp non riesce a ottenere lo stream di questo brano.'))
        try { resolve(JSON.parse(output)) } catch { reject(new Error('Risposta yt-dlp non valida.')) }
      })
    })
    if (!current()) return null
    if (!info.url || !/^https?:\/\//.test(info.url)) throw new Error('Nessuno stream audio disponibile.')
    const headers = Object.entries(info.http_headers || {})
      .filter(([key, value]) => !/[\r\n]/.test(key + value))
      .map(([key, value]) => `${key}: ${value}\r\n`).join('')
    return {
      title: info.title || 'Riproduzione',
      url: info.url,
      headers,
      duration: Number(info.duration) || 0,
      thumbnail: result.items[0].snippet?.thumbnails?.high?.url || info.thumbnail || '',
      query,
    }
  }

  startPlayback() {
    const track = this.track
    if (!track) return
    const clock = new PlaybackClock(this.position)
    const seek = this.position > 0 ? ['-ss', String(this.position)] : []
    const child = this.launch('ffplay', [
      '-nodisp', '-autoexit', '-hide_banner', '-loglevel', 'info', '-stats',
      '-volume', String(this.volume), '-headers', track.headers, ...seek, '-i', track.url,
    ])
    this.playback = child
    this.publish('buffering')
    child.stdout.resume()
    let started = false
    let pending = ''
    let lastUpdate = 0
    child.stderr.on('data', data => {
      if (this.playback !== child) return
      pending += data.toString()
      const lines = pending.split(/[\r\n]/)
      pending = lines.pop().slice(-2048)
      for (const line of lines) {
        const match = /^\s*(\d+\.\d+)\s+(?:M-A|A-V):/.exec(line)
        if (!match) continue
        this.position = clock.update(Number(match[1]))
        if (track.duration) this.position = Math.min(this.position, track.duration)
        if (!started || Date.now() - lastUpdate >= 250) {
          started = true
          lastUpdate = Date.now()
          this.publish('playing')
        }
      }
    })
    child.once('error', () => {
      if (this.playback === child) {
        this.playback = null
        this.emit('state', { status: 'error', message: 'Impossibile avviare FFplay.' })
      }
    })
    child.once('close', code => {
      if (this.playback !== child) return
      this.playback = null
      const currentTrack = this.track
      if (code === 0 && started) {
        if (this.loop && currentTrack) {
          this.position = 0
          this.emit('state', { status: 'playing', title: currentTrack.title, thumbnail: currentTrack.thumbnail, duration: currentTrack.duration, position: this.position })
          this.startPlayback()
          return
        }
        if (this.queue.length) {
          const nextTrack = this.queue.shift()
          this.emitQueueState()
          this.playQueuedTrack(nextTrack)
          return
        }
        this.track = null
        this.emit('state', { status: 'ended' })
        return
      }
      this.emit('state', { status: 'error', message: 'FFplay non riesce a riprodurre questo stream.' })
    })
  }

  binary(name) {
    const executable = path.join(this.binaryDir, process.platform === 'win32' ? `${name}.exe` : name)
    if (!existsSync(executable)) throw new Error(`Manca ${name} nella cartella degli strumenti audio.`)
    return executable
  }

  launch(name, args) {
    const child = spawn(this.binary(name), args, {
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    })
    this.children.add(child)
    const forget = () => this.children.delete(child)
    child.once('error', forget)
    child.once('exit', forget)
    return child
  }

  stop() {
    this.generation++
    this.request?.abort()
    this.request = null
    this.playback = null
    this.track = null
    this.position = 0
    this.paused = false
    for (const child of this.children) {
      this.terminate(child)
    }
    this.children.clear()
    this.emit('state', { status: 'stopped' })
  }

  setLoop(enabled) {
    this.loop = Boolean(enabled)
    this.emit('loop', { enabled: this.loop })
  }

  clearQueue() {
    this.queue = []
    this.emitQueueState()
  }

  queueTrack(track) {
    if (!track || !track.title || !track.url) return
    this.queue.push({
      title: track.title,
      thumbnail: track.thumbnail || '',
      duration: Number(track.duration) || 0,
      url: track.url,
      headers: track.headers || '',
      query: track.query || track.title,
    })
    this.emitQueueState()
  }

  async queueQuery(query) {
    const track = await this.searchTrack(query)
    if (!track) return null
    this.queueTrack(track)
    return track
  }

  async play(query, options = {}) {
    if (typeof query !== 'string' || !query.trim() || query.length > 500) {
      throw new Error('Inserisci un titolo o un artista (massimo 500 caratteri).')
    }
    if (options.queueOnly) return this.queueQuery(query)

    const activeTrack = this.track
    if (activeTrack && (this.playback || this.paused || this.position > 0 || this.request)) {
      const queuedTrack = await this.searchTrack(query)
      if (!queuedTrack) return null
      this.queueTrack(queuedTrack)
      return { title: queuedTrack.title, queued: true }
    }

    this.stop()
    const track = await this.searchTrack(query)
    if (!track) return null
    this.track = track
    this.position = 0
    this.paused = false
    this.startPlayback()
    return { title: track.title }
  }

  async playQueuedTrack(track) {
    if (!track || !track.url) return
    this.track = { ...track, query: track.query || track.title }
    this.position = 0
    this.paused = false
    this.startPlayback()
    this.publish('playing')
  }

  async nextFromQueue() {
    if (this.playback) {
      const child = this.playback
      this.playback = null
      this.terminate(child)
    }

    if (this.queue.length) {
      const nextTrack = this.queue.shift()
      this.emitQueueState()
      await this.playQueuedTrack(nextTrack)
      return true
    }
    if (this.loop && this.track) {
      this.position = 0
      this.startPlayback()
      return true
    }
    this.stop()
    return false
  }
}

module.exports = { MusicPlayer }
