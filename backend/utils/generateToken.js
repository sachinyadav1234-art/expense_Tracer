const jwt = require('jsonwebtoken');

// user ki id ko andar rakh ke ek signed token banata hai
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;