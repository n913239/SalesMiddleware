function createRatesProvider({
  url,
  fetchImpl = fetch,
  ttlMs = 60_000,
  timeoutMs = 8_000,
  now = Date.now,
}) {
  let cache = null // { rates, expiresAt }

  async function getRates() {
    if (cache && now() < cache.expiresAt) {
      return cache.rates
    }
    const rates = await fetchUpstream()
    cache = { rates, expiresAt: now() + ttlMs }
    return rates
  }

  async function fetchUpstream() {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(url, { signal: controller.signal })
      if (!response.ok) throw upstreamUnavailable()
      return await response.json()
    } catch (error) {
      if (error && error.code === "UPSTREAM_UNAVAILABLE") throw error
      throw upstreamUnavailable()
    } finally {
      clearTimeout(timer)
    }
  }

  return { getRates }
}

function upstreamUnavailable() {
  const error = new Error("Upstream rates unavailable")
  error.code = "UPSTREAM_UNAVAILABLE"
  return error
}

module.exports = { createRatesProvider }
