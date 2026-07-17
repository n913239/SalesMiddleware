function convertToUSD(rates) {
  if (!Array.isArray(rates)) {
    throw new Error("rates must be an array")
  }

  const graph = buildGraph(rates)
  const rateToUSD = ratesToUSDFrom("USD", graph)

  const result = []
  for (const currency of Object.keys(rateToUSD)) {
    if (currency === "USD") continue
    const rate = rateToUSD[currency]
    if (Number.isFinite(rate) && rate > 0) {
      result.push({ from: currency, to: "USD", rate })
    }
  }
  return result
}

function buildGraph(rates) {
  const graph = {}
  const addEdge = (from, to, rate) => {
    if (!graph[from]) graph[from] = []
    graph[from].push({ currency: to, rate })
  }

  for (const entry of rates) {
    if (!isValidEntry(entry)) continue
    addEdge(entry.from, entry.to, entry.rate)
    addEdge(entry.to, entry.from, 1 / entry.rate)
  }
  return graph
}

function isValidEntry(entry) {
  return Boolean(entry)
    && typeof entry.from === "string" && entry.from.length > 0
    && typeof entry.to === "string" && entry.to.length > 0
    && typeof entry.rate === "number" && Number.isFinite(entry.rate) && entry.rate > 0
}

// Single traversal from USD computes every currency's rate to USD at once (O(V+E)).
// 1 unit of `n` equals rateToUSD[n] USD. For a graph edge u -> n with rate e
// (meaning 1 u = e n), 1 n = (1/e) u, so rateToUSD[n] = rateToUSD[u] / e.
function ratesToUSDFrom(start, graph) {
  const rateToUSD = {}
  if (!graph[start]) return rateToUSD

  rateToUSD[start] = 1
  const queue = [start]
  while (queue.length > 0) {
    const current = queue.shift()
    for (const edge of graph[current]) {
      if (!(edge.currency in rateToUSD)) {
        rateToUSD[edge.currency] = rateToUSD[current] / edge.rate
        queue.push(edge.currency)
      }
    }
  }
  return rateToUSD
}

module.exports = { convertToUSD }
