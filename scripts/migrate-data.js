#!/usr/bin/env node

/**
 * IDF Logistics App - Data Migration Script
 * 
 * This script migrates data from JSON files to Firebase Firestore collections
 * and creates Firebase Auth accounts for users.
 * 
 * Usage:
 *   node scripts/migrate-data.js [options]
 * 
 * Options:
 *   --dry-run    Run without making actual changes (default: false)
 *   --verbose    Show detailed progress information (default: false)
 *   --help       Show this help message
 * 
 * Prerequisites:
 *   1. Firebase project created and configured
 *   2. Service account key file downloaded and placed in project root
 *   3. Environment variables set in .env file
 *   4. Firebase Admin SDK installed: npm install firebase-admin
 * 
 * Environment Variables Required:
 *   FIREBASE_PROJECT_ID=your-project-id
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./path-to-service-account-key.json
 */

const fs = require('fs').promises;
const path = require('path');
const admin = require('firebase-admin');

// Configuration
const CONFIG = {
  dataDir: path.join(__dirname, '../public/data'),
  collections: {
    users: 'users',
    schedules: 'schedules',
    dutyTypes: 'dutyTypes',
    availability: 'availability'
  },
  batchSize: 500, // Firestore batch write limit
  defaultPassword: 'TempPass123!' // Temporary password for Firebase Auth users
};

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const showHelp = args.includes('--help');

// Progress tracking
let stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  schedules: { total: 0, migrated: 0, errors: 0 },
  dutyTypes: { total: 0, migrated: 0, errors: 0 },
  availability: { total: 0, migrated: 0, errors: 0 },
  authAccounts: { total: 0, created: 0, errors: 0 }
};

/**
 * Display help information
 */
function showHelpMessage() {
  console.log(`
IDF Logistics App - Data Migration Script

This script migrates data from JSON files to Firebase Firestore and creates
Firebase Authentication accounts for users.

Usage:
  node scripts/migrate-data.js [options]

Options:
  --dry-run    Run without making actual changes (shows what would be done)
  --verbose    Show detailed progress information
  --help       Show this help message

Prerequisites:
  1. Create a Firebase project at https://console.firebase.google.com
  2. Enable Firestore Database and Authentication
  3. Generate a service account key:
     - Go to Project Settings > Service Accounts
     - Click "Generate new private key"
     - Save the JSON file to your project root
  4. Install Firebase Admin SDK: npm install firebase-admin
  5. Create .env file with required variables:
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_SERVICE_ACCOUNT_PATH=./service-account-key.json

Data Sources:
  - public/data/users.json → Firestore 'users' collection + Firebase Auth
  - public/data/schedules.json → Firestore 'schedules' collection
  - public/data/duty-types.json → Firestore 'dutyTypes' collection
  - public/data/availability.json → Firestore 'availability' collection

Security Notes:
  - Users will be created with temporary passwords
  - Original password hashes are preserved in Firestore user documents
  - Users should reset passwords on first login
  - Firestore security rules should be configured before running
`);
}

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
    }
    
    if (!serviceAccountPath) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable is required');
    }
    
    // Check if service account file exists
    try {
      await fs.access(serviceAccountPath);
    } catch (error) {
      throw new Error(`Service account file not found: ${serviceAccountPath}`);
    }
    
    // Initialize Firebase Admin
    const serviceAccount = require(path.resolve(serviceAccountPath));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
    
    console.log(`✅ Firebase initialized for project: ${projectId}`);
    return { db: admin.firestore(), auth: admin.auth() };
    
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
  }
}

/**
 * Load JSON data from file
 */
