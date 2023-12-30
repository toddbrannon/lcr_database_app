const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

router.post('/export', async (req, res) => {
  try {
      // Destructure and log the incoming data for debugging
      const { headers, data, threshold } = req.body;
      console.log('Received headers:', headers);
      console.log('Received data:', data);
      console.log('Received threshold:', threshold);

      // Check if headers is an array and not empty
      if (!Array.isArray(headers) || headers.length === 0) {
          throw new Error('Headers are missing or not an array');
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Employee Hours Report');

      // Dynamically set columns based on received headers
      worksheet.columns = headers.map(header => ({
          header: header,
          key: header.toLowerCase().replace(/\s+/g, '_'),
          width: 20
      }));

      // Add rows
      data.forEach(item => {
          worksheet.addRow(item);
      });

      // Apply conditional formatting
      const thresholdValue = parseInt(threshold, 10);
      worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
          row.eachCell({ includeEmpty: false }, function(cell, colNumber) {
              if (colNumber > 2) { // Adjust based on your specific columns
                  const conditionalFormattingRule = {
                      type: 'expression',
                      formulae: [`$${cell._address} > ${thresholdValue}`],
                      style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF00' } } }
                  };
                  worksheet.getCell(cell._address).conditionalFormatting = {
                      ref: cell._address,
                      rules: [conditionalFormattingRule]
                  };
              }
          });
      });

      // Write to a buffer and send as response
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
      res.end(buffer);
  } catch (error) {
      console.error('Error creating Excel file:', error);
      res.status(500).send('Error generating report');
  }
});

module.exports = router;