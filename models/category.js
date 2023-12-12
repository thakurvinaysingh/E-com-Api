const mongoose = require('mongoose');
const Supercategory =require('./super-category')

const categorySchema = mongoose.Schema({
    supercategory:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supercategory', 
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
    },
    color: { 
        type: String,
    },
    image: {
        type: String,
        default: ''
    },
})


categorySchema.virtual('id').get(function () {
    return this._id.toHexString();
});

categorySchema.set('toJSON', {
    virtuals: true,
});

exports.Category = mongoose.model('Category', categorySchema);
