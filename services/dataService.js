const fs = require('fs');
const { DATA_FILE } = require('../config/init');

// Read data from file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { contact: [], join: [], blogs: [] };
  }
}

// Write data to file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing data:', err);
    return false;
  }
}

// Insert contact submission
function insertContactSubmission(name, email, phone, subject, message) {
  return new Promise((resolve, reject) => {
    try {
      const data = readData();
      const id = Date.now();
      const submission = {
        id,
        name,
        email,
        phone,
        subject,
        message,
        created_at: new Date().toISOString()
      };
      data.contact.push(submission);
      writeData(data);
      resolve({ id });
    } catch (err) {
      reject(err);
    }
  });
}

// Insert join submission
function insertJoinSubmission(name, email, organization, interests) {
  return new Promise((resolve, reject) => {
    try {
      const data = readData();
      const id = Date.now();
      const submission = {
        id,
        name,
        email,
        organization,
        interests,
        created_at: new Date().toISOString()
      };
      data.join.push(submission);
      writeData(data);
      resolve({ id });
    } catch (err) {
      reject(err);
    }
  });
}

// Insert blog submission
function insertBlogSubmission(title, author, category, content) {
  return new Promise((resolve, reject) => {
    try {
      const data = readData();
      const id = Date.now();
      const submission = {
        id,
        title,
        author,
        category,
        content,
        created_at: new Date().toISOString()
      };
      data.blogs.push(submission);
      writeData(data);
      resolve({ id });
    } catch (err) {
      reject(err);
    }
  });
}

// Get all contact submissions
function getAllContactSubmissions() {
  return new Promise((resolve) => {
    const data = readData();
    resolve(data.contact || []);
  });
}

// Get all join submissions
function getAllJoinSubmissions() {
  return new Promise((resolve) => {
    const data = readData();
    resolve(data.join || []);
  });
}

// Get all blog submissions
function getAllBlogSubmissions() {
  return new Promise((resolve) => {
    const data = readData();
    resolve(data.blogs || []);
  });
}

// Get submission counts
function getSubmissionCounts() {
  return new Promise((resolve) => {
    const data = readData();
    resolve({
      contact: (data.contact || []).length,
      join: (data.join || []).length,
      blogs: (data.blogs || []).length
    });
  });
}

// Delete contact submission
function deleteContactSubmission(id) {
  return new Promise((resolve, reject) => {
    try {
      const data = readData();
      data.contact = data.contact.filter(sub => sub.id !== parseInt(id));
      writeData(data);
      resolve({ success: true });
    } catch (err) {
      reject(err);
    }
  });
}

// Delete join submission
function deleteJoinSubmission(id) {
  return new Promise((resolve, reject) => {
    try {
      const data = readData();
      data.join = data.join.filter(sub => sub.id !== parseInt(id));
      writeData(data);
      resolve({ success: true });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  insertContactSubmission,
  insertJoinSubmission,
  insertBlogSubmission,
  getAllContactSubmissions,
  getAllJoinSubmissions,
  getAllBlogSubmissions,
  getSubmissionCounts,
  deleteContactSubmission,
  deleteJoinSubmission
};
