const mongoose = require('mongoose');

const { Schema } = mongoose;

const LogsSchema = new Schema({

    user:{
        type: String,
        required: [true, "user Required"]
    },

    account: {
        type: String,
        required: [true, "account Required"]
    },
    
    action: {
        type: String,
        required: [false, "action here"]
    },
},
    {
        timestamps: true  // Automatically create createdAt and updatedAt fields
    });

const Logs = mongoose.model('Logs', LogsSchema);

module.exports = Logs;