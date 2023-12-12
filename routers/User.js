const express = require("express");
const router = express.Router();
const mongoose = require("mongoose")
const { User } = require('../models/User');
const { Coupon } = require('../models/coupon');
const { Order } = require('../models/order');
const { Product } = require('../models/product');

const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')
const Key = 'SecretKey';
const verifyToken = require('../routers/jwt');
const flash = require("express-flash")
const crypto = require('crypto');
const multer = require('multer');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
// const bcrypt = require('bcrypt');


router.use(flash());




//----------------images---------------------------//
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {

        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
})

const uploadOptions = multer({ storage: storage })
//==============searching api =====================//





//----------------Register---for user------------------//

router.post('/register', async (req, res) => {
    try {
        const { password, cpassword } = req.body;

        if (password !== cpassword) {
            return res.status(400).json({ success: true, message: "Passwords do not match" });

        }
        console.log(req.body.password);

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        console.log(req.body.password);

        const data = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            country: req.body.country,
            state: req.body.state,
            city: req.body.city,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
        };

        const check = await User.findOne({ email: req.body.email });

        if (check) {
            return res.status(400).json({ success:false, message: 'Email is already registered' });
        }

        const newUser = new User(data);
        await newUser.save();
        res.status(200).json({ success: true, message: 'the User Register Successfully!'})
    } catch (error) {
        console.log(error);
       return res.status(500).json({success:false,message:"Internal Server Error"})
    }
});

//----------------------login------------------//

router.post('/login', (req, res, next) => {
    User.find({ email: req.body.email }).exec()
        .then(user => {
            if (user.length < 1) {
                return res.status(401).json({
                    success:false,
                    message: "user not found"
                })
            }
            bcrypt.compare(req.body.password, user[0].password, (err, result) => {
                if (!result) {
                    return res.status(400).json({success:false,
                    message: 'password do not match' })
                }
                if (result) {
                    const token = jwt.sign({
                        userId: user[0]._id,
                        name: user[0].name,
                        isAdmin: user[0].isAdmin,
                        email: user[0].email,
                        phone: user[0].phone,
                    },
                        Key,
                        {
                            expiresIn: '24h'
                        }
                    );
                    res.status(200).json({
                        success:true,
                        message:"User Register is Successfully!",
                        userId: user[0]._id,
                        name: user[0].name,
                        isAdmin: user[0].isAdmin,
                        email: user[0].email,
                        phone: user[0].phone,
                        token: token,
                    })

                }

            })
        }).catch(err => {
            console.error(err);
            res.status(500).json({
                success: false, message: "Internal Server Error"
            })
        })
})

//----------update User and Admin-------------//

router.post('/user-admin', verifyToken, uploadOptions.single('image'), async (req, res) => {

    const userId = req.user.userId;
    const file = req.file;
    const updateUser = {};
    if (req.body.name) {
        updateUser.name = req.body.name;
    };
    if (file) {
        const fileName = file.filename;
        updateUser.image = fileName;

    }

    if (req.body.email) {
        updateUser.email = req.body.email;
    }

    try {
        const data = await User.updateOne({ _id: userId }, { $set: updateUser });
        if (data.acknowledged) {

            res.status(200).json({ success: true, message: "User data updated successfully." });
        } else {

            res.status(500).json({ success:false, message: "Failed to update user data." });
        }
    } catch (error) {
        console.log(error);
        req.status(500).json({ success:false, message: "Internal Server Error" })
    }
})


