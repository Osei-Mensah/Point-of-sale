const API_URL = "http://localhost:5000";

let accessToken = null;

// SET TOKEN
export const setAccessToken = (token) => {
  accessToken = token;
};

// GET TOKEN
export const getAccessToken = () => {
  return accessToken;
};

// LOGIN
export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // IMPORTANT for cookies
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    setAccessToken(data.accessToken);
  }

  return data;
};

// REFRESH TOKEN
export const refreshToken = async () => {
  const res = await fetch("http://localhost:5000/auth/refresh", {
    method: "POST",
    credentials: "include",
  });

  const data = await res.json();

  if (res.ok && data.accessToken) {
    accessToken = data.accessToken; // 🔥 CRITICAL FIX
  }

  return data;
};
// LOGOUT
export const logout = async () => {
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();

    // Clear access token in memory
    accessToken = null;

    return data;
  } catch (err) {
    console.error("Logout failed:", err);
    return null;
  }
};
