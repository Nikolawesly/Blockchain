const jwt = require("jsonwebtoken");
const { UserStore } = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "insurechain_super_secure_jwt_secret_key_2026_bct";

/**
 * Authentication middleware.
 * Supports standard Bearer JWT tokens, and allows Header 'x-demo-role' for interactive student demonstration mode.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await UserStore.findById(decoded.id);
      if (user) {
        req.user = {
          id: user._id || user.id,
          username: user.username,
          role: user.role,
          walletAddress: user.walletAddress,
          fullName: user.fullName,
        };
        return next();
      }
    }

    // Demo Mode fallback header (enables instant testing across roles in demo UI)
    const demoRole = req.headers["x-demo-role"];
    if (demoRole) {
      const normalizedRole = demoRole.toUpperCase();
      const demoUsers = {
        ADMIN: {
          username: "admin_demo",
          role: "ADMIN",
          walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          fullName: "System Administrator",
        },
        CUSTOMER: {
          username: "alice_policyholder",
          role: "CUSTOMER",
          walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          fullName: "Alice Johnson (Policyholder)",
        },
        SURVEYOR: {
          username: "bob_surveyor",
          role: "SURVEYOR",
          walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          fullName: "Bob Martinez (Certified Surveyor)",
        },
        INSURER: {
          username: "carol_claims_officer",
          role: "INSURER",
          walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          fullName: "Carol Davis (Senior Claims Officer)",
        },
      };

      if (demoUsers[normalizedRole]) {
        req.user = demoUsers[normalizedRole];
        return next();
      }
    }

    return res.status(401).json({
      error: "Authentication required",
      message: "Please provide a valid Bearer token or select a demo role.",
    });
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
      message: err.message,
    });
  }
}

/**
 * Role-Based Access Control guard.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Forbidden",
        message: `Action requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role}`,
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  JWT_SECRET,
};
