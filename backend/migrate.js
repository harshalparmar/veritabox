import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Standardize Atlas URI for DNS resolution issues with Node.js on some systems
const ATLAS_URI = 'mongodb://harshalpamar_db_user:R0gMtjiKndFqIG8o@ac-gbm3vnu-shard-00-00.ucpqz60.mongodb.net:27017,ac-gbm3vnu-shard-00-01.ucpqz60.mongodb.net:27017,ac-gbm3vnu-shard-00-02.ucpqz60.mongodb.net:27017/sthirdb?ssl=true&replicaSet=atlas-275buu-shard-0&authSource=admin&retryWrites=true&w=majority';
const LOCAL_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

async function migrate() {
    try {
        console.log('Connecting to Local Database:', LOCAL_URI);
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('Connected to Local DB.');
        
        console.log('Connecting to Atlas Database:', ATLAS_URI);
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('Connected to Atlas DB.');
        
        const localDb = localConn.db;
        const atlasDb = atlasConn.db;

        // Get all collections from local DB
        const collections = await localDb.listCollections().toArray();
        const collectionNames = collections.map(c => c.name).filter(name => name !== 'system.indexes');

        console.log(`Found ${collectionNames.length} collections in local DB to migrate:`, collectionNames);

        for (const collectionName of collectionNames) {
            console.log(`Migrating collection: ${collectionName}...`);
            const localCollection = localDb.collection(collectionName);
            const atlasCollection = atlasDb.collection(collectionName);

            // Fetch all documents from local
            const docs = await localCollection.find({}).toArray();
            console.log(`  - Found ${docs.length} documents.`);

            if (docs.length > 0) {
                // Clear existing documents in Atlas for this collection to avoid duplicates
                await atlasCollection.deleteMany({});
                
                // Insert into Atlas
                await atlasCollection.insertMany(docs);
                console.log(`  - Successfully inserted ${docs.length} documents into Atlas.`);
            } else {
                console.log(`  - Skipping (empty collection).`);
            }
        }

        console.log('Migration completed successfully!');
        
        await localConn.close();
        await atlasConn.close();
        
    } catch (e) {
        console.error('Error during migration:', e);
        process.exit(1);
    }
}

migrate();
