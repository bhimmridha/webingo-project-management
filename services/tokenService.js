const jwt = require('jsonwebtoken');

const createToken = (id, secret, expiresIn) => jwt.sign({ id }, secret, { expiresIn });

const generateTokens = (id) => ({
    accessToken: createToken(id, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN || '15m'),
    refreshToken: createToken(id, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
});

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);
const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
    generateTokens,
    verifyRefreshToken,
    verifyAccessToken,
};
