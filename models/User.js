const mongoose = require("mongoose");

UserSchema = new mongoose.Schema({
    name:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    image: {
        type: String,
        default: ''
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    isActive: {
            type: Boolean,
            default: true,
        },
    country:{
        type:String,
        require: false
    },
    state:{
        type:String,
        require: false
    },
    city:{
        type:String,
        require: false
    },
    phone: {
        type: String, 
        required: true,
    },
    dateCreated: {
            type: Date,
            default: Date.now,
        },
    })
    UserSchema .virtual('id').get(function () {
        return this._id.toHexString();
    });
    UserSchema.set('toJSON', {
        virtuals: true,
    });
    
    exports.User = new mongoose.model('User',UserSchema);