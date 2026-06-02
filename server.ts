/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dns from "dns";
import dotenv from "dotenv";
dotenv.config({ override: true });
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/server/routes";

// Force local DNS resolution preferences
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security elements: Helmet-like standard response headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Body parsers
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Gateway Log middleware
  app.use((req, res, next) => {
    console.log(`[API GATEWAY] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });

  // REST API Gateway endpoints
  app.use("/api", apiRouter);

  // Health probe
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      time: new Date().toISOString(),
      service: "SkillSphere API Gateway"
    });
  });

  // Vite development bundler or production static server config
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite Middleware in development container...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving pre-built distribution in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`================================================================`);
    console.log(`  SKILLSPHERE PLATFORM STARTUP SUCCESS!                         `);
    console.log(`  Listening on: http://0.0.0.0:${PORT}                          `);
    console.log(`  Environment:  ${process.env.NODE_ENV || "development"}        `);
    console.log(`================================================================`);
  });
}

startServer().catch((err) => {
  console.error("FATAL failure during SkillSphere server initiation:", err);
  process.exit(1);
});
