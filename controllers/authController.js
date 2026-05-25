const {
  formatAuthResponse,
  createUser,
  authenticateUser,
  verifyEmail,
  refreshTokens,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
} = require('../services/authService');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const result = await createUser({ name, email, password });

  if (!result) {
    return res.status(400).json({ message: 'User already exists' });
  }

  res.status(201).json({
    message: 'Registration successful. Please verify your email.',
    ...formatAuthResponse(result.user, result.tokens)
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authenticateUser({ email, password });

  if (!result) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // If email is not verified, return pending verification response
  if (!result.tokens) {
    return res.status(403).json({
      message: 'Please verify your email before logging in',
      email: result.user.email,
      needsEmailVerification: true
    });
  }

  res.json(formatAuthResponse(result.user, result.tokens));
};

exports.verifyEmailToken = async (req, res) => {
  const { token } = req.params;
  const user = await verifyEmail(token);

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired verification link' });
  }

  res.json({ message: 'Email verified successfully', user: { email: user.email, name: user.name } });
};

exports.resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const User = require('../models/User');
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = Date.now() + 1 * 60 * 1000;
    await user.save();

    // Send verification email
    const { sendEmailVerificationEmail } = require('../services/emailService');
    await sendEmailVerificationEmail(user.email, verificationToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {

    res.status(500).json({ error: error, message: 'Failed to resend verification email' });
  }
};


exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  const tokens = await refreshTokens(token);

  if (!tokens) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  res.json(tokens);
};

exports.logout = async (req, res) => {
  await logoutUser(req.user._id);
  res.json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  const user = await getUserProfile(req.user._id);
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await updateUserProfile(req.user._id, req.body, req.file);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await requestPasswordReset(email);
  if (!result) {
    return res.status(404).json({ message: 'No user with that email' });
  }
  res.json({ message: 'Password reset email sent' });
};

exports.resetPassword = async (req, res) => {
  const result = await resetPassword(req.params.token, req.body.password);
  if (!result) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
  res.json({ message: 'Password reset successful' });
};
