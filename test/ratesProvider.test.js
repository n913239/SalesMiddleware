const { test } = require("node:test")
const assert = require("node:assert/strict")
const { createRatesProvider } = require("../ratesProvider")

function okResponse(data) {
  return { ok: true, json: async () => data }
}

test("caches the upstream response within the TTL", async () => {
  let calls = 0
  const provider = createRatesProvider({
    url: "https://x",
    ttlMs: 1000,
    now: () => 0,
    fetchImpl: async () => { calls += 1; return okResponse([{ from: "EUR", to: "USD", rate: 1.18 }]) },
  })

  await provider.getRates()
  await provider.getRates()

  assert.equal(calls, 1)
})

test("refetches after the TTL expires", async () => {
  let calls = 0
  let clock = 0
  const provider = createRatesProvider({
    url: "https://x",
    ttlMs: 1000,
    now: () => clock,
    fetchImpl: async () => { calls += 1; return okResponse([]) },
  })

  await provider.getRates()
  clock = 1500
  await provider.getRates()

  assert.equal(calls, 2)
})

test("throws UPSTREAM_UNAVAILABLE on a non-ok response", async () => {
  const provider = createRatesProvider({
    url: "https://x",
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  })

  await assert.rejects(provider.getRates(), (error) => error.code === "UPSTREAM_UNAVAILABLE")
})

test("throws UPSTREAM_UNAVAILABLE when the fetch rejects (network/timeout)", async () => {
  const provider = createRatesProvider({
    url: "https://x",
    fetchImpl: async () => { throw new Error("network down") },
  })

  await assert.rejects(provider.getRates(), (error) => error.code === "UPSTREAM_UNAVAILABLE")
})
