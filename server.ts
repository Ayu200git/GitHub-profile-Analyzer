import dotenv from "dotenv";
import app from "./src/app";
import { testConnection } from "./src/config/db";

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error(
      "Critical: Could not connect to the database. Server shutting down.",
    );
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
    console.log(
      `Swagger API Documentation dashboard available at http://localhost:${PORT}/api-docs`,
    );
  });
}

startServer();