async function loadJsonData(filename) {
  try {
    const filePath = path.join(CONFIG.dataDir, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load ${filename}:`, error.message);
    return null;
  }
}

/**
 * Log progress information
 */
function logProgress(message, isError = false) {
  if (isVerbose || isError) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? '❌' : '📝';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

/**
 * Create Firebase Auth account for user
 */
async function createAuthAccount(auth, user) {
  try {
    if (isDryRun) {
      logProgress(`Would create auth account for user: ${user.email}`);
      return { uid: `dry-run-${user.id}` };
    }
    
    const userRecord = await auth.createUser({
      uid: user.id,
      email: user.email,
      password: CONFIG.defaultPassword,
      displayName: `${user.firstName} ${user.lastName}`,
      disabled: !user.isActive
    });
    
    logProgress(`Created auth account for: ${user.email} (UID: ${userRecord.uid})`);
    stats.authAccounts.created++;
    
    return userRecord;
    
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      logProgress(`Auth account already exists for: ${user.email}`);
      return { uid: user.id };
    } else if (error.code === 'auth/email-already-exists') {
      logProgress(`Email already in use: ${user.email}`, true);
      stats.authAccounts.errors++;
      return null;
    } else {
      logProgress(`Failed to create auth account for ${user.email}: ${error.message}`, true);
      stats.authAccounts.errors++;
      return null;
    }
  }
}

/**
 * Migrate users collection and create auth accounts
 */
async function migrateUsers(db, auth, users) {
  console.log('\n🔄 Migrating users...');
  stats.users.total = users.length;
  stats.authAccounts.total = users.length;
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const user of users) {
    try {
      // Create Firebase Auth account
      const authResult = await createAuthAccount(auth, user);
      
      // Prepare user document for Firestore
      const userDoc = {
        ...user,
        // Preserve original password hash for reference
        originalPasswordHash: user.password,
        // Remove plain password from Firestore document
        password: undefined,
        // Add Firebase Auth UID
        authUid: authResult?.uid || user.id,
        // Add migration metadata
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migrationSource: 'json-file'
      };
      
      // Remove undefined fields
      Object.keys(userDoc).forEach(key => {
        if (userDoc[key] === undefined) {
          delete userDoc[key];
        }
      });
      
      if (!isDryRun) {
        const userRef = db.collection(CONFIG.collections.users).doc(user.id);
        batch.set(userRef, userDoc);
        batchCount++;
        
        // Commit batch if it reaches the limit
        if (batchCount >= CONFIG.batchSize) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      stats.users.migrated++;
      logProgress(`Migrated user: ${user.email} (${user.role})`);
      
    } catch (error) {
      stats.users.errors++;
      logProgress(`Failed to migrate user ${user.email}: ${error.message}`, true);
    }
  }
  
  // Commit remaining batch
  if (batchCount > 0 && !isDryRun) {
    await batch.commit();
  }
  
  console.log(`✅ Users migration completed: ${stats.users.migrated}/${stats.users.total} migrated`);
}

/**
 * Migrate a generic collection
 */
async function migrateCollection(db, collectionName, data, dataKey) {
  console.log(`\n🔄 Migrating ${collectionName}...`);
  const items = data[dataKey] || [];
  stats[dataKey].total = items.length;
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const item of items) {
    try {
      const docData = {
        ...item,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migrationSource: 'json-file'
      };
      
      if (!isDryRun) {
        const docRef = db.collection(collectionName).doc(item.id);
        batch.set(docRef, docData);
        batchCount++;
        
        if (batchCount >= CONFIG.batchSize) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      stats[dataKey].migrated++;
      logProgress(`Migrated ${dataKey}: ${item.id} - ${item.name || item.status || 'item'}`);
      
    } catch (error) {
      stats[dataKey].errors++;
      logProgress(`Failed to migrate ${dataKey} ${item.id}: ${error.message}`, true);
    }
  }
  
  if (batchCount > 0 && !isDryRun) {
    await batch.commit();
  }
  
  console.log(`✅ ${collectionName} migration completed: ${stats[dataKey].migrated}/${stats[dataKey].total} migrated`);
}

/**
 * Display migration summary
 */
function displaySummary() {
  console.log('\n📊 Migration Summary:');
  console.log('═'.repeat(50));
  
  const mode = isDryRun ? '(DRY RUN)' : '';
  console.log(`Mode: ${isDryRun ? 'Dry Run' : 'Live Migration'} ${mode}`);
  console.log('');
  
  Object.entries(stats).forEach(([collection, data]) => {
    const successRate = data.total > 0 ? ((data.migrated / data.total) * 100).toFixed(1) : '0.0';
    const status = data.errors > 0 ? '⚠️' : '✅';
    
    console.log(`${status} ${collection.padEnd(15)} ${data.migrated}/${data.total} (${successRate}%) ${data.errors > 0 ? `- ${data.errors} errors` : ''}`);
  });
  
  const totalItems = Object.values(stats).reduce((sum, data) => sum + data.total, 0);
  const totalMigrated = Object.values(stats).reduce((sum, data) => sum + data.migrated, 0);
  const totalErrors = Object.values(stats).reduce((sum, data) => sum + data.errors, 0);
  
  console.log('');
  console.log(`Total: ${totalMigrated}/${totalItems} items migrated`);
  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} errors occurred during migration`);
  }
  
  if (isDryRun) {
    console.log('\n💡 This was a dry run. No actual changes were made.');
    console.log('   Remove --dry-run flag to perform the actual migration.');
  } else {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Firebase Console');
    console.log('2. Test application with Firebase backend');
    console.log('3. Configure Firestore security rules');
    console.log('4. Update application to use Firebase Auth');
    console.log(`5. Users should reset passwords (current temp password: ${CONFIG.defaultPassword})`);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  try {
    console.log('🚀 IDF Logistics App - Data Migration Script');
    console.log('═'.repeat(50));
    
    if (isDryRun) {
      console.log('🔍 Running in DRY RUN mode - no changes will be made');
    }
    
    // Initialize Firebase
    const { db, auth } = await initializeFirebase();
    
    // Load all JSON data
    console.log('\n📂 Loading JSON data files...');
    const [usersData, schedulesData, dutyTypesData, availabilityData] = await Promise.all([
      loadJsonData('users.json'),
      loadJsonData('schedules.json'),
      loadJsonData('duty-types.json'),
      loadJsonData('availability.json')
    ]);
    
    // Validate data
    if (!usersData?.users) {
      throw new Error('Invalid or missing users.json data');
    }
    if (!schedulesData?.schedules) {
      throw new Error('Invalid or missing schedules.json data');
    }
    if (!dutyTypesData?.dutyTypes) {
      throw new Error('Invalid or missing duty-types.json data');
    }
    if (!availabilityData?.availability) {
      throw new Error('Invalid or missing availability.json data');
    }
    
    console.log('✅ All data files loaded successfully');
    
    // Migrate data in order (users first for auth accounts)
    await migrateUsers(db, auth, usersData.users);
    await migrateCollection(db, CONFIG.collections.dutyTypes, dutyTypesData, 'dutyTypes');
    await migrateCollection(db, CONFIG.collections.schedules, schedulesData, 'schedules');
    await migrateCollection(db, CONFIG.collections.availability, availabilityData, 'availability');
    
    // Display summary
    displaySummary();
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    if (isVerbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Entry point
 */
async function main() {
  if (showHelp) {
    showHelpMessage();
    return;
  }
  
  // Check for required dependencies
  try {
    require('firebase-admin');
  } catch (error) {
    console.error('❌ Firebase Admin SDK not found. Please install it:');
    console.error('   npm install firebase-admin');
    process.exit(1);
  }
  
  try {
    require('dotenv');
  } catch (error) {
    console.warn('⚠️  dotenv not found. Make sure environment variables are set.');
  }
  
  await migrate();
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error.message);
  if (isVerbose) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error.message);
  if (isVerbose) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { migrate, CONFIG, stats };