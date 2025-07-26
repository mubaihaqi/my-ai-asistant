import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

// Helper untuk mendapatkan token
const getAuthToken = () => localStorage.getItem("authToken");

// Helper untuk membuat headers dengan auth
const createAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

// Auth services
export const authService = {
  async verifyToken(token: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/verify-token`, {
        token,
      });
      return response.data;
    } catch (error) {
      console.warn("Token verification failed (server might be down):", error);
      return { valid: false };
    }
  },

  async authenticate(password: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth`, {
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  },
};

// Chat services
export const chatService = {
  async sendMessage(
    message: string,
    userName: string,
    image?: string | null,
    mimeType?: string | null
  ) {
    const response = await axios.post(
      `${API_BASE_URL}/api/chat`,
      { message, userName, image, mimeType },
      { headers: createAuthHeaders() }
    );
    return response.data;
  },

  async getChatHistory(limit = 20, beforeTimestamp?: string | null) {
    let url = `${API_BASE_URL}/api/chat-history?limit=${limit}`;
    if (beforeTimestamp) {
      url += `&before=${beforeTimestamp}`;
    }

    const response = await axios.get(url, { headers: createAuthHeaders() });
    return response.data;
  },

  async triggerProactive(idleCount: number) {
    const response = await axios.post(
      `${API_BASE_URL}/api/trigger-proactive`,
      { idleCount },
      { headers: createAuthHeaders() }
    );
    return response.data;
  },
};
