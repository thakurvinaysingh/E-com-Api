require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')
const session = require('express-session');
//const MongoDBStore = require('connect-mongodb-session')(session);
 

const app = express();
const PORT = process.env.PORT || 8000
//----------session--------//
// const store = new MongoDBStore({
//     uri: 'mongodb+srv://vinaysingh5497:Roopwati@cluster0.lac7pmr.mongodb.net/?retryWrites=true&w=majority',
//     collection: 'sessions',
//   });
// store.on('error', function (error) {
//     console.log(error);
//   });

app.use(session({
    secret: 'your-secret-key', // Replace with a secret key
    resave: false,
    saveUninitialized: true,
    // store: store,
    // cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, 
  }));
  
//--middleware----//
app.use(cors());
// app.use(express.static('public'));
app.use('/images',express.static('public/uploads'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Add a middleware to handle errors and set a custom timeout
// app.use((req, res, next) => {
//     const customTimeout = 30000; // Set a custom timeout in milliseconds (e.g., 30 seconds)
//     res.setTimeout(customTimeout, () => {
//       res.status(504).send('Request timed out');
//     });
//     next();
//   });

//   app.get('/user1', (req, res) => {
//     res.send('API is up and running!');
//   });
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
//mongodb+srv://vinaysingh5497:ZwppY7HwB7uEzu7h@cluster0.lac7pmr.mongodb.net/?retryWrites=true&w=majority
// mongoose.connect("mongodb://127.0.0.1:27017/NewEcommerce")
// mongodb+srv://vinaysingh5497:<password>@cluster0.lac7pmr.mongodb.net/?retryWrites=true&w=majority
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