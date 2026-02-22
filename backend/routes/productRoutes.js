const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();


// ☁ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});


// 📦 Cloud storage instead of local disk
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "pos-products",
    allowed_formats: ["jpg", "jpeg", "png"]
  }
});

const upload = multer({ storage });


// ➕ ADD PRODUCT (PERMANENT IMAGE)
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const newProduct = new Product({
      code: req.body.code,
      name: req.body.name,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      image: req.file ? req.file.path : null   // Cloudinary URL
    });

    await newProduct.save();

    res.json({ success: true, message: "Product added successfully" });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// 📋 LIST ALL PRODUCTS
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// 🔍 SEARCH PRODUCT
router.get("/:code", async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });

    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json({
      ...product._doc,
      status: product.stock === 0 ? "Out of Stock" : "Available"
    });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// ➕ INCREASE STOCK
router.put("/increase/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid quantity" });

    const product = await Product.findOne({ code: req.params.code });
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.stock += qty;
    await product.save();

    res.json({ success: true, message: "Stock increased" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// ➖ REDUCE STOCK
router.put("/reduce/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid quantity" });

    const product = await Product.findOne({ code: req.params.code });
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (qty > product.stock) {
      return res.status(400).json({ error: "Not enough stock" });
    }

    product.stock -= qty;
    await product.save();

    res.json({ success: true, product });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// ❌ DELETE PRODUCT (image remains in cloud — optional cleanup later)
router.delete("/delete/:code", async (req, res) => {
  try {
    await Product.deleteOne({ code: req.params.code });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;