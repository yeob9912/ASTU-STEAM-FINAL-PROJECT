const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage, deleteChat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getChatHistory);
router.post('/', sendMessage);
router.delete('/:id', deleteChat);

module.exports = router;
