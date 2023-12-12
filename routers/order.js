const express = require('express');
const router = express.Router();

const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');
const { Order } = require('../models/order');
const { Coupon } = require('../models/coupon');
const { Shipping } = require('../models/shipping');
const passport = require('passport');
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const verifyToken = require('../routers/jwt');







router.get('/checkout-total/:id',async (req, res) => {
   
    const orderId = req.params.id;
    try {
       
        const orders = await Order.find({_id:orderId }).populate('orderItems');
        if (!orders) {
            return res.status(404).json({ success:true,messge: 'Order not found' });
        }
       
        let totalPrice = 0;
        let totalQuantity = 0;

        for (const order of orders) {
            totalPrice += order.totalPrice; 
            for (const orderItem of order.orderItems) {
                totalQuantity += orderItem.quantity; 
            }
        }

        // Send the calculated data in the response
        res.status(200).json({
            success:true,
            orderId: orderId,
            totalOrderPrice: totalPrice,
            totalOrderQuantity: totalQuantity,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({success:true, message: 'An error occurred while processing the request' });
    }
});



//------User make order details and calculate coupon and total price of products.-----//

router.post('/', verifyToken,async (req, res) => {
    const userId = req.user.userId;
    console.log('userId for coupon:', userId)
    const { orderItems, shippingAddress1, shippingAddress2, city, zip, country, phone, status, user, coupon } = req.body;
    const orderItemsIds = Promise.all(req.body.orderItems.map(async (orderItem) => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product: orderItem.product
        })

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id;
    }))

    const orderItemsIdsResolved = await orderItemsIds;


    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice
    }))
    //------- -----------------------//
   
      
    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);
//tax calculation
    const taxRate = 0.18;
    const taxAmount = totalPrice*taxRate;

    let discountedTotalPrice = totalPrice + taxAmount;
    //----------------------------coupon-------------------------------//

    if (coupon) {
        const couponDoc = await Coupon.findOne({ code: coupon });

        if (couponDoc) {
            if (couponDoc.usedBy.includes(userId)) {
                return res.status(400).json({success:false, message: 'You have already used this coupon' });
            }

            // Mark the coupon as used by the user
            couponDoc.usedBy.push(userId);
            await couponDoc.save();

            const currentDate = new Date();
            if (currentDate <= couponDoc.expirationDate) {
                const discountAmount = (totalPrice * couponDoc.discount) / 100;
                discountedTotalPrice -= discountAmount;
            }
        } else {
            return res.status(404).json({success:false, message: 'Coupon not found' });
        }
    }
    //---------------------------//
    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: discountedTotalPrice,
        user: req.body.user,

    })
    for (const orderItem of req.body.orderItems){
        const product = await Product.findById(orderItem.product);
        if(!product){
            return res.status(404).json({success:false,message:'product not found'});
        }
        if(product.countInStock < orderItem.quantity){
            return res.status(400).json({success:false, message: 'Not enough stock available for ' + product.name })
        }
        product.countInStock -=orderItem.quantity;
        await product.save();
    }
    order = await order.save();

    if (!order)
        return res.status(400).json({success:false,message:'the order cannot be created!'})

    res.json({success:true,
        message:"Order Successfully!".
         order,
         orderId: order._id,
         totalPriceWithTax:discountedTotalPrice,
         totalPrice,taxAmount 
        });

})

//---------------User--------------------------//
router.get(`/get/user`,verifyToken, async (req, res) => {

    const userId = req.user.userId;
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 5;
        const skip = (page - 1) * itemsPerPage;
        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / itemsPerPage);


        const userOrderList = await Order.find({ user: userId }).populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category'
            }
        })
            .sort({ 'dateOrdered': -1 })
            .skip(skip)
            .limit(itemsPerPage);

            if (userOrderList.length === 0) {
                res.status(500).json({ success: false,message:"User List is not found" });
            }
        res.json({
            success: true,
            message:"User List is fetching Successfully!",
            Data: userOrderList,
            currentPage: page,
            totalPages,
            totalItems: totalOrders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message })
    }

})

//==================user pdf==============================================//

