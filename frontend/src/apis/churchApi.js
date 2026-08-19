const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5100/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Request failed.");
  }

  return safeJson(response);
}

async function safeJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export const churchApi = {
  async getHealth() {
    return request("/health");
  },

  async getFamilies() {
    return request("/families");
  },

  async getNextFamilyId() {
    return request("/families/next-id");
  },

  async createFamily(payload) {
    return request("/families", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateFamily(id, payload) {
    return request(`/families/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
