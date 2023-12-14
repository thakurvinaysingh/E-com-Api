const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('./jwt');
const { Supercategory } = require('../models/super-category');
const { model } = require('mongoose');

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
const uploadOptions = multer({ storage: storage });

router.post('/', uploadOptions.single('image'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "No image Found" })
        }
        const fileName = file.filename
        const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
        //checking duplicated name //
        const existingSupercategory = await Supercategory.findOne({ name: req.body.name.toLowerCase() })
        console.log(`${basePath}${fileName}`);

        if (existingSupercategory) {
            return res.status(422).json({ success: false, message: `This super-category "${req.body.name}" is already exists` });
        }

        let supercategory = new Supercategory({
            name: req.body.name.toLowerCase(),
            image: `${basePath}${fileName}`,
        })
       
        supercategory = await supercategory.save();
        if (!supercategory) {
            return res.status(422).json({ success: false, message: "SuperCategory is not Created!" })
        }
        res.status(200).json({ success: true, message: "Successfully Created SuperCategory", Data: supercategory })
        console.log('File received:', fileName);
        console.log('Base path:', basePath);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }
})

router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const skip = (page - 1) * itemsPerPage;
        const totalsupercategory = await Supercategory.countDocuments();
        const totalPages = Math.ceil(totalsupercategory / itemsPerPage);

        const supercategorylist = await Supercategory.find().skip(skip).limit(itemsPerPage).exec();
        if (!supercategorylist) {
            return res.status(400).json({ success: false, message: "SuperCategory is not Found the List" })
        }
        res.status(200).json({
            success: true,
            Data: {
                list: supercategorylist,
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalsupercategory
            }

        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
})

router.post('/update/:id', async (req, res) => {
    try {
        let updatesupercategory = await Supercategory.findByIdAndUpdate(
            req.params.id, {
            name: req.body.name
        },
            { new: true }
        )
        if (!updatesupercategory) {
            return res.status(400).json({ success: false, message: "SuperCategory is failed to update" })
        }
        res.status(200).json({ success: true, message: "SuperCategory is Successfully Update", updatesupercategory })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" })
    }
})


router.get('/delete/:id', async (req, res) => {
    try {
        const deletesupercategory = await Supercategory.findByIdAndRemove(req.params.id)
        if (!deletesupercategory) {
            return res.status(400).json({ success: true, message: "Deleted Items is Failed" })
        }
        res.status(200).json({ success: true, message: "Delete Item successfully", Data: deletesupercategory })

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
})

// router.post('/', uploadOptions.single('image'), async (req, res) => {
//     try {
//         const file = req.file;
//         if (!file) {
//             return res.status(400).json({ success: true, message: "No image Found" })
//         }
//         const fileName = file.filename
//         const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
//         //checking duplicated name //
//         const super_check = await Supercategory.find({ _id: req.body._id })
//         if (super_check.length > 0) {
//             let checking = false;
//             for (i = 0; i < super_check.length; i++) {
//                 if (super_check[i]['name'].toLowerCase() === req.body.name.toLowerCase()) {
//                     checking = true;
//                     break;
//                 }
//             }
//             if (checking === false) {
//                 let supercategory = new Supercategory({
//                     name: req.body.name,
//                     image: `${basePath}${fileName}`,
//                 })
//                 supercategory = await supercategory.save();
//                 if (!supercategory) {
//                     return res.status(422).json({ success: false, message: "SuperCategory is not Created!" })
//                 }
//                 res.status(200).json({ success: true, message: "Successfully Created SuperCategory", Data: supercategory })
//             } else {
//                 return res.status(422).json({ success: false, message: "this super-category  is (" + req.body.name + ") is already exists" })
//             }
//         } else {
//             let supercategory = new Supercategory({
//                 name: req.body.name,
//                 image: `${basePath}${fileName}`,
//             })
//             supercategory = await supercategory.save();
//             if (!supercategory) {
//                 return res.status(422).json({ success: false, message: "SuperCategory is not Created!" })
//             }
//             res.status(200).json({ success: true, message: "Successfully Created SuperCategory", Data: supercategory })
//         }

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, message: "Internal Server Error" })
//     }
// })


module.exports = router;