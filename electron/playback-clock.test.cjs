const { test } = require('node:test')
const assert = require('node:assert/strict')
const { PlaybackClock } = require('./playback-clock.cjs')

test('resume handles both relative and absolute FFplay timestamps', () => {
  for (const initialTimestamp of [0, 120]) {
    const clock = new PlaybackClock(120)
    assert.equal(clock.update(initialTimestamp, 0), 120)
    assert.equal(clock.update(initialTimestamp + 1, 1000), 121)
    assert.equal(clock.update(initialTimestamp + 2, 2000), 122)
  }
})

test('startup discontinuities do not double the seek position', () => {
  const clock = new PlaybackClock(120)
  clock.update(0, 0)
  assert.equal(clock.update(120, 50), 120)
  assert.equal(clock.update(121, 1050), 121)
})

test('multiple resumes and a frozen audio clock do not count paused time', () => {
  let position = 30
  for (let i = 0; i < 3; i++) {
    const clock = new PlaybackClock(position)
    clock.update(position, 0)
    assert.equal(clock.update(position, 10000), position)
    position = clock.update(position + 1, 11000)
  }
  assert.equal(position, 33)
})
