import connectDB from '@/lib/mongodb';
import Link from '@/models/Link';
import Domain from '@/models/Domain';
import Click from '@/models/Click';

export async function createIndexes() {
  try {
    await connectDB();
    
    console.log('Creating database indexes for performance...');
    
    // Indici per Domain
    await Domain.collection.createIndex({ domain: 1, isActive: 1 }, { unique: true });
    await Domain.collection.createIndex({ domain: 1 });
    await Domain.collection.createIndex({ isActive: 1 });
    
    // Indici per Link
    await Link.collection.createIndex({ domainId: 1, shortPath: 1 }, { unique: true });
    await Link.collection.createIndex({ domainId: 1 });
    await Link.collection.createIndex({ shortPath: 1 });
    await Link.collection.createIndex({ totalClicks: -1 });
    await Link.collection.createIndex({ lastUsed: -1 });
    
    // Indici per Click
    await Click.collection.createIndex({ linkId: 1, timestamp: -1 });
    await Click.collection.createIndex({ domainId: 1, timestamp: -1 });
    await Click.collection.createIndex({ timestamp: -1 });
    await Click.collection.createIndex({ ip: 1 });
    await Click.collection.createIndex({ targetUrl: 1 });
    
    console.log('Database indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Esegui la creazione degli indici se questo file viene importato
if (require.main === module) {
  createIndexes();
}
