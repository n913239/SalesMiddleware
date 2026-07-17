const { test } = require("node:test")
const assert = require("node:assert/strict")
const { convertToUSD } = require("../convertToUSD")

function rateFor(result, currency) {
  return result.find((entry) => entry.from === currency)?.rate
}

function assertClose(actual, expected, message) {
  assert.ok(actual !== undefined, `${message}: missing rate`)
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: got ${actual}, expected ${expected}`)
}

test("direct rate to USD is returned as-is", () => {
  const result = convertToUSD([{ from: "EUR", to: "USD", rate: 1.18 }])
  assertClose(rateFor(result, "EUR"), 1.18, "EUR")
})

test("reverse edge: USD -> X yields X -> USD as 1/rate", () => {
  const result = convertToUSD([{ from: "USD", to: "JPY", rate: 108 }])
  assertClose(rateFor(result, "JPY"), 1 / 108, "JPY")
})

test("multi-step conversion multiplies along the path", () => {
  const result = convertToUSD([
    { from: "GBP", to: "EUR", rate: 1.12 },
    { from: "EUR", to: "USD", rate: 1.18 },
  ])
  assertClose(rateFor(result, "EUR"), 1.18, "EUR")
  assertClose(rateFor(result, "GBP"), 1.12 * 1.18, "GBP")
})

test("supports an arbitrary number of conversion steps", () => {
  const result = convertToUSD([
    { from: "A", to: "B", rate: 2 },
    { from: "B", to: "C", rate: 3 },
    { from: "C", to: "USD", rate: 5 },
  ])
  assertClose(rateFor(result, "A"), 2 * 3 * 5, "A")
  assertClose(rateFor(result, "B"), 3 * 5, "B")
  assertClose(rateFor(result, "C"), 5, "C")
})

test("currencies with no path to USD are excluded", () => {
  const result = convertToUSD([
    { from: "EUR", to: "USD", rate: 1.18 },
    { from: "AAA", to: "BBB", rate: 2 },
  ])
  assert.equal(rateFor(result, "AAA"), undefined)
  assert.equal(rateFor(result, "BBB"), undefined)
  assertClose(rateFor(result, "EUR"), 1.18, "EUR")
})

test("USD itself is never included in the result", () => {
  const result = convertToUSD([{ from: "EUR", to: "USD", rate: 1.18 }])
  assert.equal(rateFor(result, "USD"), undefined)
})

test("empty input yields an empty result", () => {
  assert.deepEqual(convertToUSD([]), [])
})

test("non-array input throws", () => {
  assert.throws(() => convertToUSD({}), /array/)
  assert.throws(() => convertToUSD(null), /array/)
})

test("malformed entries are skipped, valid ones still resolve", () => {
  const result = convertToUSD([
    { from: "EUR", to: "USD", rate: 1.18 },
    { from: "A", to: "USD" },              // missing rate
    { from: "B", to: "USD", rate: 0 },     // non-positive
    { from: "C", to: "USD", rate: -3 },    // negative
    { from: "", to: "USD", rate: 2 },      // empty code
    { from: "D", to: "USD", rate: "5" },   // non-number
  ])
  assertClose(rateFor(result, "EUR"), 1.18, "EUR")
  for (const bad of ["A", "B", "C", "D", ""]) {
    assert.equal(rateFor(result, bad), undefined, `${bad} should be skipped`)
  }
})

test("never emits a non-finite rate", () => {
  const result = convertToUSD([{ from: "EUR", to: "USD", rate: 1.18 }])
  for (const entry of result) {
    assert.ok(Number.isFinite(entry.rate) && entry.rate > 0)
  }
})

test("preserves full precision for very small rates (no premature rounding)", () => {
  const result = convertToUSD([{ from: "USD", to: "IDR", rate: 16000 }])
  assertClose(rateFor(result, "IDR"), 1 / 16000, "IDR")
  assert.notEqual(rateFor(result, "IDR"), 0.0001) // would be the 4-decimal-rounded (wrong) value
})

test("all output entries target USD", () => {
  const result = convertToUSD([
    { from: "GBP", to: "EUR", rate: 1.12 },
    { from: "EUR", to: "USD", rate: 1.18 },
  ])
  assert.ok(result.length > 0)
  for (const entry of result) {
    assert.equal(entry.to, "USD")
  }
})
