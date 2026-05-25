const crypto = require('crypto');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('./tokenService');
const { uploadToCloudinary } = require('./cloudinaryService');
const { sendPasswordResetEmail, sendEmailVerificationEmail } = require('./emailService');

const formatAuthResponse = (user, tokens) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture,
    isEmailVerified: user.isEmailVerified,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
});

const createUser = async ({ name, email, password }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) return null;

    const user = await User.create({ name, email, password });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = Date.now() + 1 * 60 * 1000; // 1 minute
    await user.save();

    // Send verification email
    try {
        await sendEmailVerificationEmail(user.email, verificationToken);
    } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail registration if email fails, user can still verify later
    }

    // Generate tokens for immediate login
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, tokens };
};

const authenticateUser = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) return null;

    // Check if email is verified
    if (!user.isEmailVerified) {
        return { user, tokens: null, needsEmailVerification: true };
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, tokens };
};

const verifyEmail = async (token) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) return null;

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    return user;
};

const refreshTokens = async (token) => {
    if (!token) return null;

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) return null;

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
};

const logoutUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;
    user.refreshToken = '';
    await user.save();
    return true;
};

const getUserProfile = async (userId) => {
    return User.findById(userId).select('-password -refreshToken');
};

const updateUserProfile = async (userId, data, file) => {
    const { name, email, currentPassword, newPassword } = data;
    const user = await User.findById(userId);
    if (!user) return null;

    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            throw new Error('Email already in use');
        }
        user.email = email;
    }

    if (name) user.name = name;

    if (newPassword) {
        if (!currentPassword) {
            throw new Error('Current password is required to change password');
        }
        if (!(await user.matchPassword(currentPassword))) {
            throw new Error('Current password is incorrect');
        }
        user.password = newPassword;
    }

    if (file) {
        const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);
        user.profilePicture = uploadResult.url;
    }

    await user.save();

    return user;
};

const requestPasswordReset = async (email) => {
    const user = await User.findOne({ email });
    if (!user) return null;

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);
    return true;
};

const resetPassword = async (token, password) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return null;

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return true;
};

module.exports = {
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
};
