import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        unique: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: String,    // cached for display
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    category: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Normal', 'Urgent', 'Classical'],
        default: 'Normal'
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
        default: 'Open'
    },
    remarks: [
        {
            text: String,
            addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            addedByName: String,
            addedAt: { type: Date, default: Date.now }
        }
    ],
    attachments: [
        {
            name: String,
            url: String,
            fileType: String    // 'image' | 'pdf'
        }
    ],
    timeline: [
        {
            status: String,
            date: { type: Date, default: Date.now },
            active: { type: Boolean, default: true }
        }
    ]
}, { timestamps: true });

// Auto-generate ticket ID before saving
ticketSchema.pre('save', async function () {
    if (!this.ticketId) {
        const count = await mongoose.model('Ticket').countDocuments();
        this.ticketId = `TIC-${String(count + 1).padStart(3, '0')}`;
    }
});


export default mongoose.model('Ticket', ticketSchema);
