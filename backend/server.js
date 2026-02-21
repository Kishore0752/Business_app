const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/sales", require("./routes/saleRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// Test Route
app.get("/", (req, res) => {
  res.send("API Running");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});