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

    // 3️⃣ Reduce stock safely using conditional updates to avoid negative stock.
    // If any conditional update fails (because stock was reduced concurrently), roll back previous updates and delete the sale.
    const updatedItems = [];

    for (const item of items) {
      const updateResult = await Product.updateOne(
        { code: item.code, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );

      if (updateResult.modifiedCount === 0) {
        // rollback previously updated items
        for (const done of updatedItems) {
          await Product.updateOne({ code: done.code }, { $inc: { stock: done.quantity } });
        }

        // delete the saved sale since we couldn't complete the stock updates
        await Sale.deleteOne({ _id: newSale._id });

        return res.status(400).json({
          error: `Unable to complete sale. Product ${item.code} does not have sufficient stock anymore.`
        });
      }

      updatedItems.push({ code: item.code, quantity: item.quantity });
    }

    res.json({ success: true, message: "Sale completed successfully", sale: newSale });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;