router.get('/pdf/user',verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId; // Get the userId from query parameters

        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        const userOrders = await Order.find({ user: userId })
            .populate({
                path: 'orderItems',
                populate: {
                    path: 'product',
                    populate: 'category'
                }
            })
            .sort({ dateOrdered: -1 });

        const doc = new PDFDocument();

        doc.fontSize(25).text('Order Details', 235, 100);

        if (Array.isArray(userOrders) && userOrders.length > 0) {
            const pageWidth = doc.page.width;
            const tableWidth = 550; // Total table width (adjust as needed)
            const startX = (pageWidth - tableWidth) / 2; // Center-align the table
            const startY = 150;
            const cellHeight = 30;
            const rowSpacing = 10;
            const maxRowsPerPage = 5; // Number of rows to display on each page

            let currentY = startY;

            for (let i = 0; i < userOrders.length; i++) {
                if (i % maxRowsPerPage === 0 && i !== 0) {
                    // Start a new page
                    doc.addPage();
                    doc.fontSize(25).text('Order Details', 235, 100);
                    currentY = startY;
                }

                // Draw the table header
                if (i % maxRowsPerPage === 0 || i === 0) {
                    doc.rect(startX, currentY, 550, cellHeight).fill('lightgray');
                    doc.rect(startX, currentY, 100, cellHeight).fill('lightgray');
                    doc.rect(startX + 100, currentY, 100, cellHeight).fill('lightgray');
                    doc.rect(startX + 200, currentY, 100, cellHeight).fill('lightgray');
                    doc.rect(startX + 300, currentY, 100, cellHeight).fill('lightgray');
                    doc.rect(startX + 400, currentY, 150, cellHeight).fill('lightgray');
                    doc.fontSize(12);
                    doc.fillColor('black');
                    doc.text('Order ID', startX + 10, currentY + 10);
                    doc.text('User Date', startX + 150, currentY + 10);
                    doc.text('Total Price', startX + 240, currentY + 10);
                    doc.text('Product Name', startX + 320, currentY + 10);
                    doc.text('Category', startX + 420, currentY + 10);
                    doc.text('Quantity', startX + 510, currentY + 10);
                }

                // Draw the table rows
                currentY += cellHeight + rowSpacing;
                doc.rect(startX, currentY, 550, cellHeight).fill(i % 2 === 0 ? 'lightgray' : 'white');
                doc.fontSize(10);
                doc.fillColor('black');
                doc.text(userOrders[i]._id.toString(), startX + 10, currentY + 5);

                const dateOrdered = new Date(userOrders[i].dateOrdered);
                doc.text(dateOrdered.toDateString(), startX + 150, currentY + 5);
                doc.text(userOrders[i].totalPrice.toString(), startX + 240, currentY + 5);

                // Iterate over order items and display each item in a row
                let rowY = currentY + 5;
                userOrders[i].orderItems.forEach((orderItem) => {
                    doc.text(orderItem.product.name, startX + 320, rowY);
                    doc.text(orderItem.product.category.name, startX + 420, rowY);
                    doc.text(orderItem.quantity.toString(), startX + 510, rowY);
                    rowY += cellHeight + rowSpacing;
                });

                // Calculate the maximum row height for this set of order items
                const maxHeight = Math.max(
                    cellHeight,
                    (userOrders[i].orderItems.length * (cellHeight + rowSpacing)) - rowSpacing
                );

                // Adjust the currentY to accommodate the maximum row height
                currentY += maxHeight;
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="UserOrderPdf.pdf"');

        doc.pipe(res);
        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});


//----------------Admin display the ist of All user------------------//

router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        let itemsPerPage = parseInt(req.query.itemsPerPage);
        
        // Validate and set a default value for itemsPerPage
        if (isNaN(itemsPerPage) || itemsPerPage <= 0) {
            itemsPerPage = 10; // Set a default value or return an error response
        }
        
        const skip = (page - 1) * itemsPerPage;
        const totalOrder = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrder / itemsPerPage);

        const orderList = await Order.find()
            .populate('user', 'name')
            .sort({ 'dateOrdered': -1 })
            .skip(skip)
            .limit(itemsPerPage);

        // Check if orderList is an empty array
        if (orderList.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders found.'
            });
        }

        res.json({
            success: true,
            message:"List successfully!",
            orderList,
            currentPage: page,
            totalPages,
            totalItems: totalOrder
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//---------------update order Admin------------------//

router.post('/update/:id',verifyToken, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status
            },
            { new: true }
        )
    
        if (!order)
            return res.status(400).json({success:true,message:'the order cannot be update!'})
    
        res.json({success:true,message:"Order Update Successfully!",Data:order}); 
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,message:"Internal Server Error"})
    }
   
    
})

//------order delete-by Admin---------//
router.get('/delete/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if (order) {
            await order.orderItems.map(async orderItem => {
                await OrderItem.findByIdAndRemove(orderItem)
            })
            return res.status(200).json({success: true, message: 'the order is deleted!'})
        } else {
            return res.status(404).json({ success: false, message: "order not found!" })
        }
    }).catch(err => {
        return res.status(500).json({ success: false, error: err })
    })
})

//-------display Admin dashboard-------------//

router.get('/totalsales',verifyToken, async (req, res) => {
    try {
        const totalSales = await Order.aggregate([
            { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
        ])
    
        if (!totalSales) {
            return res.status(400).json({success:false,message:'The order sales cannot be generated'})
        }
    
        res.json({success:true,
            message:"TotalSales fetching data Successfully!",
            totalsales: totalSales.pop().totalsales
         })   
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,message:"Internal Server Error"}) 
    }
    
})

//----------Admin dsiplay dashbaord-----------//
router.get('/count',verifyToken, async (req, res) =>{
    try {
        const orderCount = await Order.estimatedDocumentCount()

        if(!orderCount) {
            res.status(500).json({success:false,message:"Order is not Count!"})
        } 
        res.json({
            success:true,
            message:"Total Count fetching Successfully!",
            Data: orderCount
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({success:false,message:"Internal Server Error"})  
    }
  
})


//================= this is single order view for Admin only=========== //
router.get(`/admin/single/:id`,verifyToken, async (req, res) => {

    const orderId = req.params.id;
    console.log('orderId:', orderId); 
    try {
       
        const userOrder = await Order.findOne({ _id: orderId }).populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category'
            }
        })
           
        if (!userOrder) {
            res.status(500).json({ success: false, message: 'Order not found' })
        }else{
        res.json({
            success: true,
            message:"Ordeer Fetching Successfully!",
            Data: userOrder,
          
        });
    }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false,message:"Internal server Error" })
    }

})

