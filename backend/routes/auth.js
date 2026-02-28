const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { signup, login, getMe, updateProfile, deleteProfilePicture, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Multer storage configuration
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Images only (jpeg, jpg, png)!'));
    }
});

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('profileImage'), updateProfile);
router.delete('/profile/image', protect, deleteProfilePicture);
router.put('/change-password', protect, changePassword);

module.exports = router;
