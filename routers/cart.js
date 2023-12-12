const express = require('express');
const router = express.Router();
const { Cart } = require('../models/Cart');
const { User } = require('../models/User');
const verifyToken = require('../routers/jwt');




//----Useronly-Cart Show All-list with totalprice and quantity--------//

router.get('/all-list', verifyToken, async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            console.error('Error: User is not authenticated');
            return res.status(401).json({ error: 'User is not authenticated' });
        }

        const userId = user.userId;
        const allCart = await Cart.find({ user: userId }).populate('product');

        if (allCart.length === 0) {
            return res.status(404).json({ message: 'Cart is empty' });
        }

        let totalPrice = 0;
        // for (const cartItem of allCart) {
        //     totalPrice += cartItem.product.price * cartItem.quantity;
        // }
        let missingPrices = [];

        for (const cartItem of allCart) {
            
            if (cartItem.product && cartItem.product.price) {
                totalPrice += cartItem.product.price * cartItem.quantity;
            } else {
                console.error('Error: Product price is missing for cart item', cartItem._id);
              
                missingPrices.push({ itemId: cartItem._id, productName: cartItem.product.name });
            }
        }

        const response = {
            success:true,
            Data:{
                cartItems: allCart,
                totalPrice: totalPrice,
                missingPrices: missingPrices,
            }
            
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching cart details:', error);
        res.status(500).json({success:false, error: 'Failed to fetch cart details' });
    }
});


//----------User Add cart by clicking on Add to cart button-----------//


router.post('/Add_To_Cart/:productId', verifyToken, async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.user.userId;
        console.log(userId);

        if (!productId || !userId) {
            return res.status(400).json({ message: 'Invalid product or user ID' });
        }
        const existingCart = await Cart.findOne({ product: productId, user: userId });
        if (existingCart) {
            existingCart.quantity += 1;
            await existingCart.save();
        } else {
            const orderCart = new Cart({
                product: productId,
                user: userId,
                quantity: 1,
            });
            if (!orderCart) {
                return res.status(500).json({ message: 'Cart is not successfully' })
            }
            await orderCart.save();

        }
        res.json({ message: 'Cart item added successfully' });
    } catch (error) {
        console.error('Error adding order item:', error);
        res.status(500).json({ error: 'Failed to add order item' });
    }
});
//----------------return the all productid--for order checkout-----------//
router.get('/return-cartitems', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cartItems = await Cart.find({ user: userId });


        const productData = cartItems.map(cartItem => {
            return {
                product: cartItem.product,
                quantity: cartItem.quantity,
            };
        });

        res.json({ userCart: productData });
    } catch (error) {
        console.error('Error fetching user cart:', error);
        res.status(500).json({ error: 'Failed to fetch user cart' });
    }
});

// ------permanenet-Remove-Cart form user dashboard---------------//
router.get('/delete/:id', verifyToken, async (req, res) => {
    Cart.findByIdAndRemove(req.params.id).then(cart => {
        if (cart) {
            res.status(200).json({ success: true, message: 'deleted cart items.' })
        } else {
            return res.status(404).json({ success: false, message: 'cart is not found' })
        }
    }).catch(err => {
        return res.status(500).json({ success: false, message: 'cart is not found in catch' })
    })
})

// ----(-)button---Remove quantity--------------//

router.get('/remove/:id',verifyToken, async (req, res) => {
    const itemId = req.params.id;
    const quantityToReduce = 1;
    try {
        const cartItem = await Cart.findById(itemId)
        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'cart is not found' })
        }
        if (cartItem.quantity <= quantityToReduce) {
            await Cart.findByIdAndRemove(itemId);
            return res.status(200).json({ success: true, message: 'Cart item remove successfully' });
        } else {
            cartItem.quantity -= quantityToReduce;
            await cartItem.save();
            res.status(200).json({ success: true, message: 'Quantity reduced in cart Items' })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'error in Internal' })
    }
})
//----------(+)button---add quantity-----------//
router.get('/add/:id',verifyToken, async (req, res) => {
    //-----productId-----------//
    const itemId = req.params.id;
    const quantityToAdd = 1;
    try {
        const cartItem = await Cart.findById(itemId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'cart is not found' });
        }
        cartItem.quantity += quantityToAdd;
        await cartItem.save();
        res.status(200).json({ success: true, message: 'Add quantity successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal error' })
    }
})
module.exports = router;