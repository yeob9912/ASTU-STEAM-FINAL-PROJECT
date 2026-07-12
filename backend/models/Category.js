import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department name is required']
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
