const express = require("express");
const router = express.Router();
const mongoose = require("mongoose")
//const{Ecommercetable} = require("./mongodb");
const { Product } = require('../models/product');
const { Category } = require('../models/category');
const multer = require('multer');
const verifyToken = require("./jwt");




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
// router.use(express.static('public'));


//---------User--data display according to the category store in the data---//
router.get('/display', async (req, res) => {
  try {
    let filter = {
      isActive: true,
    };
    if (req.query.categoryId) {
      filter.category = req.query.categoryId.split(',');
    }
    if (req.query.supercategoryId) {
      const categories = await Category.find({ supercategory: req.query.supercategoryId });
      const categoryIds = categories.map(category => category._id);
      filter.category = { $in: categoryIds };
    }
    //-------------------------------------------//
    // let filter = {
    // };
  
    // if(req.query.categories)
    // {
    //      filter = {category: req.query.categories.split(',')}
    // }
  
//const productList = await Product.find(filter).populate('category').populate({path:'category',populate:'supercategory'});
const productList = await Product.find(filter)
  .populate({
    path: 'category',
    populate: {
      path: 'supercategory',
    },
  });

    if (!productList) {
      res.status(500).json({ success: false,message:"The Product List not Found" })
    }
    if(productList.length === 0){
      res.status(500).json({ success: false, message: "The Product List not Found" });
    }
    res.json({success:true,message:"data is fetching Successfully!",Data:productList});
  } catch (error) {
    console.error( error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
  
})

// ----------------//
// router.get('/display', async (req, res) => {
//   try {
//     let filter = {
//       isActive: true,
//     };
//     if (req.query.categories) {
//       filter.category = req.query.categories.split(',');
//     }
//     //-------------------------------------------//
//     // let filter = {
//     // };
  
//     // if(req.query.categories)
//     // {
//     //      filter = {category: req.query.categories.split(',')}
//     // }
  
//     const productList = await Product.find(filter).populate('category');
  
//     if (!productList) {
//       res.status(500).json({ success: false,message:"The Product List not Found" })
//     }
//     res.json({success:true,Data:productList});
//   } catch (error) {
//     console.error( error);
//       res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
  
// })

//----------------------------------User-single product--------------------------------------//

router.get('/single/:id', async (req, res) => {
  try {
      const product = await Product.findById(req.params.id);

      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      res.status(200).json({ success: true,message:"Product fetching successfully!",Data:product });
  } catch (error) {
      console.error('Error fetching product details:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});




//-----------data display according to the category store in the data---//

//-----------Admin-productList admin--------//
router.get('/list-tables',verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage);
    const skip = (page - 1) * itemsPerPage;
    const totalProduct = await Product.countDocuments();
    const totalPages = Math.ceil(totalProduct / itemsPerPage);

    const productTableList = await Product.find().skip(skip).limit(itemsPerPage);

    if (!productTableList) {
      res.status(404).json({ success: false,message:"The Product Table List is Not Found"})
    }
    res.status(200).json({
      success: true,
      message:"Products list fetching successfully!",
      Data: productTableList,
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalProduct

    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false,message:"Internal Server Error" })
  }
})

//-----------Admin-product created by admin--------//

router.post('/', uploadOptions.single('image'),verifyToken, async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
  if (!category) return res.status(400).send('Invalid Category')

  const file = req.file;
  if (!file) return res.status(400).send('No image in the request')
  const isFeaturedValue = req.body.isFeatured === 'on' ? true : false;

  const fileName = file.filename
  const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
  let product = new Product({
    name: req.body.name,
    description: req.body.description,
    richDescription: req.body.richDescription,
    image: `${basePath}${fileName}`,
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    countInStock: req.body.countInStock,
    rating: req.body.rating,
    numReviews: req.body.numReviews,
    isFeatured: isFeaturedValue,
  })

  product = await product.save();

  if (!product)
    return res.status(500).json({success:false,message:"The product cannot be created"})
  console.log(product)
  res.status(200).json({success:true,Data:product})
  } catch (error) {
    console.error(error);
    return res.status(500).json({success:false,message:"Internal Server Error"})
  }
  
})
// -------Admin--product deleted ---------//

router.get('/delete/:id',verifyToken, (req, res) => {
  Product.findByIdAndRemove(req.params.id).then(product => {
    if (product) {
       return res.status(200).json({success: true, message: 'the product is deleted!'});
    } else {
      return res.status(404).json({ success: false, message: "product not found!" })
    }
  }).catch(err => {
    return res.status(500).json({ success: false, error: err })
  })
})

//---------Admin--product update---------------------------//

router.post('/update/:id',uploadOptions.single('image'),verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({success:false,message:'Invalid Product Id'})
    }
  
    const file = req.file;
    if (!file) return res.status(400).json({success:false,message:'No image in the request'})
     const fileName = file.filename;
  
     const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
    const category = await Category.findById(req.body.category);
  
    if (!category) return res.status(400).json({success:false,message:'Invalid Category'})
  
    const isActiveValue = req.body.isActive === 'on' ? true : false;
    let product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
        isActive: isActiveValue,
      },
      { new: true }
    )
  
    if (!product)
      return res.status(500).json({success:false,message:"The product cannot be created"})
  
    res.status(200).json({success:true,message:"Data is Update successfully",Data:product})
  } catch (error) {
    console.error(error);
    return res.status(500).json({success:false,message:"Internal Server Error"})
  }
 
})
//--------Admin-print value update single-----------//
router.get('/update/:id',verifyToken, async (req, res) => {
  try {
      const product = await Product.findById(req.params.id);

      if (!product) {
          return res.status(404).json({success:false, message: 'Product not found' });
      }

      res.status(200).json({success:true,Data:product });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success:false,error: error.message });
  }
});

//--------Admin--tatal product count-----------//
router.get(`/count`,verifyToken, async (req, res) =>{
  const productCount = await Product.estimatedDocumentCount()

  if(!productCount) {
      res.status(500).json({success: false})
  } 
  res.json({success:true,
    message:"Products count Successfully!",
      Data: productCount
  });
})

// --------Admin product are display always ---//
router.get('/featured/:count',verifyToken, async (req, res) => {

  const count = req.params.count ? req.params.count : 0
  // console.log('Received count:', count); 
  const products = await Product.find({ isFeatured: true }).limit(+count);

  if (!products) {
    res.status(500).json({ success: false })
  }
  res.json({success:true,Data:products});
})

//------------------------Admin------gallery images---------------------------------//

router.post('/gallery-images/:id',
  uploadOptions.array('images', 10),verifyToken,
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({success:true,message:'Invalid Product Id'})
    }
    const files = req.files
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/uploads/`;
    if (files) {
      files.map(file => {
        imagesPaths.push(`${basePath}${file.filename}`);
      })
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPaths
      },
      { new: true }
    )

    if (!product)
      return res.status(500).json({success:false,message:'the gallery cannot be updated!'})

    res.json({success:true,message:"images is uploads Successfully!",Data:product});
  })


module.exports = router;