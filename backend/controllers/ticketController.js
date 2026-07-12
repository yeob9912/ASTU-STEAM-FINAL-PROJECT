import Ticket from '../models/Ticket.js';
import Notification from '../models/Notification.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

// @desc   Create a new ticket (Student)
// @route  POST /api/tickets
// @access Private (student)
const createTicket = async (req, res) => {
    try {
        const { title, description, category, priority } = req.body;

        // Process attachments if files were uploaded (Convert to Base64)
        const attachmentList = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const b64 = file.buffer.toString('base64');
                const dataUri = `data:${file.mimetype};base64,${b64}`;
                attachmentList.push({
                    name: file.originalname,
                    url: dataUri,
                    fileType: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
                });
            });
        }

        // Since category and department are 1:1 in the new unified layout
        const department = category;

        const ticket = new Ticket({
            student: req.user.id,
            studentName: req.user.name,
            title,
            description,
            category,
            department,
            priority: priority || 'Normal',
            attachments: attachmentList,
            timeline: [{ status: 'Submitted', date: new Date(), active: true }]
        });

        await ticket.save();
        console.log(`✅ [DB WRITE SUCCESS]: New ticket submitted -> "${ticket.title}" by ${req.user.name} (ID: ${ticket._id})`);

        // ─── NOTIFY ADMINS & STAFF ──────────────────────────────────────────
        try {
            // Notify all admins
            const admins = await User.find({ role: 'admin' });
            const adminNotifications = admins.map(admin => ({
                recipient: admin._id,
                sender: req.user.id,
                message: `New ticket submitted: "${title}" by ${req.user.name}`,
                type: 'NewTicket',
                relatedTicket: ticket._id
            }));

            // Trigger Notifications for Staff in that Department
            const staffFilter = {
                role: 'staff',
                departments: { $in: [department, category] }
            };
            const potentialRecipients = await User.find(staffFilter).select('_id assignedCategories');

            // Filter recipients: include if no specific categories assigned OR if assigned to this ticket's category
            const staffRecipients = potentialRecipients.filter(s =>
                !s.assignedCategories ||
                s.assignedCategories.length === 0 ||
                s.assignedCategories.includes(category)
            );

            const staffNotifications = staffRecipients.map(staff => ({
                recipient: staff._id,
                sender: req.user.id,
                message: `New ticket in ${category}: ${title}`,
                type: 'NewTicket',
                relatedTicket: ticket._id
            }));

            if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);
            if (staffNotifications.length > 0) await Notification.insertMany(staffNotifications);
        } catch (notifyError) {
            console.error('Notification failed:', notifyError);
            // Don't fail the ticket creation if notification fails
        }

        res.status(201).json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get tickets for the logged-in student
