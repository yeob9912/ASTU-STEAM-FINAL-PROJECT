const Notification = require('../models/Notification');

// @desc   Get all notifications for logged in user
// @route  GET /api/notifications
// @access Private
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Mark a notification as read
// @route  PUT /api/notifications/:id/read
// @access Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Mark all as read
// @route  PUT /api/notifications/read-all
// @access Private
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc   Delete a notification
// @route  DELETE /api/notifications/:id
// @access Private
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user.id
        });
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
