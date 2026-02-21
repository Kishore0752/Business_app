const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  passcode: String
});

module.exports = mongoose.model("Admin", adminSchema);