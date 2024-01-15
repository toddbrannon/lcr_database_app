const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

router.post('/export', async (req, res) => {
  try {
    // Retrieve thresholdValue from the client
    const { thresholdValue } = req.body; 
    
    // Query to retrieve distinct locations
    const locationsQuery = 'SELECT DISTINCT Location FROM EmployeeHours';
    const locations = await pool.query(locationsQuery);

    const workbook = new ExcelJS.Workbook();

    // Process each location
    for (const locationRow of locations) {
      const location = locationRow.Location;
      const dataQuery = `
        SELECT eh.CheckDate, eh.Name, j.JobDescription, l.City, eh.Location, eh.TotalHours AS TotalHours
        FROM EmployeeHours AS eh
        JOIN JobCode AS j ON RIGHT(eh.Department, 2) = j.JobCode
        JOIN Location AS l ON eh.Co = l.Co
        WHERE eh.Location = '${location}'
        GROUP BY eh.CheckDate, eh.Name, j.JobDescription, eh.Location
        ORDER BY eh.CheckDate, eh.Name, j.JobDescription;
      `;

      const results = await pool.query(dataQuery);

      // Create a new sheet for each location
      const worksheet = workbook.addWorksheet(location); // Use location as sheet name

      // Define columns and add rows similar to previous implementation
      worksheet.columns = [
        { header: 'Check Date', key: 'checkDate', width: 15 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Job Description', key: 'jobDescription', width: 20 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Location', key: 'location', width: 15 },
        { header: 'Total Hours', key: 'totalHours', width: 10 }
        ];
      // ... Add rows from query results ...
        results.forEach(row => {
            worksheet.addRow({
              checkDate: row.CheckDate ? row.CheckDate.toISOString().split('T')[0] : '', // Format date as needed
              name: row.Name,
              jobDescription: row.JobDescription,
              city: row.City,
              location: row.Location,
              totalHours: row.TotalHours
            });
        });
        // Apply conditional formatting based on thresholdValue
      if (thresholdValue) {
        worksheet.eachRow({ includeEmpty: false }, function(row) {
          row.eachCell({ includeEmpty: false }, function(cell, colNumber) {
            if (worksheet.columns[colNumber - 1].key === 'totalHours') {
              if (cell.value > thresholdValue) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF00FF00' } // Green fill for hours above threshold
                };
              }
            }
          });
        });
      }
    }

    // Write workbook to buffer and send as response
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employee_hours_report.xlsx"');
    res.end(buffer);
  } catch (error) {
    console.error('Error creating Excel file:', error);
    res.status(500).send('Error generating report');
  }
});

module.exports = router;
