import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },
    password: {
        type: String,
        // Not required for Google OAuth users
        required: function () { return !this.googleId; },
        minlength: 6,
        select: false   // never returned by default
    },
    googleId: {
        type: String,
        default: null
    },
    role: {
        type: String,
        enum: ['student', 'staff', 'admin'],
        default: 'student'
    },
    departments: {
        type: [String],
        default: []   // relevant for staff
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    profilePicture: {
        type: String,
        default: null
    },
    assignedCategories: {
        type: [String],
        default: [] // Granular categories within departments if needed
    }
}, { timestamps: true });

// Hash password before saving (skip for Google OAuth users with no password)
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
