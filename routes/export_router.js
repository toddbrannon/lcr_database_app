const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

module.exports = function(pool) {
    router.post('/export', async (req, res) => {
        try {
            const { thresholdValue, selectedLocation } = req.body; // Ensure selectedLocation is passed correctly

            const workbook = new ExcelJS.Workbook();

            // Fetch distinct CheckDates for column headers
            const [datesResults] = await pool.query('SELECT DISTINCT CheckDate FROM EmployeeHours WHERE Location = ? ORDER BY CheckDate', [selectedLocation]);
            const checkDates = datesResults.map(result => result.CheckDate.toISOString().split('T')[0]);

            // Fetch data for the specific location, grouped by JobDescription
            const [dataResults] = await pool.query(`
                SELECT eh.Name, j.JobDescription, l.City, eh.Location, eh.CheckDate, SUM(eh.TotalHours) AS TotalHours
                FROM EmployeeHours eh
                JOIN Location l ON eh.Co = l.Co
                JOIN JobCode AS j ON RIGHT(eh.Department, 2) = j.JobCode
                WHERE eh.Location = ?
                GROUP BY j.JobDescription, eh.Name, l.City, eh.Location, eh.CheckDate
                ORDER BY j.JobDescription, eh.Location, eh.Name, eh.CheckDate
            `, [selectedLocation]);

            // Group data by JobDescription
            let jobGroups = {};
            dataResults.forEach(row => {
                if (!jobGroups[row.JobDescription]) {
                    jobGroups[row.JobDescription] = [];
                }
                jobGroups[row.JobDescription].push(row);
            });

            Object.keys(jobGroups).forEach(jobDescription => {
                const worksheet = workbook.addWorksheet(jobDescription.substring(0, 31)); // Sheet name limited to 31 chars
                worksheet.columns = [
                    { header: 'Name', key: 'name', width: 20 },
                    { header: 'City', key: 'city', width: 15 },
                    { header: 'Location', key: 'location', width: 15 },
                    ...checkDates.map(date => ({ header: date, key: date, width: 10 })),
                ];

                jobGroups[jobDescription].forEach(row => {
                    let rowData = {
                        name: row.Name,
                        city: row.City,
                        location: row.Location,
                    };
                    checkDates.forEach(date => rowData[date] = ''); // Initialize date columns
                    // Set TotalHours for the corresponding CheckDate
                    const checkDateKey = row.CheckDate.toISOString().split('T')[0];
                    rowData[checkDateKey] = row.TotalHours;

                    worksheet.addRow(rowData);
                });

                // Conditional Formatting
                if (thresholdValue) {
                    applyConditionalFormatting(worksheet, thresholdValue, checkDates);
                }
            });

            // Write workbook to buffer and send as response
            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="EmployeeHours_${selectedLocation}_${new Date().toISOString()}.xlsx"`);
            res.end(buffer);
        } catch (error) {
            console.error('Error exporting data to Excel:', error);
            res.status(500).send('Error generating Excel file');
        }
    });
    return router;
};

function applyConditionalFormatting(worksheet, thresholdValue, checkDates) {
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Assuming the first row is headers
            checkDates.forEach(date => {
                let cell = row.getCell(date);
                if (cell.value > thresholdValue) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFF0000' } // Red for emphasis, adjust as needed
                    };
                }
            });
        }
    });
}
