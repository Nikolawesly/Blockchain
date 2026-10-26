import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to inject demo role and token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("insurechain_token");
  const demoRole = localStorage.getItem("insurechain_active_role") || "CUSTOMER";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["x-demo-role"] = demoRole;
  return config;
});

export const api = {
  // Health & System
  getHealth: () => apiClient.get("/health"),
  getStats: () => apiClient.get("/dashboard/stats"),
  getAdminOverview: () => apiClient.get("/dashboard/admin"),

  // Auth & Roles
  getDemoUsers: () => apiClient.get("/auth/demo-users"),
  login: (credentials) => apiClient.post("/auth/login", credentials),
  register: (userData) => apiClient.post("/auth/register", userData),
  getProfile: () => apiClient.get("/auth/me"),

  // Claims
  getClaims: () => apiClient.get("/claims"),
  getClaimById: (id) => apiClient.get(`/claims/${id}`),
  registerClaim: (formData) =>
    apiClient.post("/claims", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  assignSurveyor: (id, surveyorAddress) =>
    apiClient.post(`/claims/${id}/assign-surveyor`, { surveyorAddress }),
  submitVerification: (id, formData) =>
    apiClient.post(`/claims/${id}/verify`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  flagClaim: (id, reason) => apiClient.post(`/claims/${id}/flag`, { reason }),
  unflagClaim: (id, reason) => apiClient.post(`/claims/${id}/unflag`, { reason }),
  requestAdditionalInfo: (id, reason) =>
    apiClient.post(`/claims/${id}/request-info`, { reason }),
  provideAdditionalInfo: (id, formData) =>
    apiClient.post(`/claims/${id}/provide-info`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  approveClaim: (id, approvedAmount, decisionReference) =>
    apiClient.post(`/claims/${id}/approve`, { approvedAmount, decisionReference }),
  rejectClaim: (id, rejectionReason) =>
    apiClient.post(`/claims/${id}/reject`, { rejectionReason }),
  recordSettlement: (id, settlementReference) =>
    apiClient.post(`/claims/${id}/settle`, { settlementReference }),
  getCertificate: (id) => apiClient.get(`/claims/${id}/certificate`),

  // Evidence
  verifyIntegrity: (claimId, filename, expectedHash) =>
    apiClient.post("/evidence/verify-integrity", { claimId, filename, expectedHash }),
  getEvidenceUrl: (filename) => `${API_BASE_URL.replace("/api", "")}/uploads/${filename}`,
};

export default api;
