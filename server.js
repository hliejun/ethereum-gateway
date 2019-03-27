const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const createError = require('http-errors');
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const whitelist =
  process.env.NODE_ENV === 'development'
    ? [process.env.CLIENT_URL_LOCAL]
    : [process.env.CLIENT_URL, process.env.GITHUB_URL, process.env.SWAGGER_URL];

const corsOptions = {
  credentials: true,
  optionsSuccessStatus: 200,
  origin: function(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

const corsErrorHandler = (err, req, res, next) => {
  if (!err) {
    next();
  } else if (err.message === 'Not allowed by CORS') {
    const errorMessage =
      'CORS pre-flight request failed as your domain is not whitelisted.';
    res.status(401).json({code: 401, message: errorMessage});
  } else {
    next(err);
  }
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    code: 429,
    message: 'Too many token requests from this IP, please try again later.',
  },
});

const currLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message:
      'Too many currency rate requests from this IP, please try again later.',
  },
});

const ethLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message:
      'Too many transaction requests from this IP, please try again later.',
  },
});

const {parseBalance, parseRates, parseTransactions} = require('./parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.options('/api/auth', [cors(corsOptions), corsErrorHandler]);
app.post(
    '/api/auth',
    [cors(corsOptions), corsErrorHandler, authLimiter],
    (req, res) => {
      const payload = req.body;
      if (payload.token === process.env.VALIDATION_KEY) {
        const options =
        process.env.NODE_ENV === 'development' ? {} : {expiresIn: '1h'};
        const authToken = jwt.sign(
            {token: payload.token},
            process.env.SECRET_KEY,
            options
        );
        res
            .status(200)
            .json({authToken, timestamp: String(new Date().getTime())});
        return;
      } else {
        res.status(400).json({message: 'Invalid or malformed token.'});
        return;
      }
    }
);

const authenticate = (req, res, next) => {
  let authToken = req.headers['x-access-token'] || req.headers['authorization'];
  if (!authToken) {
    res.status(401).json({message: 'Missing auth token.'});
    return;
  }
  if (authToken.startsWith('Bearer ')) {
    authToken = authToken.slice(7, authToken.length);
  }
  jwt.verify(authToken, process.env.SECRET_KEY, (error, decoded) => {
    if (error) {
      res.status(401).json({message: 'Corrupted auth token.'});
      return;
    } else if (decoded.token !== process.env.VALIDATION_KEY) {
      res.status(401).json({message: 'Invalid auth token.'});
      return;
    } else {
      next();
    }
  });
};

app.options('/api/balance', [cors(corsOptions), corsErrorHandler]);
app.post(
    '/api/balance',
    [cors(corsOptions), corsErrorHandler, ethLimiter, authenticate],
    (req, res) => {
      const payload = req.body;
      const address = payload.address;
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        res.status(400).json({message: 'Invalid or missing address.'});
        return;
      }
      axios
          .get(process.env.ETHEREUM_API_URL, {
            params: {
              action: 'balance',
              address,
              apikey: process.env.ETHEREUM_API_KEY,
              module: 'account',
              tag: 'latest',
            },
          })
          .then((response) => {
            let data = response.data;
            if (data.status !== '1') {
              return Promise.reject(createError(502, 'Malformed proxy response.'));
            }
            data = parseBalance(data);
            if (data == null) {
              return Promise.reject(
                  createError(502, 'Invalid balance received from proxy.')
              );
            }
            res.status(200).json(data);
            return;
          })
          .catch((error) => {
            if (!error || !error.status) {
              res.status(502, 'Service is currently unavailable.');
              return;
            }
            res.status(error.status).json({message: error.message});
            return;
          });
    }
);

app.options('/api/rates', [cors(corsOptions), corsErrorHandler]);
app.post(
    '/api/rates',
    [cors(corsOptions), corsErrorHandler, currLimiter, authenticate],
    (req, res) => {
      const payload = req.body;
      const symbols = payload.symbols;
      if (
        !symbols ||
      !Array.isArray(symbols) ||
      symbols.length === 0 ||
      !symbols.includes('ETH')
      ) {
        res
            .status(400)
            .json({code: 400, message: 'Invalid or missing currency codes.'});
        return;
      }
      axios
          .get(`${process.env.RATES_API_URL}/latest.json`, {
            params: {
              symbols: symbols.join(','),
              show_alternative: '1',
              app_id: process.env.RATES_API_KEY,
            },
          })
          .then((response) => {
            const data = response.data;
            const rates = parseRates(data);
            if (rates == null) {
              return Promise.reject(
                  createError(502, 'Invalid rates received from proxy.')
              );
            }
            res.status(200).json(rates);
            return;
          })
          .catch((error) => {
            if (!error || !error.status) {
              const errorMessage = 'Service is currently unavailable.';
              res.status(502).json({code: 502, message: errorMessage});
              return;
            }
            res
                .status(error.status)
                .json({code: error.status, message: error.message});
            return;
          });
    }
);

app.options('/api/transactions', [cors(corsOptions), corsErrorHandler]);
app.post(
    '/api/transactions',
    [cors(corsOptions), corsErrorHandler, ethLimiter, authenticate],
    (req, res) => {
      const payload = req.body;
      const address = payload.address;
      if (!address || address.length !== 42 || !address.startsWith('0x')) {
        res
            .status(400)
            .json({code: 400, message: 'Invalid or missing address.'});
        return;
      }
      axios
          .get(process.env.ETHEREUM_API_URL, {
            params: {
              action: 'txlist',
              address,
              apikey: process.env.ETHEREUM_API_KEY,
              module: 'account',
              offset: '1000',
              page: '1',
              sort: 'desc',
            },
          })
          .then((response) => {
            const data = response.data;
            if (data.status !== '1') {
              return Promise.reject(createError(502, 'Malformed proxy response.'));
            }
            const transactions = parseTransactions(data, address);
            if (transactions == null) {
              return Promise.reject(
                  createError(502, 'Invalid transactions received from proxy.')
              );
            }
            res.status(200).json({transactions});
            return;
          })
          .catch((error) => {
            if (!error || !error.status) {
              const errorMessage = 'Service is currently unavailable.';
              res.status(502).json({code: 502, message: errorMessage});
              return;
            }
            res
                .status(error.status)
                .json({code: error.status, message: error.message});
            return;
          });
    }
);

const MODE = process.env.NODE_ENV;
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running in ${MODE} mode, listening on port ${PORT}...`);
});
