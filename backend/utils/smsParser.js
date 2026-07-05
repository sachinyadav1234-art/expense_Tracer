const parseSMS = (text) => {
  if (!text) return null;

  const textLower = text.toLowerCase();

  // 1. Check if it is an OTP (ignore verification codes)
  if (
    textLower.includes('otp') ||
    textLower.includes('verification code') ||
    textLower.includes('one time password') ||
    textLower.includes('security code') ||
    textLower.includes('to verify')
  ) {
    return null;
  }

  // 2. Identify transaction type (debit/spent/paid vs credit/received)
  let type = null;
  const expenseKeywords = ['debited', 'spent', 'paid', 'withdrawn', 'charged', 'txn of', 'sent to', 'transfer to', 'payment to', 'purchase of'];
  const incomeKeywords = ['credited', 'received', 'deposited', 'added', 'refunded'];

  for (const keyword of expenseKeywords) {
    if (textLower.includes(keyword)) {
      type = 'expense';
      break;
    }
  }
  for (const keyword of incomeKeywords) {
    if (textLower.includes(keyword)) {
      type = 'income';
      break;
    }
  }

  // Default to expense if type not identified but it contains payment hints
  if (!type) {
    type = 'expense';
  }

  // 3. Extract Currency and Amount
  // We match currency signs or currency codes followed by the amount, or vice versa
  const currencyPatterns = [
    /(?:Rs\.?|INR|₹|\$|USD|EUR|€|GBP|£|AED|SAR|SGD|CAD|AUD|CHF|CNY|JPY|¥|Dh|Dhs|SR)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹|\$|USD|EUR|€|GBP|£|AED|SAR|SGD|CAD|AUD|CHF|CNY|JPY|¥|Dh|Dhs|SR)/i
  ];

  let amount = 0;
  let currency = 'INR'; // Default

  for (const pattern of currencyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amtStr = match[1].replace(/,/g, '');
      const parsedAmt = parseFloat(amtStr);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        amount = parsedAmt;
        
        const matchStr = match[0].toUpperCase();
        if (matchStr.includes('$')) {
          if (matchStr.includes('C$') || matchStr.includes('CAD')) currency = 'CAD';
          else if (matchStr.includes('A$') || matchStr.includes('AUD')) currency = 'AUD';
          else if (matchStr.includes('S$') || matchStr.includes('SGD')) currency = 'SGD';
          else currency = 'USD';
        } else if (matchStr.includes('₹') || matchStr.includes('INR') || matchStr.includes('RS')) {
          currency = 'INR';
        } else if (matchStr.includes('€') || matchStr.includes('EUR')) {
          currency = 'EUR';
        } else if (matchStr.includes('£') || matchStr.includes('GBP')) {
          currency = 'GBP';
        } else if (matchStr.includes('AED') || matchStr.includes('DH') || matchStr.includes('DHS')) {
          currency = 'AED';
        } else if (matchStr.includes('SAR') || matchStr.includes('SR')) {
          currency = 'SAR';
        } else if (matchStr.includes('SGD')) {
          currency = 'SGD';
        } else if (matchStr.includes('CAD')) {
          currency = 'CAD';
        } else if (matchStr.includes('AUD')) {
          currency = 'AUD';
        } else if (matchStr.includes('CHF')) {
          currency = 'CHF';
        } else if (matchStr.includes('CNY')) {
          currency = 'CNY';
        } else if (matchStr.includes('¥') || matchStr.includes('JPY')) {
          currency = textLower.includes('yuan') || textLower.includes('cny') ? 'CNY' : 'JPY';
        }
        break;
      }
    }
  }

  if (amount === 0) {
    return null;
  }

  // 4. Extract Merchant/Receiver/Sender
  let merchant = 'Unknown Merchant';
  const merchantPatterns = [
    /at\s+([A-Za-z0-9\s\.\*&]+?)(?:\s+on|\s+ref|\s+using|\s+date|\s+via|\.\s+|\.+$|\s+INR|\s+Rs)/i,
    /(?:spent on|spent at|paid to|transfer to|transferred to|UPI to|payment to|to)\s+([A-Za-z0-9\s\.\*&]+?)(?:\s+on|\s+ref|\s+using|\s+date|\s+via|\.\s+|\.+$|\s+INR|\s+Rs)/i,
    /(?:credited from|received from|from)\s+([A-Za-z0-9\s\.\*&]+?)(?:\s+on|\s+ref|\s+using|\s+date|\.\s+|\.+$|\s+INR|\s+Rs)/i
  ];

  const ignoreMerchants = ['card', 'credit card', 'debit card', 'account', 'a/c', 'upi', 'wallet', 'bank', 'net banking', 'cash'];

  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candLower = candidate.toLowerCase();
      
      const isPaymentMethod = ignoreMerchants.some(ignored => 
        candLower === ignored || 
        candLower === ignored + 's' ||
        candLower.startsWith('card *') || 
        candLower.startsWith('a/c *') ||
        candLower.startsWith('account *')
      );

      if (candidate && candidate.length > 2 && !isPaymentMethod) {
        merchant = candidate.replace(/\s+/g, ' ');
        break;
      }
    }
  }

  // 5. Categorize based on Merchant Name
  let category = 'Others';
  const merchLower = merchant.toLowerCase();
  
  if (
    merchLower.includes('zomato') ||
    merchLower.includes('swiggy') ||
    merchLower.includes('food') ||
    merchLower.includes('cafe') ||
    merchLower.includes('restaurant') ||
    merchLower.includes('hotel') ||
    merchLower.includes('starbucks')
  ) {
    category = 'Food';
  } else if (
    merchLower.includes('amazon') ||
    merchLower.includes('flipkart') ||
    merchLower.includes('myntra') ||
    merchLower.includes('shopping') ||
    merchLower.includes('mart') ||
    merchLower.includes('store') ||
    merchLower.includes('groceries')
  ) {
    category = 'Shopping';
  } else if (
    merchLower.includes('uber') ||
    merchLower.includes('ola') ||
    merchLower.includes('metro') ||
    merchLower.includes('auto') ||
    merchLower.includes('rail') ||
    merchLower.includes('irctc') ||
    merchLower.includes('travel') ||
    merchLower.includes('flight') ||
    merchLower.includes('cab') ||
    merchLower.includes('grab') ||
    merchLower.includes('taxi')
  ) {
    category = 'Travel';
  } else if (
    merchLower.includes('netflix') ||
    merchLower.includes('spotify') ||
    merchLower.includes('prime') ||
    merchLower.includes('hotstar') ||
    merchLower.includes('movie') ||
    merchLower.includes('cinema') ||
    merchLower.includes('entertainment')
  ) {
    category = 'Entertainment';
  } else if (
    merchLower.includes('bill') ||
    merchLower.includes('electricity') ||
    merchLower.includes('water') ||
    merchLower.includes('recharge') ||
    merchLower.includes('jio') ||
    merchLower.includes('airtel') ||
    merchLower.includes('gas')
  ) {
    category = 'Utilities';
  } else if (
    merchLower.includes('hospital') ||
    merchLower.includes('pharmacy') ||
    merchLower.includes('medical') ||
    merchLower.includes('health') ||
    merchLower.includes('clinic')
  ) {
    category = 'Health';
  }

  return {
    amount,
    currency,
    type,
    category,
    merchant,
    note: type === 'expense' ? `Auto-detected: paid to ${merchant}` : `Auto-detected: received from ${merchant}`
  };
};

module.exports = { parseSMS };
