const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
    code:{
        type: String,
    } ,
    discount:{
      type: Number, 
    } ,
    expirationDate:{
        type:Date,
    },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
})


couponSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

couponSchema.set('toJSON', {
    virtuals: true,
});

exports.Coupon = mongoose.model('Coupon', couponSchema);
