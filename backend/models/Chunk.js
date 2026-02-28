const mongoose = require('mongoose');

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

// Vector Search Index should be created in MongoDB Atlas:
// {
//   "fields": [
//     {
//       "numDimensions": 768,
//       "path": "embedding",
//       "similarity": "cosine",
//       "type": "vector"
//     }
//   ]
// }

module.exports = mongoose.model('Chunk', chunkSchema, 'chunk');