//--------searching Api for User-----------------//
router.get('/search/:key', async (req, res) => {
    console.log(req.params.key);
    try {
        const price = parseFloat(req.params.key);

        if (!isNaN(price)) {

            let data = await Product.find({
                $or: [
                    { name: { $regex: req.params.key, $options: 'i' } },
                    { brand: { $regex: req.params.key, $options: 'i' } },
                    { price: { $eq: price } },
                ]
            });
            res.json({ success: true, message: "Data is fetching successfully!", Data: data });
        } else {

            let data = await Product.find({
                $or: [
                    { name: { $regex: req.params.key, $options: 'i' } },
                    { brand: { $regex: req.params.key, $options: 'i' } },
                ]
            });
            res.json({ success: true, message: "Data is fetching successfully!", Data: data });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
//==============searching api =====================//







// --------fetch all User database -----------//
router.get('/Usertables', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 5;
        const skip = (page - 1) * itemsPerPage;
        const totalUser = await User.countDocuments();
        const totalPages = Math.ceil(totalUser / itemsPerPage);

        const UserList = await User.find().skip(skip).limit(itemsPerPage);
        if (!UserList) {
            res.status(404).json({ success: false, message: "User List is not Found" })
        } else {

            res.status(200).json({
                success: true,
                message: "user List is fetching Suceesfully!",
                UserList: UserList,
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalUser
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }

})
// ----------deleted User-------------------------//

// router.get('/user/deleted/:id', (req, res) => {
//     const userId = req.params.id;
//     Ecommercetable.findById(userId)
//         .then(user => {
//             if (!user) {
//                 return res.status(404).json({ success: false, message: "User not found!" });
//             }

//             if (user.isAdmin === false) {
//                 Ecommercetable.findByIdAndRemove(userId)
//                     .then(() => {
//                         // return res.status(200).json({success: true, message: 'the User is deleted!'})
//                         res.redirect('/Usertables');
//                     })
//                     .catch(err => {
//                         return res.status(500).json({ success: false, error: err });
//                     });
//             } else if (user.isAdmin === true) {
//                 return res.status(403).json({ success: false, message: "Admin is not allowed to delete!" });
//             }
//         })
//         .catch(error => {
//             return res.status(500).json({ success: false, error: error });
//         });
// });
// ---------------update User------------------------------------//
// router.get('/userUpdate/:id', async (req, res) => {
//     const user = await User.findById(req.params.id)

//     res.render('UpdateUser.ejs', { user: user })
// })
// ==============update User single============//

router.post('/user/Update/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Product Id' })
        }
        let user = await User.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                email: req.body.email,
                country: req.body.country,
                state: req.body.state,
                city: req.body.city,
                phone: req.body.phone,
                isAdmin: req.body.isAdmin,
            },
            { new: true }
        )
    
        if (!user)
            return res.status(500).json({ success: false, message: 'the User cannot be updated!' })
    
        res.status(200).json({ success: true, message: "User is update Successfully!" })  
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  
})
//----------set discount for User-----------//

//-----------logout----------------//
// router.delete("/logout", (req, res) => {
//     req.logout(req.user, err => {
//         if (err) return next(err)
//         res.redirect("/")
//     })

// })


//----------------reset the password------------------------//
router.post("/resetpassword", async (req, res) => {
    const email = req.body.email;

    try {
        const user = await User.findOne({ email }).exec();
        if (user) {
            const newPassword = randomstring.generate({
                length: 10,
                numbers: true,
                symbols: false,
                uppercase: true,
                strict: true
            });

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            console.log(hashedPassword);
            await user.save();

            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    user: 'vinay.singh5497@gmail.com',
                    pass: 'bcackyyamyacslqa'
                }
            });

            const message = {
                from: "vinay.singh5497@gmail.com",
                to: email,
                subject: "Password Reset",
                // text: `Your new password is: ${newPassword}`
                html: `
          <h3>Hello</h3>
          <p>Email:${req.body.email}</p>
          <p>Your new Password :</p>
          <p>Password:${newPassword}</p>
        
          <p>Please keep your account details secure.</p>
          <p>Please Login Your new Password </p>
        `,
            };

            transporter.sendMail(message, (error, info) => {
                //         if (error) {
                //             console.log("Error sending email:", error);
                //         } else {
                //             console.log("Email sent:", info.response);
                //         }
                //     });

                //     req.flash("error", "Password reset successful. Check your email for the new password. ");
                //     res.redirect("/");
                // } else {
                //     req.flash("error", "User not found Try Again");
                //     res.redirect("/");
                // }
                if (error) {
                    console.log('Error sending email:', error);
                    res.status(500).json({ success: false, message: 'Failed to send reset email.' });
                } else {
                    console.log('Email sent:', info.response);
                    res.status(200).json({ success: true, message: 'Password reset successful. Check your email for the new password.' });
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'User not found. Try again.' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"Internal Server Error"})

    }
});

//chnage password user- and Admin-----
router.post('/changepassword', verifyToken, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    try {
        // Find the admin by their ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'user not found' });
        }
        // Check if the current password is a random password
        const randomPasswordMatch = currentPassword === user.password;

        if (!randomPasswordMatch) {
            // Verify the current password
            const passwordMatch = await bcrypt.compare(currentPassword, user.password);
            console.log('Password Match Result:', passwordMatch);
            if (!passwordMatch) {
                return res.status(400).json({ success: false, message: 'Invalid current password' });
            }
            else {
                if (newPassword !== confirmPassword) {
                    return res.status(400).json({ success: false, message: 'Passwords do not match' });
                }
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                // Update the admin's password
                user.password = hashedPassword;
                await user.save();

                res.status(200).json({success:true,message:"Password is change Successfully!"})
            }
        } else {

            if (newPassword !== confirmPassword) {
                return res.status(400).json({success:false,message:'Passwords do not match'});
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update the admin's password
            user.password = hashedPassword;
            await user.save();

            res.status(200).json({success:true,message:"Password is change Successfully!"})
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:'An error occurred'});
    }
});

router.post('/logout', verifyToken, (req, res) => {
    const user = req.user.userId
    if (user) {
        res.status(200).json({ success: true, message: 'Logout successful' });
    } else {
        res.status(401).json({ success: false, message: 'User not authenticated' });
    }
});

module.exports = router;
