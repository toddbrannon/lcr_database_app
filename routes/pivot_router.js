const express = require('express');
const router = express.Router();

module.exports = function(pool) {
    console.log('Accessing the pivot route');
    router.get('/pivot', async (req, res) => {
        if (req.isAuthenticated()) {
            try {
                // Query to retrieve distinct locations
                const [locationsResults] = await pool.query('SELECT DISTINCT Location FROM Location ORDER BY Location');
                const allLocations = locationsResults.map(row => row.Location);

                const selectedLocation = req.query.location || '';

                const plainUser = req.user.toObject();

                const query = `
                    SELECT eh.CheckDate, eh.Name, j.JobDescription, l.City, eh.Location, eh.TotalHours AS TotalHours
                    FROM EmployeeHours AS eh
                    JOIN JobCode AS j ON RIGHT(eh.Department, 2) = j.JobCode
                    JOIN Location AS l ON eh.Co = l.Co
                    WHERE ('${selectedLocation}' = '' OR eh.Location = '${selectedLocation}')
                    GROUP BY eh.CheckDate, eh.Name, j.JobDescription, eh.Location
                    ORDER BY eh.Location, eh.Name, j.JobDescription, eh.CheckDate;
                `;

                const [results] = await pool.query(query);

                // Process and pivot data
                const pivotedData = {};

                results.forEach(row => {
                    const key = `${row.Name}-${row.JobDescription}-${row.City}`;
                    if (!pivotedData[key]) {
                        pivotedData[key] = {
                            Name: row.Name,
                            JobDescription: row.JobDescription,
                            City: row.City,
                            Location: row.Location,
                            CheckDates: {}
                        };
                    }

                    if (row.CheckDate !== null) {
                        const formattedDate = new Date(row.CheckDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                        pivotedData[key].CheckDates[formattedDate] = row.TotalHours;
                    }
                });

                const jobDescriptions = [...new Set(results.map(row => row.JobDescription))];
                jobDescriptions.sort();

                const cities = [...new Set(results.map(row => row.City))];
                const locations = [...new Set(results.map(row => row.Location))];
                const checkDatesSet = new Set(results.map(result => result.CheckDate && result.CheckDate.toISOString()));
                const checkDates = Array.from(checkDatesSet).filter(date => date !== null);
                const formattedCheckDates = checkDates.map(date => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }));

                console.log(Object.keys(pivotedData).slice(0, 5));

                res.render('pivot.ejs', { 
                    req,
                    username: req.user ? req.user.username : null,
                    data: pivotedData, 
                    jobDescriptions, 
                    checkDates, 
                    formattedCheckDates, 
                    cities,
                    locations: allLocations,
                    isLoggedIn: req.isAuthenticated(),
                    isAdmin: plainUser.permission === 'admin',
                    messages: req.flash()  
                });
            } catch (error) {
                console.error('Error executing query:', error);
                res.status(500).send('Internal Server Error');
            }
        } else {
            res.redirect('/login');
        }
    });
    return router;
};
