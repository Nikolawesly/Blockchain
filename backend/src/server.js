const express = require("express");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
require("dotenv").config();

const { connectDB } = require("./config/db");
const { seedDemoUsers } = require("./controllers/authController");
const blockchainService = require("./services/blockchainService");

const authRoutes = require("./routes/authRoutes");
const claimRoutes = require("./routes/claimRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(morgan("dev"));

// Static files for uploaded evidence (protected through router / direct)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/evidence", evidenceRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const bcHealth = await blockchainService.checkConnection();
  return res.json({
    status: "healthy",
    service: "InsureChain Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    blockchain: bcHealth,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[InsureChain Error]", err);
  return res.status(err.status || 500).json({
    error: err.name || "ServerError",
    message: err.message || "An unexpected error occurred",
  });
});

async function startServer() {
  await connectDB();
  await seedDemoUsers();
  blockchainService.loadContractConfig();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` InsureChain Backend API running on port ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
