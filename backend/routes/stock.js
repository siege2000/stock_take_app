const express = require('express');
const { getPool, sql } = require('../db');

const router = express.Router();

// Look up stock item by PLU (barcode)
router.get('/lookup', async (req, res) => {
  const { plu } = req.query;
  if (!plu) return res.status(400).json({ error: 'PLU required' });
  console.log(`Barcode lookup: "${plu}" (length: ${plu.length})`);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('barcode', sql.VarChar(50), plu)
      .query(`
        SELECT s.StockID, s.TradeName, s.SOH, s.PackSize
        FROM [dbo].[Stock] s
        INNER JOIN [dbo].[Barcode] b ON b.StockID = s.StockID
        WHERE b.Barcode = @barcode
          AND s.skDeleted = 0
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
