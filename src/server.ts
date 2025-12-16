import { createServer } from "http";
import { createApp } from "./core/app";
import { initDatabase } from "./config/database";
import { env } from "./config/env";

async function bootstrap() {
  try {
    console.log("⏳ Initializing database...");
    await initDatabase();

    const app = createApp();
    const server = createServer(app);

    const PORT = env.port;

    server.listen(PORT, () => {
      console.log(`✅ Server started on port ${PORT} (${env.nodeEnv})`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("🔻 Shutting down server...");
      server.close(() => {
        console.log("🛑 HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("❌ Bootstrap failed. Exiting.", error);
    process.exit(1);
  }
}

bootstrap();
