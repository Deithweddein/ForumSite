const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

const discussionSchema = new mongoose.Schema({
    Main: {
        type: String, 
        required: true
    },
    Discuss: {
        type: String,
        required: true    
    },
    clickCount: { 
        type: Number, 
        default: 0 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    replies: [replySchema]
});


module.exports = mongoose.model('Discussion', discussionSchema);