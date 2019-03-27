<!-- This README.md template is adapted from PurpleBooth's GitHub Gist https://gist.github.com/PurpleBooth/109311bb0361f32d87a2 -->

# Tx Ethereum API Gateway

An aggregating API gateway that serves as an interface or adapter to third-party API services.

## About

Tx Ethereum API Gateway is a free service and hence is heavily rate-limited. To use the API Gateway, you will first need to request for an API key from @hliejun. You can do so through email: hliejun.dev@gmail.com.

This API Gateway is built primarily for Tx Ethereum Explorer. You can explore Ethereum blocks using the application here: [https://ethereum-explorer.appspot.com](https://ethereum-explorer.appspot.com/app/portfolio).

A GitHub page equivalent is also available here: [https://hliejun.github.io/ethereum-explorer](https://hliejun.github.io/ethereum-explorer/app/portfolio).

For more information about Tx Ethereum Explorer, visit the sibling repository at [https://github.com/hliejun/ethereum-explorer](https://github.com/hliejun/ethereum-explorer).

> Before using this API gateway, please ensure that you read and agree to the Terms of Service and Privacy Policy found in Tx Ethereum Explorer application.

## Third-Party Service API Endpoints

This project uses API services from [Open Exchange Rates](https://openexchangerates.org/about) and [Etherscan](https://etherscan.io/apis). The purposes of these services are as follows:

- **Open Exchange Rates** - periodic updates on a bucket of currency rates pegged against ETH
- **Etherscan** - query balance and last 1000 normal transaction history for a given Ethereum address

This gateway serves to protect API keys, transform data and rate limit requests to fit with the third-party API constraints.

## Usage

This gateway can be accessed through the following base URL:

```
https://tx-ethereum-explorer.appspot.com/api
```

This gateway exposes the following endpoints:

- `/auth` - verify public key with server, then hash with secret key and respond with a JWT auth token

* `/balance` - get the Ethereum account balance using the provided address hash, then respond with the balance in ETH unit

- `/rates` - get the currency rates with an array of currency codes, then respond with the rates, timestamp and base currency code

* `/transactions` - get the Ethereum account historical transactions (up to latest 1000) in reverse-chronological order, then respond with the formatted transactions

For details of the API endpoints, please refer to [Documentation](https://hliejun.github.io/ethereum-gateway).

## Built With

> NOTE: Dev dependencies are omitted for brevity

### Dependencies

- `axios` - Promise-based HTTP client for handling async requests in actions
- `body-parser` - Parse POST request body into objects
- `cors` - Configure Cross Origin Resource Sharing (CORS) across various domains
- `dotenv` - Setup environment variables using .env files
- `express` - Minimalist application framework for handling requests, responses and middlewares
- `express-rate-limit` - Intercept and limit number of calls to third-party service APIs
- `http-errors` - More defined HTTP error messages with status codes
- `jsonwebtoken` - Generate authentication tokens and encryption of data

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on code of conduct, the process for submitting pull requests and other rules and regulations applied to contributors.

## Authors

- **Huang Lie Jun** - _Initial development_ - [hliejun](https://hliejun.github.io)

## Acknowledgement

- **Swagger** - API documentation and documentation UI (Swagger-UI)

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/) - see the [LICENSE.md](LICENSE.md) file for details
