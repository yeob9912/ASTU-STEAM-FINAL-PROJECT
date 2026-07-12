import express from 'express';
const router = express.Router();
import { protect, authorize } from '../middleware/auth.js';
import {
    createTicket, getMyTickets, getDepartmentTickets, getAllTickets,
    getTicketById, updateTicketStatus, addRemark, updateRemark, deleteTicket, getStats
} from '../controllers/ticketController.js';

import upload from '../middleware/uploadMiddleware.js';

// Stats (admin)
router.get('/stats', protect, authorize('admin'), getStats);

// Student routes
router.post('/', protect, authorize('student'), upload.array('files', 5), createTicket);
router.get('/my', protect, authorize('student'), getMyTickets);

// Staff routes
router.get('/department', protect, authorize('staff'), getDepartmentTickets);

// Admin/Staff routes
router.get('/', protect, authorize('admin', 'staff'), getAllTickets);
router.get('/:id', protect, getTicketById);
router.put('/:id/status', protect, authorize('admin', 'staff'), updateTicketStatus);
router.post('/:id/remarks', protect, authorize('admin', 'staff'), addRemark);
router.put('/:id/remarks/:remarkId', protect, authorize('admin', 'staff'), updateRemark);
router.delete('/:id', protect, authorize('admin'), deleteTicket);

export default router;
