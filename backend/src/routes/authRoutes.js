const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, changePassword, updateProfile, refreshToken, deleteUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.put('/update-profile', protect, updateProfile);
router.post('/refresh', protect, refreshToken);
router.delete('/me', protect, deleteUser);



module.exports = router;
