/**
 * In-Memory TTL Cache Service
 * Eliminates slow external API calls by caching responses server-side.
 * No external dependencies (no Redis needed).
 */

class MemoryCache {
  constructor() {
    /** @type {Map<string, { data: any, expiresAt: number }>} */
    this.store = new Map();

    // Cleanup expired entries every 60 seconds
    this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
  }

  /**
   * Get cached data if it hasn't expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Set data with a TTL (in seconds)
   * @param {string} key
   * @param {any} data
   * @param {number} ttlSeconds
   */
  set(key, data, ttlSeconds) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Check if a valid (non-expired) entry exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   * @param {string} key
   */
  delete(key) {
    this.store.delete(key);
  }

  /** Remove all expired entries */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Destroy the cache and stop cleanup interval */
  destroy() {
    clearInterval(this._cleanupInterval);
    this.store.clear();
  }
}

// Singleton instance
const cache = new MemoryCache();

export default cache;
