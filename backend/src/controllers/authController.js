const jwt = require("jsonwebtoken");
const { UserStore } = require("../models/User");
const { JWT_SECRET } = require("../middleware/auth");

const DEMO_ACCOUNTS = [
  {
    role: "ADMIN",
    username: "admin_demo",
    password: "Password123!",
    fullName: "System Administrator",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    organization: "InsureChain Consortium Governance",
    description: "Has full administrative oversight, role provisioning, and contract governance access.",
  },
  {
    role: "CUSTOMER",
    username: "alice_policyholder",
    password: "Password123!",
    fullName: "Alice Johnson",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    organization: "Insured Retail Client",
    description: "Policyholder who registers claims, uploads medical/damage evidence, and monitors settlement.",
  },
  {
    role: "SURVEYOR",
    username: "bob_surveyor",
    password: "Password123!",
    fullName: "Bob Martinez",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    organization: "Apex Independent Loss Assessors Ltd.",
    description: "Certified field surveyor who inspects digital evidence, flags anomalies, and submits verification findings.",
  },
  {
    role: "INSURER",
    username: "carol_claims_officer",
    password: "Password123!",
    fullName: "Carol Davis",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    organization: "Global Shield Underwriting Corp.",
    description: "Senior Claims Officer authorized to approve/reject verified claims and record settlements.",
  },
];

async function seedDemoUsers() {
  for (const acc of DEMO_ACCOUNTS) {
    const existing = await UserStore.findByUsername(acc.username);
    if (!existing) {
      await UserStore.create(acc);
    }
  }
}

async function register(req, res) {
  try {
    const { username, password, role, walletAddress, fullName, organization, email } = req.body;
    if (!username || !password || !role || !walletAddress || !fullName) {
      return res.status(400).json({ error: "Missing required registration fields" });
    }

    const existing = await UserStore.findByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already registered" });
    }

    const newUser = await UserStore.create({
      username,
      password,
      role: role.toUpperCase(),
      walletAddress,
      fullName,
      organization: organization || "InsureChain Network",
      email,
    });

    const token = jwt.sign(
      { id: newUser._id || newUser.id, role: newUser.role, username: newUser.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: newUser._id || newUser.id,
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
        walletAddress: newUser.walletAddress,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed", details: err.message });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await UserStore.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isMatch = await UserStore.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id || user.id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id || user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        walletAddress: user.walletAddress,
        organization: user.organization,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed", details: err.message });
  }
}

async function getDemoAccounts(req, res) {
  return res.json({
    accounts: DEMO_ACCOUNTS.map(({ password, ...rest }) => rest),
  });
}

async function getProfile(req, res) {
  return res.json({
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  getDemoAccounts,
  getProfile,
  seedDemoUsers,
};
