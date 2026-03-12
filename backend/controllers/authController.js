const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper: generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// @desc   Register a new user
// @route  POST /api/auth/signup
// @access Public
const signup = async (req, res) => {
    const { name, email, password, role, department } = req.body;
    try {
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'atleast 6 character' });
        }
        if (!password.includes('as') && !password.includes('tu')) {
            return res.status(403).json({ success: false, message: 'You are not authorized to acess this system' });
        }
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one special character' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password, role, department });
        console.log(`✅ [DB WRITE SUCCESS]: New user registered -> ${user.email} (ID: ${user._id})`);

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, departments: user.departments, profilePicture: user.profilePicture }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
// @access Public
const login = async (req, res) => {
    const { email, password, role } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        if (!password.includes('as') && !password.includes('tu')) {
            return res.status(403).json({ success: false, message: 'You are not authorized to acess this system' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }


        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
        }

        const token = generateToken(user._id);
        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, departments: user.departments, profilePicture: user.profilePicture }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get current logged-in user profile
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
    const user = await User.findById(req.user.id);
    res.json({
        success: true,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, departments: user.departments, profilePicture: user.profilePicture }
    });
};

// @desc   Change user password
// @route  PUT /api/auth/change-password
// @access Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Update user profile
// @route  PUT /api/auth/profile
// @access Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (req.body.email) user.email = req.body.email;
        // Password and name editing removed for students/staff/admin in profile update

        if (req.file) {
            const b64 = req.file.buffer.toString('base64');
            user.profilePicture = `data:${req.file.mimetype};base64,${b64}`;
        }

        await user.save();

        res.json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, departments: user.departments, profilePicture: user.profilePicture }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete profile picture
// @route  DELETE /api/auth/profile/image
// @access Private
const deleteProfilePicture = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.profilePicture = null;
        await user.save();

        res.json({
            success: true,
            message: 'Profile picture deleted',
            user: { id: user._id, name: user.name, email: user.email, role: user.role, departments: user.departments, profilePicture: user.profilePicture }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { signup, login, getMe, updateProfile, deleteProfilePicture, changePassword };