// @route  GET /api/tickets/my
// @access Private (student)
const getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ student: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get tickets for a staff member's department
// @route  GET /api/tickets/department
// @access Private (staff)
const getDepartmentTickets = async (req, res) => {
    try {
        const staffDepts = req.user.departments || [];

        // Visibility is based strictly on assigned departments or categories
        let filter = {
            $or: [
                { department: { $in: staffDepts } },
                { category: { $in: staffDepts } }
            ]
        };

        const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get all tickets (Admin)
// @route  GET /api/tickets
// @access Private (admin)
const getAllTickets = async (req, res) => {
    try {
        const { status, department, search } = req.query;
        let filter = {};
        if (status && status !== 'All') filter.status = status;
        if (department) filter.department = department;
        if (search) {
            filter.$or = [
                { ticketId: { $regex: search, $options: 'i' } },
                { studentName: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } }
            ];
        }

        const tickets = await Ticket.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get a single ticket by ID
// @route  GET /api/tickets/:id
// @access Private
const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Update ticket status and/or department (Staff / Admin)
// @route  PUT /api/tickets/:id/status
// @access Private (staff, admin)
const updateTicketStatus = async (req, res) => {
    try {
        const { status, department, priority } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        let updateMsg = '';

        if (status && status !== ticket.status) {
            ticket.status = status;
            ticket.timeline.push({ status, date: new Date(), active: true });
            updateMsg += `status has been updated to ${status}. `;
        }

        if (priority && priority !== ticket.priority) {
            if (req.user.role !== 'admin' && req.user.role !== 'staff') {
                return res.status(403).json({ success: false, message: 'Only admins and staff can change ticket priority' });
            }
            ticket.priority = priority;
            updateMsg += updateMsg ? `and priority changed to ${priority}. ` : `priority changed to ${priority}. `;
        }

        let origDepartment = ticket.department;
        if (department && department !== origDepartment) {
            ticket.department = department;
            updateMsg += updateMsg ? `and redirected to ${department}. ` : `redirected to ${department}. `;
        }
        if (req.body.category && req.body.category !== ticket.category) {
            ticket.category = req.body.category;
        }

        // Handle optional remark
        const { remark } = req.body;
        if (remark && remark.trim()) {
            ticket.remarks.push({
                text: remark,
                addedBy: req.user.id,
                addedByName: req.user.name,
                addedAt: new Date()
            });
            updateMsg += updateMsg ? "and added a remark." : "added a remark.";
        }

        await ticket.save();

        if (updateMsg) {

            // 1. Notify student (Always)
            await Notification.create({
                recipient: ticket.student,
                sender: req.user.id,
                message: `Your ticket "${ticket.title}" was updated by ${req.user.role === 'admin' ? 'Admin' : 'Staff'} ${req.user.name}: ${updateMsg.trim()}`,
                type: 'StatusUpdate',
                relatedTicket: ticket._id
            });

            // 2. Determine other recipients based on who made the change
            if (req.user.role === 'admin') {
                // If admin made the update, notify the relevant staff
                const staffInDept = await User.find({ role: 'staff', departments: { $in: [ticket.department, ticket.category] } });
                const staffNotifications = staffInDept.map(staff => ({
                    recipient: staff._id,
                    sender: req.user.id,
                    message: `Admin ${req.user.name} updated ticket "${ticket.title}": ${updateMsg.trim()}`,
                    type: 'StatusUpdate',
                    relatedTicket: ticket._id
                }));
                if (staffNotifications.length > 0) await Notification.insertMany(staffNotifications);

                // If department was changed (redirected), notify the new staff too
                if (department && department !== origDepartment) {
                    const staffInNewDept = await User.find({ role: 'staff', departments: { $in: [department, req.body.category || ticket.category] } });
                    const redirectNotifications = staffInNewDept.map(staff => ({
                        recipient: staff._id,
                        sender: req.user.id,
                        message: `Admin ${req.user.name} redirected ticket "${ticket.title}" to your department (${department}).`,
                        type: 'TicketRedirect',
                        relatedTicket: ticket._id
                    }));
                    if (redirectNotifications.length > 0) await Notification.insertMany(redirectNotifications);
                }
            } else if (req.user.role === 'staff') {
                // If staff made the update, notify all admins
                const admins = await User.find({ role: 'admin' });
                const adminNotifications = admins.map(admin => ({
                    recipient: admin._id,
                    sender: req.user.id,
                    message: `Staff ${req.user.name} updated ticket "${ticket.title}": ${updateMsg.trim()}`,
                    type: 'StatusUpdate',
                    relatedTicket: ticket._id
                }));
                if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);
            }
        }

        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Add a remark to a ticket (Staff / Admin)
// @route  POST /api/tickets/:id/remarks
// @access Private (staff, admin)
const addRemark = async (req, res) => {
    try {
        const { text } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        ticket.remarks.push({
            text,
            addedBy: req.user.id,
            addedByName: req.user.name,
            addedAt: new Date()
        });

        // Potentially update status to "In Progress" if a staff member is remarking
        if (req.user.role === 'staff' && ticket.status === 'Open') {
            ticket.status = 'In Progress';
            ticket.timeline.push({ status: 'In Progress', date: new Date(), active: true });
        }

        await ticket.save();

        const roleStr = req.user.role === 'admin' ? 'Admin' : 'Staff';

        // 1. Notify Student (Always)
        await Notification.create({
            recipient: ticket.student,
            sender: req.user.id,
            message: `New remark on your ticket "${ticket.title}" by ${roleStr} ${req.user.name}`,
            type: 'Remark',
            relatedTicket: ticket._id
        });

        // 2. Notify other parties
        if (req.user.role === 'staff') {
            // Notify all admins
            const admins = await User.find({ role: 'admin' });
            const adminNotifications = admins.map(admin => ({
                recipient: admin._id,
                sender: req.user.id,
                message: `Staff ${req.user.name} added a remark to ticket "${ticket.title}"`,
                type: 'Remark',
                relatedTicket: ticket._id
            }));
            if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);
        } else if (req.user.role === 'admin') {
            // Notify staff in department
            const staffInDept = await User.find({ role: 'staff', departments: { $in: [ticket.department, ticket.category] } });
            const staffNotifications = staffInDept.map(staff => ({
                recipient: staff._id,
                sender: req.user.id,
                message: `Admin ${req.user.name} added a remark to ticket "${ticket.title}"`,
                type: 'Remark',
                relatedTicket: ticket._id
            }));
            if (staffNotifications.length > 0) await Notification.insertMany(staffNotifications);
        }

        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Edit a remark (Staff / Admin)
// @route  PUT /api/tickets/:id/remarks/:remarkId
// @access Private (staff, admin)
const updateRemark = async (req, res) => {
    try {
        const { text } = req.body;
        const { id, remarkId } = req.params;
        const ticket = await Ticket.findById(id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        const remark = ticket.remarks.id(remarkId);
        if (!remark) return res.status(404).json({ success: false, message: 'Remark not found' });

        // Check if the user is the one who added the remark or an admin
        if (remark.addedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this remark' });
        }

        remark.text = text;
        remark.updatedAt = new Date();
        await ticket.save();

        const roleStr = req.user.role === 'admin' ? 'Admin' : 'Staff';

        // Notify Student
        await Notification.create({
            recipient: ticket.student,
            sender: req.user.id,
            message: `A remark on your ticket "${ticket.title}" was edited by ${roleStr} ${req.user.name}`,
            type: 'Remark',
            relatedTicket: ticket._id
        });

        if (req.user.role === 'staff') {
            // Notify admins
            const admins = await User.find({ role: 'admin' });
            const adminNotifications = admins.map(admin => ({
                recipient: admin._id,
                sender: req.user.id,
                message: `Staff ${req.user.name} edited a remark on ticket "${ticket.title}"`,
                type: 'Remark',
                relatedTicket: ticket._id
            }));
            if (adminNotifications.length > 0) await Notification.insertMany(adminNotifications);
        } else if (req.user.role === 'admin') {
            // Notify staff
            const staffInDept = await User.find({ role: 'staff', departments: { $in: [ticket.department, ticket.category] } });
            const staffNotifications = staffInDept.map(staff => ({
                recipient: staff._id,
                sender: req.user.id,
                message: `Admin ${req.user.name} edited a remark on ticket "${ticket.title}"`,
                type: 'Remark',
                relatedTicket: ticket._id
            }));
            if (staffNotifications.length > 0) await Notification.insertMany(staffNotifications);
        }

        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete a ticket (Admin only)
// @route  DELETE /api/tickets/:id
// @access Private (admin)
const deleteTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, message: 'Ticket deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get dashboard stats (Admin)
// @route  GET /api/tickets/stats
// @access Private (admin)
const getStats = async (req, res) => {
    try {
        const total = await Ticket.countDocuments();
        const open = await Ticket.countDocuments({ status: 'Open' });
        const inProgress = await Ticket.countDocuments({ status: 'In Progress' });
        const resolved = await Ticket.countDocuments({ status: 'Resolved' });

        const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;

        res.json({ success: true, stats: { total, open, inProgress, resolved, resolutionRate } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    createTicket, getMyTickets, getDepartmentTickets, getAllTickets,
    getTicketById, updateTicketStatus, addRemark, updateRemark, deleteTicket, getStats
};
