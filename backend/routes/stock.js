const express = require('express');
const { getPool, sql } = require('../db');

const router = express.Router();

// Look up stock item by PLU (barcode)
router.get('/lookup', async (req, res) => {
  const { plu } = req.query;
  if (!plu) return res.status(400).json({ error: 'PLU required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('plu', sql.Int, parseInt(plu, 10))
      .query(`
        SELECT StockID, TradeName, SOH, PackSize
        FROM [dbo].[Stock]
        WHERE PLU = @plu
          AND skDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Stock lookup error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
