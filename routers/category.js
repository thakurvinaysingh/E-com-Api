const express = require('express');
const router = express.Router();
const { Category } = require('../models/category');
const multer = require('multer');
const verifyToken = require('./jwt');
const { Supercategory } = require('../models/super-category');



// --------------image of category ---------//
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
// --------------image of category ---------//
// --------category create -----------------//
router.post('/', uploadOptions.single('image'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json('No image in the request')

        const fileName = file.filename
        const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
        //check don't create duplicate enter in same super category
        const check = await Category.find({ supercategory: req.body.supercategory});  
        if (check.length > 0) {
            
                   let checking = false;
               for(i=0; i<check.length; i++){
                if(check[i]['name'].toLowerCase() === req.body.name.toLowerCase()){
                    console.log("true")
                    checking = true;
                    break;
                }
               }
               if(checking === false){
                let category = new Category({
                    supercategory: req.body.supercategory,
                    name: req.body.name,
                    icon: req.body.icon,
                    color: req.body.color,
                    image: `${basePath}${fileName}`,
                })
                category = await category.save();
        
                if (!category) {
                    return res.status(400).json({ success: false, message: "Category is not Found" })
                }
                res.status(200).json({ success: true, message: "Category is Created Successfully!", Data: category });
               }else{
                return res.status(422).json({ success: false, message: "this Category  is (" + req.body.name + ") is already exists" })
               }
        }else{
            console.log("direct")
            let category = new Category({
                supercategory: req.body.supercategory,
                name: req.body.name,
                icon: req.body.icon,
                color: req.body.color,
                image: `${basePath}${fileName}`,
            })
            category = await category.save();
    
            if (!category) {
                return res.status(400).json({ success: false, message: "Category is not Found" })
            }
            res.status(200).json({ success: true, message: "Category is Created Successfully!", Data: category });
        }
      
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }

})

// ------display the category in dropdown ---//
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const skip = (page - 1) * itemsPerPage;
        const totalCategory = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategory / itemsPerPage);

        const categoryList = await Category.find().skip(skip).limit(itemsPerPage);

        if (!categoryList) {
            res.status(404).json({ success: false })
        }
        res.status(200).json({
            success: true,
            Data: categoryList,
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalCategory
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message })
    }

})
// ---------deleted category -----------//
router.get('/delete/:id', verifyToken, (req, res) => {
    Category.findByIdAndRemove(req.params.id)
        .then((category) => {
            if (category) {
                return res.status(200).json({ success: true, message: 'The category is deleted!' });

            } else {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ success: false, error: err.message });
        });
});

// ---------------update category----------------//
router.post('/update/:id', uploadOptions.single('image'), verifyToken, async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).send('No image in the request')

    const fileName = file.filename
    const basePath = `${req.protocol}://${req.get('host')}/uploads/`;

    const categoryId = req.params.id
    const category = {
        name: req.body.name,
        icon: req.body.icon || category.icon,
        color: req.body.color,
        image: `${basePath}${fileName}`,

    }

    if (!categoryId)
        return res.status(400).send('the category cannot be created!')
    if (categoryId) {
        await Category.updateOne({ _id: categoryId }, { $set: category });
    }
    // res.redirect('/category/table')
    res.status(200).json({ success: true, message: 'the Update category is successfully!' })
})

//----------single category display for update or any things------//
router.get('/single/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

//------------------------------------------------------------------------
module.exports = router;