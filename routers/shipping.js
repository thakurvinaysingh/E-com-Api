const express = require('express');
const router = express.Router();
const { Shipping } = require('../models/shipping');
const { Order } = require('../models/order');

//----render the pages-------------------------//
router.get('/created',async(req,res)=>{
    res.render('Shipping')
})
router.get('/list',async(req,res)=>{
    res.render('shippingList')
})

// router.get('/Created',async(req,res)=>{
//     res.render('Shipping')
// })

//----create a new shipping charge
router.post('/created', async (req,res)=>{
   try {
    const {
        carrier,
        estimatedDeliveryDate,
        weight,
        destination,
        charge,
      } = req.body;

      const shipping = new Shipping({
        carrier,
        estimatedDeliveryDate,
        weight,
        destination,
        charge,
      });
       await shipping.save();
       res.status(200).json({shipping});

   } catch (error) {
    console.log(error);
    res.status(500).json({success: false , message: "shipping charge not created!"})
   }   
})
// ----------To retrieve a list of Shipping----//
router.get('/apiList', async (req,res)=>{
      try {
       const shippinglist = await Shipping.find();
       res.status(200).json({shippinglist}); 
      } catch (error) {
        console.log(error);
        res.status(500).json({success: false , message: "shipping charge not found!"})
      }
})
//--------to retrieve a specific shipping charge----//

router.get('/singleList/:id', async (req,res)=>{
   try {
    const shipping = await Shipping.findById(req.params.id);
    if(!shipping){
        return res.status(404).json({success: false , message: "shipping charge not found!"})
    }
    res.status(200).json({shipping});
   } catch (error) {
    console.log(error)
    res.status(500).json({success: false , message: "shipping charge not found!"})
   }   
})

//-----To update a shipping charge-----//

router.post('/update/:id',async (req, res)=> {

      const shippingId= req.params.id
        const shipping = {
            carrier: req.body.carrier,
            estimatedDeliveryDate: req.body.estimatedDeliveryDate,
            weight: req.body.weight,
            destination: req.body.destination,
            charge: req.body.charge,
            
        }       

    if(!shippingId)
    return res.status(400).send('the shipping charge cannot be created!')
    if(shippingId){
        await Shipping.updateOne({ _id: shippingId }, { $set: shipping });
    }
    res.status(200).json({shipping})
})
//---------deleted Api for single shipping charge ------//

router.get('/deleted/:id', (req, res)=>{
    Shipping.findByIdAndRemove(req.params.id).then(shipping =>{
        if(shipping) {
         return res.status(200).json({success: true, message: 'the shipping charge is deleted!'})
          //  res.redirect('/')
        } else {
            return res.status(404).json({success: false , message: " the shipping charge not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})



module.exports = router;