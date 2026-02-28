const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    text: {
        type: String,
        required: [true, 'Message is required']
    },
    target: {
        type: String,
        enum: ['All Users', 'Students Only', 'Staff Only', 'Admins Only'],
        default: 'All Users'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['sent', 'draft'],
        default: 'sent'
    }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
