const { createApp } = require("./app")
const { createRatesProvider } = require("./ratesProvider")

const UPSTREAM_RATES_URL = "https://ile-b2p4.essentialdeveloper.com/rates"
const PORT = process.env.PORT || 3000

const ratesProvider = createRatesProvider({ url: UPSTREAM_RATES_URL })
const app = createApp({ getRates: ratesProvider.getRates })

app.listen(PORT, () => {
  console.log(`Sales middleware listening on port ${PORT}`)
})
