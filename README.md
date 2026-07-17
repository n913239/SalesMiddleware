# Sales Middleware

A small backend API that exposes **direct currency-to-USD conversion rates**, computed from
an upstream `/rates` feed that only provides *some* pairwise rates. The conversion logic
lives here so every client app (iOS, Android, Web) shares one implementation.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/rates` | `[{ "from": "<currency>", "to": "USD", "rate": <number> }]` — a direct USD rate for every currency reachable from the upstream graph. |
| GET | `/health` | `{ "status": "ok" }` — liveness probe. |

## How the conversion works

The upstream feed returns pairwise rates (e.g. `GBP→EUR`, `EUR→USD`) but not every
currency has a direct `→USD` rate. We build a bidirectional graph (each pair `a→b` at
`rate` also gives `b→a` at `1/rate`) and run **a single traversal starting from USD**:
for an edge `u → n` with rate `e`, `rateToUSD[n] = rateToUSD[u] / e`. One pass computes
every reachable currency's USD rate in `O(V + E)` and supports **any number of conversion
steps** (e.g. `GBP → EUR → USD`). Full floating-point precision is preserved; rounding is
left to each client's display layer.

Malformed upstream entries (missing fields, non-positive or non-finite rates) are skipped,
and currencies with no path to USD are omitted.

## Running locally

```bash
npm install
npm start     # serves on http://localhost:3000
npm test      # node:test unit + route tests
```

## Reliability

`/rates` caches the upstream response with a short TTL and times out the upstream fetch
(via `AbortController`), so a slow or failing upstream does not hang or overload the
middleware. Upstream failures return `502`; unexpected errors return `500`.

## Deployment

Deployed on Render (`render.yaml` included). `engines.node >= 20` is required for the
built-in `fetch` and `node:test` runner.
