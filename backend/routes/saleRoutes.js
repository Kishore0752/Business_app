const express = require("express");
const Sale = require("../models/Sale");
const Product = require("../models/Product");

const router = express.Router();


// 💰 CREATE BILL + UPDATE STOCK
router.post("/", async (req, res) => {
  const { items, grandTotal } = req.body;

  try {

    // 1️⃣ Save Sale in MongoDB
    const newSale = new Sale({
      items,
      grandTotal
    });

    await newSale.save();


    // 2️⃣ Reduce stock for each item
    for (const item of items) {

      await Product.updateOne(
        { code: item.code },
        { $inc: { stock: -Number(item.quantity) } }
      );

    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;