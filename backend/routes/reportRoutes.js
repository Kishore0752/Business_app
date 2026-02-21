const express = require("express");
const Sale = require("../models/Sale");
const PDFDocument = require("pdfkit");

const router = express.Router();


// ================= HELPER =================
function generateReport(title, sales, res, filename) {

  const productMap = {};

  sales.forEach(sale => {

    sale.items.forEach(item => {

      if (!productMap[item.code]) {
        productMap[item.code] = {
          code: item.code,
          name: item.name,
          quantity: 0,
          revenue: 0
        };
      }

      productMap[item.code].quantity += item.quantity;
      productMap[item.code].revenue += item.total;
    });
  });

  const products = Object.values(productMap);
  const grandTotal = products.reduce((sum, p) => sum + p.revenue, 0);

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  doc.pipe(res);

  doc.fontSize(20).text(title, { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text("Code    Product    Qty Sold    Revenue");
  doc.text("------------------------------------------------");

  products.forEach(p => {
    doc.text(`${p.code}    ${p.name}    ${p.quantity}    ₹${p.revenue}`);
  });

  doc.moveDown();
  doc.text("------------------------------------------------");
  doc.fontSize(16).text(`TOTAL REVENUE: ₹${grandTotal}`);

  doc.end();
}


// ================= DAILY JSON =================
router.get("/daily", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sales = await Sale.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const total = sales.reduce((sum, s) => sum + s.grandTotal, 0);

    res.json({ total, count: sales.length });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= DAILY PDF =================
router.get("/daily/pdf", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const sales = await Sale.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    generateReport("Daily Sales Report", sales, res, "daily-report.pdf");

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= WEEKLY PDF =================
router.get("/weekly/pdf", async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const sales = await Sale.find({
      createdAt: { $gte: last7Days }
    });

    generateReport("Weekly Sales Report", sales, res, "weekly-report.pdf");

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= MONTHLY PDF =================
router.get("/monthly/pdf", async (req, res) => {
  try {
    const now = new Date();

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const sales = await Sale.find({
      createdAt: { $gte: firstDay, $lt: nextMonth }
    });

    generateReport("Monthly Sales Report", sales, res, "monthly-report.pdf");

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;