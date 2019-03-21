const parseBalance = (data) => {
  const etherRate = Math.pow(10, -18);
  const balanceWei = parseFloat(data.result) || null;
  return balanceWei == null
    ? null
    : {balance: String(balanceWei * etherRate)};
};

const parseRates = (data) => {
  if (!data.base || !data.rates || !data.timestamp) {
    return null;
  }
  return {
    base: data.base,
    rates: data.rates,
    timestamp: String(data.timestamp),
  };
};

const parseTransaction = (address) => (transaction) => {
  const etherRate = Math.pow(10, -18);
  const type = transaction.to === address ? 'incoming' : 'outgoing';
  const value = String(parseFloat(transaction.value) * etherRate);
  const gasPrice = parseFloat(transaction.gasPrice) * etherRate;
  let status;
  switch (transaction['txreceipt_status']) {
    case '1':
      status = 'success';
      break;
    case '0':
      status = 'failed';
      break;
    default:
      status = 'pending';
  }
  return {
    block: {
      confirmations: transaction.confirmations,
      height: transaction.blockNumber,
      id: transaction.blockHash,
    },
    gas: {
      cumulativeUsed: transaction.cumulativeGasUsed,
      fee: String(gasPrice * parseFloat(transaction.gasUsed)),
      limit: transaction.gas,
      price: String(gasPrice),
      used: transaction.gasUsed,
    },
    id: transaction.hash,
    source: {
      address: type === 'outgoing' ? transaction.to : transaction.from,
      timestamp: transaction.timeStamp,
      type,
    },
    status,
    value,
  };
};

const parseTransactions = (data, address) => {
  const transactions = data.result;
  if (!transactions || !Array.isArray(transactions)) {
    return null;
  }
  return transactions.map(parseTransaction(address));
};

module.exports = {parseBalance, parseRates, parseTransactions};
