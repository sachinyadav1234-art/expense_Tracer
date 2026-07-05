// Cache exchange rates for 1 hour to avoid calling the API on every transaction
let exchangeRatesCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 3600 * 1000; // 1 hour

const fetchExchangeRates = async (baseCurrency = 'USD') => {
  const now = Date.now();
  if (exchangeRatesCache && (now - lastCacheUpdate < CACHE_DURATION)) {
    return exchangeRatesCache;
  }

  try {
    // Node.js 18+ has global fetch support
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    const data = await response.json();
    if (data && data.rates) {
      exchangeRatesCache = data.rates;
      lastCacheUpdate = now;
      return exchangeRatesCache;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates from API, using local fallbacks:', error);
  }

  // Fallback rates in case exchange rate API is down
  return {
    USD: 1.0,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.79,
    SGD: 1.35,
    AED: 3.67,
    SAR: 3.75,
    CAD: 1.37,
    AUD: 1.51,
    JPY: 158.0,
    CHF: 0.89,
    CNY: 7.25
  };
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  const from = fromCurrency ? fromCurrency.toUpperCase() : 'INR';
  const to = toCurrency ? toCurrency.toUpperCase() : 'INR';

  if (from === to) return amount;

  try {
    const rates = await fetchExchangeRates('USD');
    
    // Convert fromCurrency -> USD
    const rateFrom = rates[from] || 1;
    const amountInUSD = amount / rateFrom;
    
    // Convert USD -> toCurrency
    const rateTo = rates[to] || 1;
    const converted = amountInUSD * rateTo;
    
    return parseFloat(converted.toFixed(2));
  } catch (err) {
    console.error('Error converting currency, defaulting to original amount:', err);
    return amount;
  }
};

module.exports = { convertCurrency };
