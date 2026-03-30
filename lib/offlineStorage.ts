import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('deal_offline.db');

// Initialize offline database
export const initOfflineDB = () => {
    db.execSync(`
    CREATE TABLE IF NOT EXISTS offline_clients (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS offline_deals (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS offline_products (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER
    );
  `);
};

// Cache clients
export const cacheClients = (clients: any[]) => {
    const stmt = db.prepareSync(
        'INSERT OR REPLACE INTO offline_clients (id, data, synced, created_at) VALUES (?, ?, 1, ?)'
    );

    for (const client of clients) {
        stmt.executeSync([client.id, JSON.stringify(client), Date.now()]);
    }

    stmt.finalizeSync();
};

// Get cached clients
export const getCachedClients = (type?: 'wholesaler' | 'retailer') => {
    const rows = db.getAllSync('SELECT data FROM offline_clients WHERE synced = 1');
    const clients = rows.map((row: any) => JSON.parse(row.data));

    if (type) {
        return clients.filter((c: any) => c.client_type === type);
    }

    return clients;
};

// Cache products
export const cacheProducts = (products: any[]) => {
    const stmt = db.prepareSync(
        'INSERT OR REPLACE INTO offline_products (id, data, synced, created_at) VALUES (?, ?, 1, ?)'
    );

    for (const product of products) {
        stmt.executeSync([product.id, JSON.stringify(product), Date.now()]);
    }

    stmt.finalizeSync();
};

// Get cached products
export const getCachedProducts = () => {
    const rows = db.getAllSync('SELECT data FROM offline_products WHERE synced = 1');
    return rows.map((row: any) => JSON.parse(row.data));
};

// Cache deals
export const cacheDeals = (deals: any[]) => {
    const stmt = db.prepareSync(
        'INSERT OR REPLACE INTO offline_deals (id, data, synced, created_at) VALUES (?, ?, 1, ?)'
    );

    for (const deal of deals) {
        stmt.executeSync([deal.id, JSON.stringify(deal), Date.now()]);
    }

    stmt.finalizeSync();
};

// Get cached deals
export const getCachedDeals = () => {
    const rows = db.getAllSync('SELECT data FROM offline_deals WHERE synced = 1');
    return rows.map((row: any) => JSON.parse(row.data));
};

// Add to sync queue
export const addToSyncQueue = (tableName: string, operation: string, data: any) => {
    db.runSync(
        'INSERT INTO sync_queue (table_name, operation, data, created_at) VALUES (?, ?, ?, ?)',
        [tableName, operation, JSON.stringify(data), Date.now()]
    );
};

// Get sync queue
export const getSyncQueue = () => {
    const rows = db.getAllSync('SELECT * FROM sync_queue ORDER BY created_at ASC');
    return rows.map((row: any) => ({
        id: row.id,
        tableName: row.table_name,
        operation: row.operation,
        data: JSON.parse(row.data),
        createdAt: row.created_at,
    }));
};

// Remove from sync queue
export const removeFromSyncQueue = (id: number) => {
    db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
};

// Clear all offline data
export const clearOfflineData = () => {
    db.execSync(`
    DELETE FROM offline_clients;
    DELETE FROM offline_deals;
    DELETE FROM offline_products;
    DELETE FROM sync_queue;
  `);
};