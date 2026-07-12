import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number],
        required: true
    },
    metadata: {
        fileName: String,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }
}, { timestamps: true });

// MongoDB Atlas Vector Search Index — paste this in Atlas → Search Indexes:
// {
//   "fields": [
//     {
//       "type": "vector",
//       "numDimensions": 3072,
//       "path": "embedding",
//       "similarity": "cosine"
//     }
//   ]
// }


export default mongoose.model('Chunk', chunkSchema, 'chunk');
