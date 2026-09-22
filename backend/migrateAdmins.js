import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Admin from './src/models/Admin.js';

dotenv.config();

const migrateAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    console.log('Connected to DB');

    const adminUsers = await User.find({ role: 'Admin' });
    
    if (adminUsers.length === 0) {
      console.log('No Admins found in User collection.');
      process.exit(0);
    }

    console.log(`Found ${adminUsers.length} Admin(s) in User collection. Migrating...`);

    for (const user of adminUsers) {
      const adminExists = await Admin.findOne({ email: user.email });
      if (!adminExists) {
        // Create Admin (bypass validation since we copy hash directly)
        await Admin.collection.insertOne({
          _id: user._id, // Preserve ID for references (e.g., messages/bounties they already created)
          name: user.name,
          username: user.username,
          email: user.email,
          password: user.password, // already hashed
          role: 'Admin',
          isActive: user.isActive,
          isSuspended: user.isSuspended,
          loginHistory: user.loginHistory || [],
          lastLoginDate: user.lastLoginDate,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });
        console.log(`Migrated Admin: ${user.email}`);
      }
      
      // Delete from User collection
      await User.deleteOne({ _id: user._id });
      console.log(`Removed ${user.email} from User collection.`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateAdmins();
