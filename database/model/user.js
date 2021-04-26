const mongoose = require('../db.js');

const UserSchema = new mongoose.Schema({
    wallet:{ type: String, required:true}, 
    withdraw:{type: Number, required: true, default:0},
    lastClaim:{type: Number, required: true, default:0},
    balance:{type: Number, required: true,default:0},
    rewarded:{type: Number, default:0},
    ip:{ type: String}
}); 

const User = mongoose.model('user',UserSchema);

module.exports = User;