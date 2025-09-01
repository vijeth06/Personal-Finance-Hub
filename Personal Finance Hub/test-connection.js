const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  console.log('MongoDB URI:', process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@'));
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Successfully connected to MongoDB!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
    await mongoose.disconnect();
    console.log('✅ Connection test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    console.log('\n🔧 Troubleshooting checklist:');
    console.log('1. ☁️  MongoDB Atlas cluster status: Check if your cluster is running');
    console.log('2. 🌐 Network access: Ensure your IP is whitelisted (or use 0.0.0.0/0 for testing)');
    console.log('3. 🔐 Database credentials: Verify username and password');
    console.log('4. 🌍 Internet connectivity: Check your internet connection');
    console.log('5. 📝 URI format: Ensure correct MongoDB URI format');
    console.log('6. 🔒 Database user permissions: Verify user has read/write access');
    
    process.exit(1);
  }
}

testConnection();