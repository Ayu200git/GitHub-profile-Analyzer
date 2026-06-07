import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  console.log('🔄 Starting database setup...');
  
  // Connection configuration without specifying database name first (to create it if missing)
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL server.');

    // Read schema.sql content
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    
    console.log('📖 Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Clean comments before splitting
    const cleanedSql = schemaSql
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
      .replace(/--.*$/gm, '')           // remove double-dash comments
      .replace(/#.*$/gm, '');           // remove hash comments

    // Split SQL file contents by semicolon to run statements sequentially
    const statements = cleanedSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`🚀 Executing ${statements.length} SQL statements...`);
    for (const statement of statements) {
      if (statement.length > 0) {
        await connection.query(statement);
      }
    }

    console.log('🎉 Database and tables set up successfully!');
  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Please check your DB_USER and DB_PASSWORD configurations in the .env file.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
