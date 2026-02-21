const express = require("express");
const Admin = require("../models/Admin");

const router = express.Router();

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const passcode = req.body.passcode?.trim();

    const admin = await Admin.findOne({ passcode });

    if (!admin) {
      return res.status(401).json({ msg: "Wrong passcode" });
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// CHANGE PASSCODE
router.put("/change", async (req, res) => {
  try {
    const oldPass = req.body.oldPass?.trim();
    const newPass = req.body.newPass?.trim();

    const admin = await Admin.findOne({ passcode: oldPass });

    if (!admin) {
      return res.status(401).json({ msg: "Wrong passcode" });
    }

    admin.passcode = newPass;
    await admin.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;