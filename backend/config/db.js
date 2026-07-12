import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        // URL-encode any special characters in MONGO_URI
        const uri = process.env.MONGO_URI;
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`✅ MongoDB Connected`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.error('Check your MONGO_URI in .env — make sure Atlas IP whitelist allows 0.0.0.0/0');
        process.exit(1);
    }
};

export default connectDB;
