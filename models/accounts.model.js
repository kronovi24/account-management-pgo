const mongoose = require('mongoose');

const { Schema } = mongoose;

const AccountsSchema = new Schema({

    name:{
        type: String,
        required: [true, "name is Required"]
    },

    user: {
        type: String,
        required: [true, "user is Required"]
    },
    pass: {
        // am_in : am_out || pm_in : pm_out
        type: String,
        required: [true, "pass is Required"]
    },
    status: {
        type: String,
        required: [false, "status here"]
    },

    remarks: {
        type: String,
        required: [false, "remarks here"]
    },
},
    {
        timestamps: true  // Automatically create createdAt and updatedAt fields
    });

const Accounts = mongoose.model('Accounts', AccountsSchema);

module.exports = Accounts;