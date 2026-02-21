const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true
  },
  name: String,
  price: Number,
  stock: Number,
  image: String
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);