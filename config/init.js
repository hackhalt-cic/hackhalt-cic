const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DB_PATH, 'submissions.json');

// Initialize database and data files
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(DB_PATH, { recursive: true });
      }

      // Create default data structure if file doesn't exist
      if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
          contact: [],
          join: [],
          blogs: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
      }

      console.log('✅ Database initialized successfully');
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { initializeDatabase, DATA_FILE, DB_PATH };
