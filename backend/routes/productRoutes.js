const express = require("express");
const Product = require("../models/Product");
const Admin = require("../models/Admin");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// ✅ Middleware: Verify admin passcode from header
const verifyAdmin = async (req, res, next) => {
  try {
    const passcode = req.headers["x-admin-passcode"]?.trim();

    if (!passcode) {
      return res.status(401).json({ error: "Admin passcode required (header: x-admin-passcode)" });
    }

    const admin = await Admin.findOne({ passcode });

    if (!admin) {
      return res.status(403).json({ error: "Invalid admin passcode" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


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


// ➕ INCREASE STOCK (Atomic)
router.put("/increase/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid quantity" });

    // ✅ Atomic conditional update using $inc operator
    const updated = await Product.findOneAndUpdate(
      { code: req.params.code },
      { $inc: { stock: qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, message: "Stock increased", product: updated });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// ➖ REDUCE STOCK (atomic, prevents negative stock)
router.put("/reduce/:code", async (req, res) => {
  try {
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: "Invalid quantity" });

    // ✅ Atomic conditional update: only reduce if stock >= qty
    const updated = await Product.findOneAndUpdate(
      { code: req.params.code, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Product not found or insufficient stock" });
    }

    res.json({ success: true, message: "Stock reduced", product: updated });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


// ❌ DELETE PRODUCT + CLOUDINARY IMAGE (Admin-only)
router.delete("/delete/:code", verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ☁ Delete image from Cloudinary if it exists
    if (product.image) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}
        const urlParts = product.image.split("/");
        const fileName = urlParts[urlParts.length - 1].split(".")[0];  // filename without extension
        const publicId = `pos-products/${fileName}`;  // folder/filename

        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn(`Warning: Failed to delete Cloudinary image for ${product.code}:`, err.message);
        // Continue with product deletion even if image delete fails
      }
    }

    await Product.deleteOne({ code: req.params.code });
    res.json({ success: true, message: "Product and image deleted" });

  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;