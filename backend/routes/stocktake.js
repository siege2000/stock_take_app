const express = require('express');
const { getPool, sql } = require('../db');
const config = require('../config.json');

const router = express.Router();

// Create a new stock take session
router.post('/', async (req, res) => {
  const { staffInitials } = req.body;
  if (!staffInitials) return res.status(400).json({ error: 'staffInitials required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('type', sql.VarChar(20), 'MOBILE')
      .input('orderByGenericName', sql.Int, 0)
      .query(`
        INSERT INTO [dbo].[StockTake] (DateCreated, Type, OrderByGenericName, StockTakeGuid, StockTakeDateModified)
        OUTPUT INSERTED.StockTakeID
        VALUES (GETDATE(), @type, @orderByGenericName, NEWID(), GETDATE())
      `);

    const stockTakeId = result.recordset[0].StockTakeID;
    res.json({ stockTakeId });
  } catch (err) {
    console.error('Create stock take error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all stock takes (for listing on home screen)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 20 StockTakeID, DateCreated, Type, StockTakeDateModified
      FROM [dbo].[StockTake]
      WHERE Type = 'MOBILE'
      ORDER BY DateCreated DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('List stock takes error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Finalise a stock take — writes StockTakeItems + Shrinkage rows
router.post('/:id/finalise', async (req, res) => {
  const stockTakeId = parseInt(req.params.id, 10);
  const { items, staffId } = req.body;
  // items: [{ stockId, tradeName, soh, countedQty }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' });
  }

  const resolvedStaffId = staffId || config.stockTake.defaultStaffId;
  const reasonId = config.stockTake.reasonId;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const item of items) {
        const { stockId, soh, countedQty } = item;
        const variance = soh - countedQty; // positive = loss, negative = gain

        // Insert into StockTakeItems
        await new sql.Request(transaction)
          .input('stockTakeId', sql.Int, stockTakeId)
          .input('stockId', sql.Int, stockId)
          .query(`
            INSERT INTO [dbo].[StockTakeItems]
              (StockTakeID, StockID, StockTakeItemsGuid, StockTakeItemsDateModified)
            VALUES
              (@stockTakeId, @stockId, NEWID(), GETDATE())
          `);

        // Insert into Shrinkage
        await new sql.Request(transaction)
          .input('stockId', sql.Int, stockId)
          .input('quantitySubtracted', sql.Decimal(10, 3), variance)
          .input('staffId', sql.Int, resolvedStaffId)
          .input('reasonId', sql.Int, reasonId)
          .input('sohBefore', sql.Decimal(10, 3), soh)
          .query(`
            INSERT INTO [dbo].[Shrinkage]
              (StockId, DateTime, QuantitySubtracted, StaffID, ReasonID,
               SOHBeforeSubtractInUnits, ShrinkageGuid, ShrinkageDateModified)
            VALUES
              (@stockId, GETDATE(), @quantitySubtracted, @staffId, @reasonId,
               @sohBefore, NEWID(), GETDATE())
          `);
      }

      await transaction.commit();
      res.json({ success: true, itemCount: items.length });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Finalise error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
