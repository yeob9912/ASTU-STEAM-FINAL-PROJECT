import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Remark', 'StatusUpdate', 'Announcement', 'System', 'NewTicket', 'ProfileUpdate', 'PriorityUpdate', 'TicketRedirect', 'AnnouncementDelete'],
        default: 'System'
    },
    relatedTicket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
