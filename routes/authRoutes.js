const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const { register, login, verifyEmailToken, resendVerificationEmail, refreshToken, logout, getMe, updateProfile, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.get('/verify-email/:token', asyncHandler(verifyEmailToken));
router.post('/resend-verification', authLimiter, asyncHandler(resendVerificationEmail));
router.post('/refresh', asyncHandler(refreshToken));
router.post('/logout', protect, asyncHandler(logout));
router.get('/me', protect, asyncHandler(getMe));
router.put('/profile', protect, upload.single('profilePicture'), asyncHandler(updateProfile));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.put('/reset-password/:token', asyncHandler(resetPassword));

module.exports = router;
