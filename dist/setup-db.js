"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
        connection = await promise_1.default.createConnection(connectionConfig);
        console.log('✅ Connected to MySQL server.');
        // Read schema.sql content
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        if (!fs_1.default.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }
        console.log('📖 Reading schema.sql...');
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        // Split SQL file contents by semicolon to run statements sequentially
        // Filter out empty statements and SQL comments
        const statements = schemaSql
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => {
            if (!statement)
                return false;
            // Ignore single-line comments
            if (statement.startsWith('--') || statement.startsWith('#'))
                return false;
            return true;
        });
        console.log(`🚀 Executing ${statements.length} SQL statements...`);
        for (const statement of statements) {
            if (statement.length > 0) {
                await connection.query(statement);
            }
        }
        console.log('🎉 Database and tables set up successfully!');
    }
    catch (error) {
        console.error('❌ Database setup failed:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('💡 Please check your DB_USER and DB_PASSWORD configurations in the .env file.');
        }
    }
    finally {
        if (connection) {
            await connection.end();
        }
    }
}
setupDatabase();
