/**
 * Seed test data into MongoDB for demo purposes
 * Run with: node scripts/seed-test-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ContactSubmission = require('../models/ContactSubmission');
const BlogSubmission = require('../models/BlogSubmission');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI not defined in .env');
    }
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      family: 4,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    console.log('\n📝 Seeding test data...\n');

    // Clear existing test data
    await ContactSubmission.deleteMany({});
    await BlogSubmission.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed Contact Submissions
    const contactData = [
      {
        purpose: 'Contact Inquiry',
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Partnership Inquiry',
        message: 'I am interested in partnering with HackHalt CIC.',
        phone: '+1234567890',
        createdAt: new Date('2025-02-15')
      },
      {
        purpose: 'Join Initiative',
        name: 'Jane Smith',
        email: 'jane@example.com',
        organization: 'Tech Innovations Ltd',
        interests: 'Cybersecurity training and research',
        phone: '+9876543210',
        createdAt: new Date('2025-02-16')
      },
      {
        purpose: 'Ambassador Application',
        name: 'Alex Kumar',
        email: 'alex@example.com',
        region: 'Asia Pacific',
        experience: '5 years in cybersecurity industry',
        linkedin: 'https://linkedin.com/in/alexkumar',
        createdAt: new Date('2025-02-17')
      },
      {
        purpose: 'Contact Inquiry',
        name: 'Maria Garcia',
        email: 'maria@example.com',
        subject: 'Event Speaking Opportunity',
        message: 'Would you like to speak at our cybersecurity conference?',
        createdAt: new Date('2025-02-18')
      }
    ];

    const createdContacts = await ContactSubmission.insertMany(contactData);
    console.log(`✅ Created ${createdContacts.length} contact submissions`);

    // Seed Blog Submissions
    const blogData = [
      {
        title: 'Introduction to Cyber Threats',
        author: 'Security Team',
        category: 'Education',
        content: 'This comprehensive guide covers the basics of modern cyber threats and how to protect against them. We explore common attack vectors...',
        excerpt: 'Learn about the most common cyber threats in 2025',
        status: 'Approved',
        isPublished: true,
        viewCount: 245,
        tags: ['cybersecurity', 'threats', 'education'],
        createdAt: new Date('2025-02-10')
      },
      {
        title: 'Best Practices for Password Management',
        author: 'John Smith',
        category: 'Security Tips',
        content: 'In this article, we discuss the importance of strong password management and provide practical tips for both individuals and organizations...',
        excerpt: 'Master the art of secure password management',
        status: 'Approved',
        isPublished: true,
        viewCount: 156,
        tags: ['passwords', 'security', 'best-practices'],
        createdAt: new Date('2025-02-12')
      },
      {
        title: 'Incident Response Procedures',
        author: 'Response Team',
        category: 'Guides',
        content: 'A step-by-step guide to handling security incidents. This comprehensive procedure covers detection, containment, and recovery...',
        excerpt: 'How to respond effectively to security incidents',
        status: 'Pending',
        isPublished: false,
        viewCount: 0,
        tags: ['incident-response', 'procedures', 'security'],
        createdAt: new Date('2025-02-18')
      }
    ];

    const createdBlogs = await BlogSubmission.insertMany(blogData);
    console.log(`✅ Created ${createdBlogs.length} blog submissions`);

    console.log('\n✨ Test data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Contact Submissions: ${createdContacts.length}`);
    console.log(`   - Contact Inquiries: ${contactData.filter(c => c.purpose === 'Contact Inquiry').length}`);
    console.log(`   - Join Initiatives: ${contactData.filter(c => c.purpose === 'Join Initiative').length}`);
    console.log(`   - Ambassador Applications: ${contactData.filter(c => c.purpose === 'Ambassador Application').length}`);
    console.log(`   - Blog Posts: ${createdBlogs.length}`);
    console.log('\n🔍 You can now refresh the admin dashboard to see the data!\n');

  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
};

connectDB().then(() => seedData());
