function padZero(number, length) {
    return String(number).padStart(length, '0');
  }
  
  const dataUtils = {
    formatDataDate(dateValue, forMySQL = true) {
      if (!dateValue) {
        return ''; // Return empty string for null or undefined values
      }
  
      if (typeof dateValue === 'string') {
        // Convert 'MM/DD/YYYY' to 'YYYY-MM-DD'
        const [month, day, year] = dateValue.split('/');
        const formattedDate = `${year}-${padZero(month, 2)}-${padZero(day, 2)}`;
        return forMySQL ? formattedDate : dateValue;
      }
  
      if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = padZero(dateValue.getMonth() + 1, 2);
        const day = padZero(dateValue.getDate(), 2);
        const formattedDate = `${year}-${month}-${day}`;
        return forMySQL ? formattedDate : `${month}/${day}/${year}`;
      }
  
      if (typeof dateValue === 'number' && dateValue >= 1 && dateValue < 2958466) {
        // Convert Excel serial date to 'YYYY-MM-DD' or 'MM/DD/YYYY'
        const dateObject = new Date(Math.floor((dateValue - 25569) * 86400 * 1000));
        const year = dateObject.getFullYear();
        const month = padZero(dateObject.getMonth() + 1, 2);
        const day = padZero(dateObject.getDate(), 2);
        const formattedDate = `${year}-${month}-${day}`;
        return forMySQL ? formattedDate : `${month}/${day}/${year}`;
      }
  
      return ''; // Return empty string for unsupported date format
    },
  
    // Add other utility functions here...
  };
  
  module.exports = dataUtils;
  