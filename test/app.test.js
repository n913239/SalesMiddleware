const { test } = require("node:test")
const assert = require("node:assert/strict")
const { createApp } = require("../app")

async function withServer(getRates, run) {
  const app = createApp({ getRates })
  const server = app.listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    await run(base)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

test("GET /rates returns the converted USD rates", async () => {
  await withServer(async () => [{ from: "EUR", to: "USD", rate: 1.18 }], async (base) => {
    const res = await fetch(`${base}/rates`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), [{ from: "EUR", to: "USD", rate: 1.18 }])
  })
})

test("GET /rates returns 502 when the upstream is unavailable", async () => {
  const getRates = async () => {
    const error = new Error("upstream down")
    error.code = "UPSTREAM_UNAVAILABLE"
    throw error
  }
  await withServer(getRates, async (base) => {
    const res = await fetch(`${base}/rates`)
    assert.equal(res.status, 502)
  })
})

test("GET /rates returns 500 on an unexpected error", async () => {
  await withServer(async () => { throw new Error("boom") }, async (base) => {
    const res = await fetch(`${base}/rates`)
    assert.equal(res.status, 500)
  })
})

test("GET /health returns ok", async () => {
  await withServer(async () => [], async (base) => {
    const res = await fetch(`${base}/health`)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { status: "ok" })
  })
})

test("responses include a CORS header", async () => {
  await withServer(async () => [], async (base) => {
    const res = await fetch(`${base}/rates`)
    assert.equal(res.headers.get("access-control-allow-origin"), "*")
  })
})
