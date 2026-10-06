const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Handle user login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password');
    }

    // Find user by normalized email and explicitly select passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Check account active status
    if (!user.isActive) {
      return sendError(
        res,
        403,
        'Your account is inactive. Contact the administrator.'
      );
    }

    // Compare bcrypt password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update lastLogin timestamp without triggering full validation
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Format safe user payload
    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: safeUser,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    const safeUser = {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    return sendSuccess(res, 200, 'Current user profile retrieved', {
      user: safeUser,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Handle user logout
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    return sendSuccess(
      res,
      200,
      'Logged out successfully. Token cleared on client.'
    );
  } catch (err) {
    return next(err);
  }
};

/**
 * Change authenticated user's password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        400,
        'Both current password and new password are required'
      );
    }

    if (newPassword.length < 8) {
      return sendError(
        res,
        400,
        'New password must be at least 8 characters long'
      );
    }

    // Query user with passwordHash
    const user = await User.findById(req.user._id || req.user.id).select('+passwordHash');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Validate current password
    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    // Hash and update to new password
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (err) {
    return next(err);
  }
};

/**
 * Role verification testing handler
 */
const verifyRoleAccess = (roleName) => (req, res) => {
  return sendSuccess(res, 200, `Access granted for ${roleName} role`, {
    role: req.user.role,
    user: req.user.name,
  });
};

module.exports = {
  login,
  getMe,
  logout,
  changePassword,
  verifyRoleAccess,
};
