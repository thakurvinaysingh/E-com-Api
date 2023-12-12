const mongoose = require('mongoose');

const supercategoryScheme = mongoose.Schema({

    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        default:''
    }
})

supercategoryScheme.virtual('id').get(function(){
    return this._id.toHexString();
});

supercategoryScheme.set('toJSON',{
    virtual:true,
});


exports.Supercategory = mongoose.model('Supercategory',supercategoryScheme);