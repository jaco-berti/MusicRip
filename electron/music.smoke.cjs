// Online integration check: uses one YouTube search and plays silently.
const assert = require('node:assert/strict')
const path = require('node:path')
const { MusicPlayer } = require('./music.cjs')
const player = new MusicPlayer(path.join(__dirname, '..', 'vendor'), { volume: 0 })
const timer = setTimeout(() => {
  player.stop()
  console.error('FAIL: playback timed out')
  process.exit(1)
}, 90000)

async function check() {
  const playing = new Promise((resolve, reject) => {
    player.on('state', state => {
      console.log('Audio state:', state.status, state.position ?? '')
      if (state.status === 'playing') resolve()
      if (state.status === 'error') reject(new Error(state.message))
    })
  })
  await Promise.all([player.play('Beethoven Moonlight Sonata'), playing])
  await new Promise(resolve => setTimeout(resolve, 5000))
  assert.ok(player.position > 2, 'Clock must advance during playback')
  assert.ok(player.track.thumbnail, 'Track must include artwork')
  assert.ok(player.track.duration > 0, 'Track must include duration')
  player.togglePause()
  assert.equal(player.paused, true)
  const pausedAt = player.position
  await new Promise(resolve => setTimeout(resolve, 1000))
  assert.equal(player.position, pausedAt, 'Clock must remain frozen while paused')
  const resumed = new Promise(resolve => {
    const listener = state => {
      if (state.status === 'playing') { player.off('state', listener); resolve() }
    }
    player.on('state', listener)
  })
  player.togglePause()
  await resumed
  await new Promise(resolve => setTimeout(resolve, 2000))
  assert.ok(player.position > pausedAt + 0.5, 'Clock must advance from the saved position')
  assert.ok(player.position < pausedAt + 5, 'Resume must not jump ahead')
  const children = [...player.children]
  assert.ok(children.length > 0, 'FFplay must still be running')
  player.stop()
  await new Promise(resolve => setTimeout(resolve, 500))
  for (const child of children) {
    assert.throws(() => process.kill(child.pid, 0), 'Owned child must exit after stop')
  }
  console.log('PASS: artwork, duration, clock, pause/resume and process termination')
}

const electronApp = process.versions.electron ? require('electron').app : null
electronApp?.on('before-quit', () => player.stop())
Promise.resolve(electronApp?.whenReady()).then(check).catch(error => {
  console.error(error.message)
  process.exitCode = 1
}).finally(() => {
  clearTimeout(timer)
  player.stop()
  electronApp?.exit(process.exitCode || 0)
})
