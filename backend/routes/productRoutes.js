const express = require("express");
const Product = require("../models/Product");
const multer = require("multer");
const path = require("path");

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

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// 🔍 SEARCH PRODUCT
router.get("/:code", async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ➕ INCREASE STOCK
router.put("/increase/:code", async (req, res) => {
  try {
    await Product.updateOne(
      { code: req.params.code },
      { $inc: { stock: Number(req.body.qty) } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ➖ REDUCE STOCK
router.put("/reduce/:code", async (req, res) => {
  try {
    await Product.updateOne(
      { code: req.params.code },
      { $inc: { stock: -Number(req.body.qty) } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;