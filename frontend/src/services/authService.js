import api from "./api";

// Login User
export const loginUser = async (loginData) => {
  try {
    const response = await api.post("/auth/login", loginData);

    // Store JWT Token
    localStorage.setItem("access_token", response.data.access_token);

    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Logout User
export const logoutUser = () => {
  localStorage.removeItem("access_token");
};

// Check Authentication
export const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};