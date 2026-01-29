const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  console.log('🔧 Starting index fix script...\n');
  
  // Check if MongoDB URI exists
  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env file');
    console.log('Make sure your .env file has: MONGODB_URI=your_connection_string');
    process.exit(1);
  }
  
  console.log('📡 Connecting to MongoDB...');
  console.log('URI:', process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix customers collection
    console.log('🔧 Fixing customers collection...');
    try {
      const customerIndexes = await db.collection('customers').indexes();
      console.log('  Found indexes:', customerIndexes.map(i => i.name).join(', '));
      
      let droppedCount = 0;
      for (const index of customerIndexes) {
        if (index.name !== '_id_') {
          await db.collection('customers').dropIndex(index.name);
          console.log(`  ✅ Dropped: ${index.name}`);
          droppedCount++;
        }
      }
      console.log(`  Total dropped: ${droppedCount}\n`);
    } catch (error) {
      console.log('  ⚠️  No customers collection or indexes to drop\n');
    }

    // Fix entries collection
    console.log('🔧 Fixing entries collection...');
    try {
      const entryIndexes = await db.collection('entries').indexes();
      console.log('  Found indexes:', entryIndexes.map(i => i.name).join(', '));
      
      let droppedCount = 0;
      for (const index of entryIndexes) {
        if (index.name !== '_id_') {
          await db.collection('entries').dropIndex(index.name);
          console.log(`  ✅ Dropped: ${index.name}`);
          droppedCount++;
        }
      }
      console.log(`  Total dropped: ${droppedCount}\n`);
    } catch (error) {
      console.log('  ⚠️  No entries collection or indexes to drop\n');
    }

    console.log('✅ Index cleanup complete!');
    console.log('👉 Now restart your server with: npm run dev');
    console.log('   Mongoose will recreate the correct indexes automatically.\n');
    
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Add timeout to catch hanging connections
setTimeout(() => {
  console.error('\n❌ Script timeout after 30 seconds');
  console.error('Check your network connection or MongoDB URI');
  process.exit(1);
}, 30000);

fixIndexes();