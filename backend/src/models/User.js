const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { isMongoConnected, memoryStore } = require("../config/db");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "SURVEYOR", "INSURER", "ADMIN"],
      required: true,
    },
    walletAddress: { type: String, required: true, lowercase: true },
    fullName: { type: String, required: true },
    organization: { type: String, default: "InsureChain Consortium" },
    email: { type: String, trim: true },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

class UserStore {
  static async findByUsername(username) {
    if (isMongoConnected()) {
      return await UserModel.findOne({ username: username.toLowerCase().trim() });
    }
    return memoryStore.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim()
    );
  }

  static async findById(id) {
    if (isMongoConnected()) {
      return await UserModel.findById(id);
    }
    return memoryStore.users.find((u) => u.id === id || u._id === id);
  }

  static async findByWallet(walletAddress) {
    if (!walletAddress) return null;
    const addr = walletAddress.toLowerCase();
    if (isMongoConnected()) {
      return await UserModel.findOne({ walletAddress: addr });
    }
    return memoryStore.users.find((u) => u.walletAddress.toLowerCase() === addr);
  }

  static async create(userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    const normalized = {
      ...userData,
      username: userData.username.toLowerCase().trim(),
      password: hashedPassword,
      walletAddress: userData.walletAddress.toLowerCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoConnected()) {
      return await UserModel.create(normalized);
    }

    const id = "usr_" + Math.random().toString(36).substring(2, 11);
    const userDoc = { _id: id, id, ...normalized };
    memoryStore.users.push(userDoc);
    return userDoc;
  }

  static async getAll() {
    if (isMongoConnected()) {
      return await UserModel.find().select("-password");
    }
    return memoryStore.users.map(({ password, ...u }) => u);
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }
}

module.exports = {
  UserModel,
  UserStore,
};
