import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ATLAS_URI = 'mongodb://harshalpamar_db_user:R0gMtjiKndFqIG8o@ac-gbm3vnu-shard-00-00.ucpqz60.mongodb.net:27017,ac-gbm3vnu-shard-00-01.ucpqz60.mongodb.net:27017,ac-gbm3vnu-shard-00-02.ucpqz60.mongodb.net:27017/sthirdb?ssl=true&replicaSet=atlas-275buu-shard-0&authSource=admin&retryWrites=true&w=majority';
// MONGO_URI from your .env points to the new local docker db
const LOCAL_URI = process.env.MONGO_URI;

async function migrate() {
    try {
        console.log('Connecting to Atlas Database...');
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log('Connected to Atlas DB.');
        
        console.log('Connecting to Local Docker Database:', LOCAL_URI);
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('Connected to Local Docker DB.');
        
        const atlasDb = atlasConn.db;
        const localDb = localConn.db;

        // Get all collections from Atlas DB
        const collections = await atlasDb.listCollections().toArray();
        const collectionNames = collections.map(c => c.name).filter(name => !name.startsWith('system.'));

        console.log(`Found ${collectionNames.length} collections in Atlas DB to migrate:`, collectionNames);

        for (const collectionName of collectionNames) {
            console.log(`Migrating collection: ${collectionName}...`);
            const atlasCollection = atlasDb.collection(collectionName);
            const localCollection = localDb.collection(collectionName);

            // Fetch all documents from Atlas
            const docs = await atlasCollection.find({}).toArray();
            console.log(`  - Found ${docs.length} documents in Atlas.`);

            if (docs.length > 0) {
                // Clear existing documents in local for this collection to avoid duplicates
                await localCollection.deleteMany({});
                
                // Insert into local
                await localCollection.insertMany(docs);
                console.log(`  - Successfully inserted ${docs.length} documents into Local Docker DB.`);
            } else {
                console.log(`  - Skipping (empty collection).`);
            }
        }

        console.log('Migration completed successfully!');
        
        await atlasConn.close();
        await localConn.close();
        
    } catch (e) {
        console.error('Error during migration:', e);
        process.exit(1);
    }
}

migrate();
