import express from 'express';
const router = express.Router();
import { protect, authorize } from '../middleware/auth.js';
import {
    getAllUsers, createUser, updateUser, deleteUser,
    getAnnouncements, createAnnouncement, deleteAnnouncement,
    getCategories, createCategory, updateCategory, deleteCategory,
    getAdminStats, uploadKnowledgeBase, getKnowledgeBaseFiles, deleteKnowledgeBaseFile
} from '../controllers/adminController.js';
import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for docs
});

// Overview Stats
router.get('/stats', protect, authorize('admin'), getAdminStats);

// Users
router.get('/users', protect, authorize('admin'), getAllUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// Announcements
router.get('/announcements', protect, getAnnouncements);
router.post('/announcements', protect, authorize('admin'), createAnnouncement);
router.delete('/announcements/:id', protect, authorize('admin'), deleteAnnouncement);

// Categories
router.get('/categories', protect, getCategories);
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);

// RAG Knowledge Base
router.post('/rag/upload', protect, authorize('admin'), upload.single('file'), uploadKnowledgeBase);
router.get('/rag/files', protect, authorize('admin'), getKnowledgeBaseFiles);
router.delete('/rag/files/:filename', protect, authorize('admin'), deleteKnowledgeBaseFile);

export default router;
