require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const session = require('express-session');
 

const app = express();
const PORT = process.env.PORT || 8000
//----------session--------//
app.use(session({
    secret: 'your-secret-key', // Replace with a secret key
    resave: false,
    saveUninitialized: true,
  }));
  
//--middleware----//
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());




//------------router handler----------------------//

const categoryRoutes = require('./routers/category');
app.use('/category', categoryRoutes);

const supercategoryRoutes = require('./routers/supercategory');
app.use('/supercategory', supercategoryRoutes);

const productsRoutes = require('./routers/product');
app.use('/product', productsRoutes);

const UserRoutes = require('./routers/User');
app.use('/', UserRoutes);

const CartRoutes = require('./routers/cart');
app.use('/cart', CartRoutes);

const CouponRoutes = require('./routers/coupon');
app.use('/coupon', CouponRoutes);

const orderRoutes = require('./routers/order');
app.use('/order', orderRoutes);

const ShippingRoutes = require('./routers/shipping');
app.use('/shipping', ShippingRoutes);



//------------------mpongoose Database--------------//

// mongoose.connect("mongodb://127.0.0.1:27017/NewEcommerce")
mongoose.connect(process.env.MONGO_URL)
.then(()=>{
    console.log('mongoose connected');
})
.catch((e)=>{
    console.log(e);
})

//-------------------      --------------//

// app.listen(PORT,'localhost',function(err){
//     if(err)return console.log(err);
//     console.log('Listening at http://local:%s',PORT)
// })

app.listen(PORT, '0.0.0.0', function (err) {
    if (err) return console.log(err);
    console.log('Listening at http://localhost:%s', PORT);
 });