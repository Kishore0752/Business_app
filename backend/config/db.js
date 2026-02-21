const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://kishore0752:Kishore0752@cluster0.tunnpsy.mongodb.net/businessApp?appName=Cluster0"
  );
  console.log("MongoDB Connected");
};

module.exports = connectDB;