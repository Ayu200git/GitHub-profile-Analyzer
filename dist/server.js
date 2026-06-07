"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./src/app"));
const db_1 = require("./src/config/db");
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
async function startServer() {
    // 1. Verify Database connectivity before booting server
    const dbConnected = await (0, db_1.testConnection)();
    if (!dbConnected) {
        console.error('⚠️ Critical: Could not connect to the database. Server shutting down.');
        process.exit(1);
    }
    // 2. Start listening for requests
    app_1.default.listen(PORT, () => {
        console.log(`🚀 Server is listening at http://localhost:${PORT}`);
        console.log(`📖 Swagger API Documentation dashboard available at http://localhost:${PORT}/api-docs`);
    });
}
startServer();
