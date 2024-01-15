const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

router.post('/export', async (req, res) => {
  try {
    const { groupedData, thresholdValue } = req.body; // Assuming thresholdValue is passed from the client

    const workbook = new ExcelJS.Workbook();

    groupedData.forEach(group => {
        const worksheet = workbook.addWorksheet(group.jobDesc); // Use jobDesc as the sheet name
        worksheet.columns = group.headers.map(header => ({
            header: header,
            key: header.toLowerCase().replace(/\s+/g, '_'),
            width: 20
        }));

        group.data.forEach(item => {
            worksheet.addRow(item);
        });

        // Conditional Formatting (if thresholdValue is provided)
        if (thresholdValue) {
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
        }
    });

    // Write to a buffer and send as response
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.end(buffer);
  } catch (error) {
    console.error('Error creating Excel file:', error);
    res.status(500
    ).send('Error generating report');
  }
});
    
module.exports = router;
    
    