//====================pdf Admin download============================//
router.get('/pdf/admin',verifyToken, async (req, res) => {
    try {
        const userOrders = await Order.find({})
        .populate({
            path: 'user', 
            select: 'name' 
        })
        .sort({ dateOrdered: -1 });
        
        const doc = new PDFDocument();
        
        doc.fontSize(25).text('Order Details', 235, 100);

        if (Array.isArray(userOrders) && userOrders.length > 0) {
            const pageWidth = doc.page.width;
            const tableWidth = 4 * 150; // Total table width (4 columns)

            // Calculate the starting X-coordinate to center-align the table
            const startX = (pageWidth - tableWidth) / 2;
            const startY = 150;
            const cellWidth = 150;
            const cellHeight = 30;
            const headerHeight = 40;
            const rowSpacing = 10;
            const maxRowsPerPage = 12; // Number of rows to display on each page

            // Define table headers
            doc.rect(startX, startY, cellWidth, headerHeight).fill('lightgray');
            doc.rect(startX + cellWidth, startY, cellWidth, headerHeight).fill('lightgray');
            doc.rect(startX + 2 * cellWidth, startY, cellWidth, headerHeight).fill('lightgray');
            doc.rect(startX + 3 * cellWidth, startY, cellWidth, headerHeight).fill('lightgray');

            doc.fontSize(12);
            doc.fillColor('black');
            doc.text('Order ID', startX, startY + 10);
            doc.text('User Date', startX + cellWidth, startY + 10);
            doc.text('User Status', startX + 2 * cellWidth, startY + 10);
            doc.text('User Name', startX + 3 * cellWidth, startY + 10);

            let currentY = startY + headerHeight + rowSpacing;

            for (let i = 0; i < userOrders.length; i++) {
                if (i % maxRowsPerPage === 0 && i !== 0) {
                    // Start a new page
                    doc.addPage();
                    doc.fontSize(25).text('Order Details', 235, 100);

                    // Define table headers on the new page
                    doc.rect(startX, startY, cellWidth, headerHeight).fill('lightgray');
                    doc.rect(startX + cellWidth, startY, cellWidth, headerHeight).fill('lightgray');
                    doc.rect(startX + 2 * cellWidth, startY, cellWidth, headerHeight).fill('lightgray');
                    doc.rect(startX + 3 * cellWidth, startY, cellWidth, headerHeight).fill('lightgray');

                    doc.fontSize(12);
                    doc.fillColor('black');
                    doc.text('Order ID', startX, startY + 10);
                    doc.text('User Date', startX + cellWidth, startY + 10);
                    doc.text('User Status', startX + 2 * cellWidth, startY + 10);
                    doc.text('User Name', startX + 3 * cellWidth, startY + 10);

                    currentY = startY + headerHeight + rowSpacing;
                }

                // Draw alternating row background colors for better readability
                if (i % 2 === 0) {
                    doc.rect(startX, currentY, 4 * cellWidth, cellHeight).fill('lightgray');
                }

                doc.fontSize(10);
                doc.fillColor('black');
                doc.text(userOrders[i]._id.toString(), startX + 10, currentY + 5);

                // Display only the date part (not time) from the dateOrdered field
                const dateOrdered = new Date(userOrders[i].dateOrdered);
                doc.text(dateOrdered.toDateString(), startX + cellWidth + 10, currentY + 5);

                doc.text(userOrders[i].status.toString(), startX + 2 * cellWidth + 10, currentY + 5);
                doc.text(userOrders[i].user.name.toString(), startX + 3 * cellWidth + 10, currentY + 5);

                currentY += cellHeight + rowSpacing;
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="OrderPdf.pdf"');

        // Pipe the PDF document directly to the response
        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});


//-----------------------puppeteer pdf-----------------------------------------//

// router.get('/pdf/order', async (req, res) => {
//     try {
       
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();
//         await page.authenticate({ email: 'demo2@gmail.com', password: '123' });
//         await page.goto('http://localhost:8000/order/OrderUser', {
//             waitUntil: 'networkidle2'
//         });
//         await page.setViewport({ width: 1080, height: 1024 });
//         const todayDate = new Date();

//         const pdfBuffer = await page.pdf({
//             format: "A4"
//         });

//         await browser.close();

//         const pdfFilePath = path.join(__dirname, '../public/uploads/files', todayDate.getTime() + '.pdf');

//         // Save the PDF to a file
//         await fs.promises.writeFile(pdfFilePath, pdfBuffer);

//         res.set({
//             'Content-Type': 'application/pdf',
//             'Content-Length': pdfBuffer.length
//         });

//         res.sendFile(pdfFilePath);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// }); 



module.exports = router;