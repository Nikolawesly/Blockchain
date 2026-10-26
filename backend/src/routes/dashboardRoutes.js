const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/stats", dashboardController.getStats);
router.get("/admin", authenticate, requireRole("ADMIN"), dashboardController.getAdminOverview);

module.exports = router;
