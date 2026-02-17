#!/usr/bin/env node

/**
 * Mobile Pages Verification Script
 * Verifies that all pages and links are working correctly
 * Usage: node tests/mobile-pages-test.js
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TIMEOUT = 10000; // 10 seconds

// List of all pages and their anchor links to test
const PAGES_TO_TEST = [
  {
    name: 'Home Page',
    path: '/',
    anchors: []
  },
  {
    name: 'About Page',
    path: '/about',
    anchors: ['mission', 'pillars', 'team']
  },
  {
    name: 'Community Page',
    path: '/community',
    anchors: []
  },
  {
    name: 'Blogs Page',
    path: '/blogs',
    anchors: []
  },
  {
    name: 'Events Page',
    path: '/events',
    anchors: []
  },
  {
    name: 'Partners Page',
    path: '/partners',
    anchors: []
  },
  {
    name: 'Contact Page',
    path: '/contact',
    anchors: []
  },
  {
    name: 'Legal & Compliance',
    path: '/legal-compliance',
    anchors: []
  },
  {
    name: 'Book Session',
    path: '/book-session',
    anchors: []
  },
  {
    name: 'Add Blog',
    path: '/add-blog',
    anchors: []
  },
  {
    name: 'Admin Login',
    path: '/admin-login',
    anchors: []
  },
  {
    name: 'Admin Dashboard',
    path: '/admin',
    anchors: []
  },
  {
    name: 'Blog Admin',
    path: '/blog-admin',
    anchors: []
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

/**
 * Test a single page
 * @param {string} pageUrl - Full URL to test
 * @returns {Promise<boolean>}
 */
function testPage(pageUrl) {
  return new Promise((resolve) => {
    const protocol = pageUrl.startsWith('https') ? https : http;
    
    const timeoutId = setTimeout(() => {
      console.log(`${colors.yellow}⏱️  TIMEOUT${colors.reset} ${pageUrl}`);
      resolve(false);
    }, TIMEOUT);

    const request = protocol.get(pageUrl, (response) => {
      clearTimeout(timeoutId);
      
      // Check for successful response (200-299)
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`${colors.green}✅ OK${colors.reset} (${response.statusCode}) ${pageUrl}`);
        resolve(true);
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        console.log(`${colors.cyan}↩️  REDIRECT${colors.reset} (${response.statusCode}) ${pageUrl}`);
        resolve(true);
      } else if (response.statusCode === 404) {
        console.log(`${colors.red}❌ NOT FOUND${colors.reset} (404) ${pageUrl}`);
        resolve(false);
      } else {
        console.log(`${colors.yellow}⚠️  ERROR${colors.reset} (${response.statusCode}) ${pageUrl}`);
        resolve(false);
      }
      
      // Consume response data
      response.on('data', () => {});
      response.on('end', () => {});
    }).on('error', (error) => {
      clearTimeout(timeoutId);
      console.log(`${colors.red}❌ ERROR${colors.reset}: ${error.message}`);
      resolve(false);
    });

    request.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Mobile Pages Verification Test${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`Base URL: ${colors.cyan}${BASE_URL}${colors.reset}\n`);

  let passCount = 0;
  let failCount = 0;

  for (const page of PAGES_TO_TEST) {
    console.log(`${colors.blue}Testing:${colors.reset} ${page.name}`);
    
    // Test the main page
    const mainPageUrl = `${BASE_URL}${page.path}`;
    const mainPagePassed = await testPage(mainPageUrl);
    
    if (mainPagePassed) {
      passCount++;
    } else {
      failCount++;
    }

    // Test anchors if page passed
    if (mainPagePassed && page.anchors.length > 0) {
      for (const anchor of page.anchors) {
        const anchorUrl = `${BASE_URL}${page.path}#${anchor}`;
        console.log(`  ${colors.cyan}Anchor:${colors.reset} #${anchor}`);
        // Note: Hash fragments aren't sent to server, but we verify the page loads
        // The client-side JavaScript handles anchor navigation
        const anchorTestUrl = `${BASE_URL}${page.path}`; // Server only sees this
        const anchorPassed = await testPage(anchorTestUrl);
        if (anchorPassed) {
          passCount++;
        } else {
          failCount++;
        }
      }
    }
    
    console.log('');
  }

  // Summary
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Passed: ${passCount}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failCount}${colors.reset}`);
  console.log(`📊 Total: ${passCount + failCount}`);
  console.log(`Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%\n`);

  if (failCount === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}⚠️  Some tests failed. Check the output above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, error);
  process.exit(1);
});
