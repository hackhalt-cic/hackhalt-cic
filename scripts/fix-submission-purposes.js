/**
 * Fix Submission Purposes Migration
 * Normalizes and fixes submission purpose values in the database
 * Handles:
 * - Trim and normalize purpose values
 * - Fix any records with incorrect/null purpose values
 * - Map old purpose values to new standard values
 */

require('dotenv').config();
const connectDB = require('../config/database');
const ContactSubmission = require('../models/ContactSubmission');

const VALID_PURPOSES = ['Contact Inquiry', 'Join Initiative', 'Ambassador Application'];

async function fixSubmissionPurposes() {
  try {
    console.log('🔧 Starting submission purpose fix migration...');
    await connectDB();
    
    // Find all submissions
    const allSubmissions = await ContactSubmission.find({});
    console.log(`📊 Total submissions found: ${allSubmissions.length}`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const submission of allSubmissions) {
      try {
        let needsUpdate = false;
        let newPurpose = submission.purpose;
        
        // Check if purpose is valid
        if (!newPurpose) {
          console.warn(`⚠️ Submission ${submission._id} has no purpose - attempting to infer`);
          
          // Try to infer from fields
          if (submission.interests && !submission.subject && !submission.region) {
            newPurpose = 'Join Initiative';
            console.log(`  → Inferred as "Join Initiative" (has interests field)`);
          } else if (submission.region && submission.experience) {
            newPurpose = 'Ambassador Application';
            console.log(`  → Inferred as "Ambassador Application" (has region and experience)`);
          } else if (submission.subject && submission.message) {
            newPurpose = 'Contact Inquiry';
            console.log(`  → Inferred as "Contact Inquiry" (has subject and message)`);
          }
          needsUpdate = true;
        }
        
        // Normalize purpose (trim whitespace)
        const trimmedPurpose = (newPurpose || '').trim();
        if (trimmedPurpose !== newPurpose) {
          console.log(`⚠️ Submission ${submission._id} has whitespace in purpose: "${newPurpose}" → "${trimmedPurpose}"`);
          newPurpose = trimmedPurpose;
          needsUpdate = true;
        }
        
        // Verify it's a valid purpose
        if (!VALID_PURPOSES.includes(newPurpose)) {
          const closest = VALID_PURPOSES[0];
          console.warn(`⚠️ Submission ${submission._id} has invalid purpose: "${newPurpose}" - setting to "${closest}"`);
          newPurpose = closest;
          needsUpdate = true;
        }
        
        // Update if needed
        if (needsUpdate) {
          await ContactSubmission.findByIdAndUpdate(submission._id, { purpose: newPurpose });
          fixed++;
          console.log(`✅ Fixed submission ${submission._id} - new purpose: "${newPurpose}"`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error fixing submission ${submission._id}:`, err.message);
      }
    }
    
    console.log(`\n📈 Migration complete!`);
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Valid submissions: ${allSubmissions.length - errors}`);
    
    // Verify the fix
    const contactCount = await ContactSubmission.countDocuments({ purpose: 'Contact Inquiry' });
    const joinCount = await ContactSubmission.countDocuments({ purpose: 'Join Initiative' });
    const ambassadorCount = await ContactSubmission.countDocuments({ purpose: 'Ambassador Application' });
    const unknownCount = await ContactSubmission.countDocuments({ $or: [
      { purpose: null },
      { purpose: undefined },
      { purpose: { $nin: VALID_PURPOSES } }
    ] });
    
    console.log(`\n📊 Final counts:`);
    console.log(`  Contact Inquiry: ${contactCount}`);
    console.log(`  Join Initiative: ${joinCount}`);
    console.log(`  Ambassador Application: ${ambassadorCount}`);
    if (unknownCount > 0) {
      console.log(`  ⚠️ Unknown purpose: ${unknownCount}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixSubmissionPurposes();
