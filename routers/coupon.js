const express = require('express');
const router = express.Router();
const {Coupon} = require('../models/coupon');
const crypto = require('crypto');
const verifyToken = require("./jwt");



//----------- display created coupon ---------//

//--------created Api coupon discount-------//
function generateCouponCode(){
    const length = 8;
    return crypto.randomBytes(Math.ceil(length/2))
    .toString('hex').slice(0,length).toUpperCase();
}
router.post('/setdiscount',verifyToken,async (req,res)=>{
    const {discount,expirationDays} = req.body;

    if(typeof discount !== 'number' || discount <=0 || discount >=100){
        return res.status(400).json({message: "Invalid discount percentage"});
    }
    
    if(typeof expirationDays !=='number'|| expirationDays<=0){
        return res.status(400).json({message:'Invalid expirationDays days'});
    }
     //---check coupon ---//
     const existingCoupon = await Coupon.findOne({discount,expirationDays});
     if(existingCoupon){
        return res.status(400).json({message: 'A discount coupon is alredy exists'})
     }
      const couponCode = generateCouponCode();
       const expirationDate = new Date();
       expirationDate.setDate(expirationDate.getDate() + expirationDays);


     const newCoupon = new Coupon({
        code: couponCode,
        discount,
        expirationDate,
     })
try {
   await newCoupon.save();
   res.status(200).json({message: 'Discount set successfully',couponCode}) 
} catch (error) {
    console.error('Error saving coupon:',error);
    res.status(500).json({message:'Internal server error'})
}

});

//----------------Api created list --------------//
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage)
        const skip = (page - 1) * itemsPerPage;
        const totalCoupons = await Coupon.countDocuments({});


        const couponList = await Coupon.find({}).sort({ expirationDate: -1 }).skip(skip).limit(itemsPerPage);

        if (!couponList || couponList.length === 0) {
            return res.status(404).json({ message: 'Coupon list not found' });
        }
        const totalPages = Math.ceil(totalCoupons / itemsPerPage);
        res.status(200).json({
            couponList,
            currentPage: page,
            totalPages,
            totalItems: totalCoupons
        });
    } catch (error) {
        console.error('Error fetching coupon list:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//------------------------deleted----------------------//
router.get('/deleted/:id',verifyToken, async(req,res)=>{
    Coupon.findByIdAndRemove(req.params.id)
    .then(coupon=>{
        if(coupon){
            return res.status(200).json({success:true, message:'The coupon is deleted successfully'})
          // res.redirect('/coupon/couponList')
        }else{
           return res.status(404).json({success: false, message:'The Coupon is not found'}) 
        }
    }).catch(err=>{
        return res.status(500).json({success: false, error: err}) 
     })
})





module.exports = router;