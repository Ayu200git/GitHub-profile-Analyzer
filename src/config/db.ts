import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'github_analyzer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Helper function to test database connectivity
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully to', process.env.DB_NAME);
    connection.release();
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}
