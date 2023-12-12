const mongoose = require('mongoose');

const shippingSchema = mongoose.Schema({
    // order: {
    //      type: mongoose.Schema.Types.ObjectId,
    //       ref: 'Order', required: true }, 
    carrier: { 
        type: String,
         
        }, 
    trackingNumber: {
         type: String, 
         default: generateTrackingNumber,
        required: true 
    },
    estimatedDeliveryDate: {
         type: Date 
        },
    weight: {
        type: Number,
    },
    destination: {
        type: String,
    },
    charge: {
        type: Number,
    },
});

function generateTrackingNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TN-${timestamp}-${random}`;
  }

shippingSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

shippingSchema.set('toJSON', {
    virtuals: true,
});

exports.Shipping = mongoose.model('Shipping', shippingSchema);