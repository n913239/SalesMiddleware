const express = require("express")
const cors = require("cors")
const { convertToUSD } = require("./convertToUSD")

function createApp({ getRates }) {
  const app = express()
  app.use(cors())

  app.get("/health", (req, res) => {
    res.json({ status: "ok" })
  })

  app.get("/rates", async (req, res) => {
    try {
      const rates = await getRates()
      res.json(convertToUSD(rates))
    } catch (error) {
      if (error && error.code === "UPSTREAM_UNAVAILABLE") {
        res.status(502).json({ error: "Failed to fetch rates from upstream." })
      } else {
        res.status(500).json({ error: "Internal server error." })
      }
    }
  })

  return app
}

module.exports = { createApp }
