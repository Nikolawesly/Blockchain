import { ethers } from "ethers";
import contractConfig from "../config/contractConfig.json";

export class Web3Service {
  static isMetaMaskInstalled() {
    return typeof window !== "undefined" && Boolean(window.ethereum);
  }

  static async connectMetaMask() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error("MetaMask is not installed. Using backend development signer for demonstration.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    return {
      provider,
      signer,
      address: await signer.getAddress(),
      chainId: Number(network.chainId),
    };
  }

  static getContractConfig() {
    return contractConfig;
  }
}

export default Web3Service;
