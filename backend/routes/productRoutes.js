const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();


// ===== IMAGE STORAGE =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpg|jpeg|png/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) cb(null, true);
  else cb(new Error("Only JPG, JPEG, PNG images allowed"));
};

const upload = multer({ storage, fileFilter });


// ➕ ADD PRODUCT
router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const newProduct = new Product({
      code: req.body.code,
      name: req.body.name,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      image: req.file ? req.file.filename : null
    });

    await newProduct.save();

    res.json({ success: true, message: "Product added successfully" });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// 🔍 SEARCH PRODUCT
// 🔍 SEARCH PRODUCT
router.get("/:code", async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock === 0) {
      return res.json({
        ...product._doc,
        status: "Out of Stock"
      });
    }

    res.json({
      ...product._doc,
      status: "Available"
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ➕ INCREASE STOCK
router.put("/increase/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);

    const product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.stock += qty;
    await product.save();

    res.json({ success: true, message: "Stock increased successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ➖ REDUCE STOCK (SAFE)
// ➖ REDUCE STOCK (SAFE + VALIDATION)
router.put("/reduce/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);

    const product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.stock === 0) {
      return res.status(400).json({ error: "Out of Stock" });
    }

    if (qty > product.stock) {
      return res.status(400).json({
        error: "Items exceeded than availability"
      });
    }

    product.stock -= qty;
    await product.save();

    if (product.stock === 0) {
      return res.json({
        success: true,
        message: "Stock reduced. Product is now Out of Stock"
      });
    }

    res.json({
      success: true,
      message: "Stock reduced successfully"
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ❌ DELETE PRODUCT (WITH IMAGE DELETE)
router.delete("/delete/:code", async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete image from uploads folder
    if (product.image) {
      const imagePath = path.join(__dirname, "../uploads/", product.image);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Product.deleteOne({ code: req.params.code });

    res.json({ success: true, message: "Product deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;