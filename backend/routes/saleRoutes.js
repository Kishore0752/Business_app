const express = require("express");
const Sale = require("../models/Sale");
const Product = require("../models/Product");

const router = express.Router();

// 💰 CREATE BILL + UPDATE STOCK SAFELY
router.post("/", async (req, res) => {
  const { items, grandTotal } = req.body;

  try {
    // 1️⃣ Validate stock for each item
    for (const item of items) {
      const product = await Product.findOne({ code: item.code });

      if (!product) {
        return res.status(404).json({ error: `Product ${item.code} not found` });
      }

      if (product.stock === 0) {
        return res.status(400).json({
          error: `Product "${product.name}" is Out of Stock`
        });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          error: `Quantity for "${product.name}" exceeds available stock (${product.stock})`
        });
      }
    }

    // 2️⃣ Save sale in MongoDB
    const newSale = new Sale({ items, grandTotal });
    await newSale.save();

    // 3️⃣ Reduce stock safely
    for (const item of items) {
      await Product.updateOne(
        { code: item.code },
        {
          $inc: { stock: -Math.min(item.quantity, await Product.findOne({ code: item.code }).then(p => p.stock)) }
        }
      );
    }

    res.json({ success: true, message: "Sale completed successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;