// FFplay timestamps may start at zero or at the seek position, depending on
// the stream. Accumulate differences, never add an absolute timestamp twice.
class PlaybackClock {
  constructor(position = 0) {
    this.position = position
    this.previous = null
    this.updatedAt = null
  }

  update(timestamp, now = performance.now()) {
    if (!Number.isFinite(timestamp)) return this.position
    if (this.previous !== null) {
      const delta = timestamp - this.previous
      const elapsed = Math.max(0, (now - this.updatedAt) / 1000)
      // Rebase discontinuities at startup/seek without jumping the UI clock.
      if (delta >= 0 && delta <= elapsed + 0.5) this.position += delta
    }
    this.previous = timestamp
    this.updatedAt = now
    return this.position
  }
}

module.exports = { PlaybackClock }
