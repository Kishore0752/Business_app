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

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  doc.pipe(res);

  // ===== Title =====
  doc.fontSize(22).text(title, { align: "center" });
  doc.moveDown(2);

  const tableTop = 150;
  const itemSpacing = 30;

  // Column Positions
  const codeX = 50;
  const productX = 120;
  const qtyX = 330;
  const revenueX = 420;

  // ===== Table Header =====
  doc.fontSize(14).text("Code", codeX, tableTop);
  doc.text("Product", productX, tableTop);
  doc.text("Qty Sold", qtyX, tableTop);
  doc.text("Revenue", revenueX, tableTop);

  doc
    .moveTo(40, tableTop - 10)
    .lineTo(550, tableTop - 10)
    .stroke();

  doc
    .moveTo(40, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();

  // ===== Table Rows =====
  let position = tableTop + 35;

  products.forEach(p => {
    doc.fontSize(12).text(p.code, codeX, position);
    doc.text(p.name, productX, position);
    doc.text(p.quantity.toString(), qtyX, position);
    doc.text(`₹${p.revenue}`, revenueX, position);

    position += itemSpacing;
  });

  // ===== Bottom Line =====
  doc
    .moveTo(40, position)
    .lineTo(550, position)
    .stroke();

  doc.moveDown(2);

  // ===== Grand Total =====
  doc.fontSize(18).text(`TOTAL REVENUE: ₹${grandTotal}`, {
    align: "right"
  });

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