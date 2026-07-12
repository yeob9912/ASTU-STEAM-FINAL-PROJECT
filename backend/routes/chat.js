import express from 'express';
const router = express.Router();
import { getChatHistory, sendMessage, deleteChat } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

router.use(protect);

router.get('/', getChatHistory);
router.post('/', sendMessage);
router.delete('/:id', deleteChat);

export default router;
