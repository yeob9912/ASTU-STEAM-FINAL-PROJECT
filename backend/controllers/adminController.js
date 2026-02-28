const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Category = require('../models/Category');
const Ticket = require('../models/Ticket');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { chunkText, embedText } = require('../utils/rag');
const Chunk = require('../models/Chunk');

// ─── USERS ────────────────────────────────────────────────────────────────────

// @desc   Get all users
// @route  GET /api/admin/users
// @access Private (admin)
const getAllUsers = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Create a new user (by admin)
// @route  POST /api/admin/users
// @access Private (admin)
const createUser = async (req, res) => {
    try {
        const { name, email, role, departments, status, assignedCategories } = req.body;
        // Use default password — user should reset
        const password = 'astu1234';
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

        if (role === 'staff' && (!departments || departments.length === 0)) {
            return res.status(400).json({ success: false, message: 'At least one department is required for staff' });
        }

        // Role-based department and assignedCategories logic
        let finalDepartments = departments;
        let finalAssignedCategories = assignedCategories;
        if (role !== 'staff') {
            finalDepartments = [];
            finalAssignedCategories = [];
        }

        const user = await User.create({ name, email, password, role, departments: finalDepartments || [], status, assignedCategories: finalAssignedCategories || [] });
        res.status(201).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Update a user
// @route  PUT /api/admin/users/:id
// @access Private (admin)
const updateUser = async (req, res) => {
    try {
        const { email, role, departments, status, assignedCategories } = req.body;

        // Role-based department logic
        let finalDepartments = departments;
        let finalAssignedCategories = assignedCategories;
        if (role !== 'staff') {
            finalDepartments = [];
            finalAssignedCategories = [];
        } else if (role === 'staff' && (!departments || departments.length === 0)) {
            return res.status(400).json({ success: false, message: 'At least one department is required for staff' });
        }

        // Update object: Name update is restricted for Admin
        const updateData = { email, role, departments: finalDepartments, status, assignedCategories: finalAssignedCategories };

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Notify user of profile update
        const Notification = require('../models/Notification');
        await Notification.create({
            recipient: user._id,
            sender: req.user.id,
            message: `Your profile has been updated by Admin ${req.user.name}.`,
            type: 'ProfileUpdate'
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete a user
// @route  DELETE /api/admin/users/:id
// @access Private (admin)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

// @desc   Get all announcements
// @route  GET /api/admin/announcements
// @access Private
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json({ success: true, announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Create announcement
// @route  POST /api/admin/announcements
// @access Private (admin)
const createAnnouncement = async (req, res) => {
    try {
        const { title, text, target } = req.body;
        const announcement = await Announcement.create({
            title,
            text,
            target,
            createdBy: req.user.id
        });

        // Trigger Notifications for Target Audience
        const Notification = require('../models/Notification');
        let recipientFilter = { _id: { $ne: req.user.id } }; // Exclude sender
        if (target === 'Students Only') recipientFilter.role = 'student';
        if (target === 'Staff Only') recipientFilter.role = 'staff';
        if (target === 'Admins Only') recipientFilter.role = 'admin';

        const recipients = await User.find(recipientFilter).select('_id');
        const notifications = recipients.map(r => ({
            recipient: r._id,
            sender: req.user.id,
            message: `New Announcement: ${title}`,
            type: 'Announcement'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        console.log(`✅ [DB WRITE SUCCESS]: New announcement created -> "${announcement.title}" (ID: ${announcement._id})`);
        res.status(201).json({ success: true, announcement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete announcement
// @route  DELETE /api/admin/announcements/:id
// @access Private (admin)
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

        // Trigger Deletion Notifications for Target Audience
        const Notification = require('../models/Notification');
        let recipientFilter = { _id: { $ne: req.user.id } }; // Exclude sender
        if (announcement.target === 'Students Only') recipientFilter.role = 'student';
        if (announcement.target === 'Staff Only') recipientFilter.role = 'staff';
        if (announcement.target === 'Admins Only') recipientFilter.role = 'admin';

        const recipients = await User.find(recipientFilter).select('_id');
        const notifications = recipients.map(r => ({
            recipient: r._id,
            sender: req.user.id,
            message: `Announcement "${announcement.title}" was deleted by Admin ${req.user.name}.`,
            type: 'AnnouncementDelete'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

// @desc   Get all categories
// @route  GET /api/admin/categories
// @access Private
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Create category
// @route  POST /api/admin/categories
// @access Private (admin)
const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (name.toLowerCase() === 'general' || name.toLowerCase() === 'all') {
            return res.status(400).json({ success: false, message: '"General" and "All" are reserved terms.' });
        }
        // department name is same as category name for simplicity
        const cat = await Category.create({ name, department: name, description: description || '' });
        console.log(`✅ [DB WRITE SUCCESS]: New category created -> "${cat.name}" (ID: ${cat._id})`);
        res.status(201).json({ success: true, category: cat });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Update category
// @route  PUT /api/admin/categories/:id
// @access Private (admin)
const updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const categoryId = req.params.id;

        if (name && (name.toLowerCase() === 'general' || name.toLowerCase() === 'all')) {
            return res.status(400).json({ success: false, message: '"General" and "All" are reserved terms.' });
        }

        const oldCategory = await Category.findById(categoryId);
        if (!oldCategory) return res.status(404).json({ success: false, message: 'Category not found' });

        const oldName = oldCategory.name;
        const newName = name || oldName;

        const cat = await Category.findByIdAndUpdate(categoryId, { name: newName, department: newName, description }, { new: true });

        // Cascading Update
        if (newName !== oldName) {
            // Update Users
            await User.updateMany(
                { departments: oldName },
                { $set: { "departments.$": newName } }
            );
            await User.updateMany(
                { assignedCategories: oldName },
                { $set: { "assignedCategories.$": newName } }
            );
            // Update Tickets
            await Ticket.updateMany({ category: oldName }, { category: newName });
            await Ticket.updateMany({ department: oldName }, { department: newName });
        }

        res.json({ success: true, category: cat });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete category
// @route  DELETE /api/admin/categories/:id
// @access Private (admin)
const deleteCategory = async (req, res) => {
    try {
        const cat = await Category.findById(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

        const catName = cat.name;
        await Category.findByIdAndDelete(req.params.id);

        // Cascading Delete/Cleanup
        await User.updateMany(
            { departments: catName },
            { $pull: { departments: catName } }
        );
        await User.updateMany(
            { assignedCategories: catName },
            { $pull: { assignedCategories: catName } }
        );

        res.json({ success: true, message: 'Category deleted and removed from staff assignments' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── ADMIN OVERVIEW STATS ────────────────────────────────────────────────────

// @desc   Admin dashboard overview stats
// @route  GET /api/admin/stats
// @access Private (admin)
const getAdminStats = async (req, res) => {
    try {
        const [totalTickets, activeTickets, resolvedTickets, totalUsers] = await Promise.all([
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
            Ticket.countDocuments({ status: 'Resolved' }),
            User.countDocuments()
        ]);

        const resolutionRate = totalTickets > 0
            ? ((resolvedTickets / totalTickets) * 100).toFixed(1)
            : 0;

        // Weekly chart data (last 7 days)
        const chartData = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
            const start = new Date(); start.setDate(start.getDate() - i); start.setHours(0, 0, 0, 0);
            const end = new Date(start); end.setHours(23, 59, 59, 999);
            const complaints = await Ticket.countDocuments({ createdAt: { $gte: start, $lte: end } });
            const resolved = await Ticket.countDocuments({ status: 'Resolved', updatedAt: { $gte: start, $lte: end } });
            chartData.push({ name: days[start.getDay()], complaints, resolved });
        }

        res.json({
            success: true,
            stats: { totalTickets, activeTickets, resolvedTickets, totalUsers, resolutionRate },
            chartData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc   Upload Knowledge Base (PDF/DOCX/Text)
// @route  POST /api/admin/rag/upload
// @access Private (admin)
const uploadKnowledgeBase = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let content = '';

        console.log(`Analyzing file type: ${req.file.mimetype} for file: ${req.file.originalname}`);

        if (req.file.mimetype === 'application/pdf') {
            const parser = new pdfParse.PDFParse({ data: req.file.buffer });
            const result = await parser.getText();
            content = result.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || req.file.originalname.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            content = result.value;
        } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
            content = req.file.buffer.toString('utf8');
        } else {
            // Suggest DOCX if it's an old DOC file
            if (req.file.originalname.endsWith('.doc')) {
                return res.status(400).json({ success: false, message: 'Please save .doc files as .docx for uploading.' });
            }
            content = req.file.buffer.toString('utf8'); // Try as text as fallback
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'File is empty or could not be parsed' });
        }

        console.log(`Processing file content in memory... Length: ${content.length}`);
        const chunks = await chunkText(content);
        console.log(`Split into ${chunks.length} chunks`);

        const embeddings = await embedText(chunks, true);

        const chunkDocs = chunks.map((text, i) => ({
            text,
            embedding: embeddings[i],
            metadata: {
                fileName: req.file.originalname,
                fileType: req.file.mimetype
            }
        }));

        await Chunk.insertMany(chunkDocs);
        console.log(`✅ [DB WRITE SUCCESS]: RAG Document "${req.file.originalname}" embedded and saved (${chunks.length} chunks inserted)`);

        res.json({
            success: true,
            message: `Knowledge base updated successfully. Processed ${chunks.length} chunks from "${req.file.originalname}" directly from memory.`
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Get list of uploaded knowledge base files
// @route  GET /api/admin/rag/files
// @access Private (admin)
const getKnowledgeBaseFiles = async (req, res) => {
    try {
        const files = await Chunk.aggregate([
            {
                $group: {
                    _id: "$metadata.fileName",
                    uploadedAt: { $min: "$metadata.uploadedAt" },
                    chunkCount: { $sum: 1 },
                    fileType: { $first: "$metadata.fileType" }
                }
            },
            { $sort: { uploadedAt: -1 } }
        ]);

        const formattedFiles = files.map(f => ({
            fileName: f._id,
            uploadedAt: f.uploadedAt,
            chunkCount: f.chunkCount,
            fileType: f.fileType
        }));

        res.json({ success: true, files: formattedFiles });
    } catch (error) {
        console.error('Get KB Files Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete a knowledge base file and its chunks
// @route  DELETE /api/admin/rag/files/:filename
// @access Private (admin)
const deleteKnowledgeBaseFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await Chunk.deleteMany({ "metadata.fileName": filename });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'File not found in knowledge base.' });
        }

        res.json({ success: true, message: `Successfully deleted ${filename} (${result.deletedCount} chunks).` });
    } catch (error) {
        console.error('Delete KB File Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllUsers, createUser, updateUser, deleteUser,
    getAnnouncements, createAnnouncement, deleteAnnouncement,
    getCategories, createCategory, updateCategory, deleteCategory,
    getAdminStats, uploadKnowledgeBase, getKnowledgeBaseFiles, deleteKnowledgeBaseFile
};
