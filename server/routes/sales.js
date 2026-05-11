const express = require("express");
const router = express.Router();
const db = require("../db");
const { sendReceiptEmail } = require("../services/emailService");
const {
  verifyToken,
  isCashierOrAdmin,
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  const client = await db.connect();

  try {
    const { cart, total, paymentMethod, amountPaid } = req.body;

    const userId = req.user.id;

    if (!cart || cart.length === 0) {
      return res.status(400).json({
        error: "Cart is empty",
      });
    }

    // POINTS LOGIC
    const finalTotal = total;

    const change = amountPaid - finalTotal;

    // BEGIN TRANSACTION
    await client.query("BEGIN");

    // CREATE SALE
    const saleResult = await client.query(
      `
      INSERT INTO sales (
        total_amount,
        payment_method,
        user_id,
        amount_paid,
        change,
        created_at
      )
VALUES ($1, $2, $3, $4, $5, NOW())
RETURNING id
      `,
      [finalTotal, paymentMethod, userId, amountPaid, change],
    );

    const saleId = saleResult.rows[0].id;

    // PROCESS CART ITEMS
    for (const item of cart) {
      // CHECK STOCK
      const stockResult = await client.query(
        "SELECT quantity FROM products WHERE id = $1",
        [item.id],
      );

      const product = stockResult.rows[0];

      if (!product || product.quantity < item.quantity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: `Insufficient stock for product ID ${item.id}`,
        });
      }

      // INSERT SALE ITEM
      await client.query(
        `
        INSERT INTO sales_items (
          sale_id,
          product_id,
          quantity,
          price
        )
        VALUES ($1, $2, $3, $4)
        `,
        [saleId, item.id, item.quantity, item.price],
      );

      // UPDATE STOCK
      await client.query(
        `
        UPDATE products
        SET quantity = quantity - $1
        WHERE id = $2
        `,
        [item.quantity, item.id],
      );
    }

    // TEST EMAIL
    sendReceiptEmail({
      email: "kwesidarkomichael@gmail.com",
      customerName: "Test User",
      total: finalTotal,
      pointsEarned: Math.floor(finalTotal),
    }).catch(console.error);

    // COMMIT
    await client.query("COMMIT");

    return res.json({
      message: "Sale completed successfully ✅",
      saleId,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("CREATE SALE ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  } finally {
    client.release();
  }
});

// GET all sales
router.get("/", verifyToken, isCashierOrAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        total_amount,
        payment_method,
        user_id,
        amount_paid,
        change,
        created_at
      FROM sales
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("GET SALES ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

// GET single sale with items
router.get("/:id", verifyToken, isCashierOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get sale
    const saleResult = await db.query("SELECT * FROM sales WHERE id = $1", [
      id,
    ]);

    const sale = saleResult.rows[0];

    if (!sale) {
      return res.status(404).json({
        error: "Sale not found",
      });
    }

    // Get items
    const itemsResult = await db.query(
      `
      SELECT
        si.product_id,
        p.name,
        si.quantity,
        si.price
      FROM sales_items si
      JOIN products p
        ON si.product_id = p.id
      WHERE si.sale_id = $1
      `,
      [id],
    );

    return res.json({
      ...sale,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("GET SINGLE SALE ERROR:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;
