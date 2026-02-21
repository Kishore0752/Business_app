const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  items: [
    {
      code: String,
      name: String,
      price: Number,
      quantity: Number,
      total: Number
    }
  ],
  grandTotal: Number
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);