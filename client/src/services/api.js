import { getAccessToken, refreshToken } from "./authService";

const API_URL = "http://localhost:5000";

export const apiFetch = async (url, options = {}) => {
  let token = getAccessToken();
  console.log("TOKEN USED:", token);
  // 🔥 FIX: If no token, try to get one first
  if (!token) {
    const refreshRes = await refreshToken();
    if (refreshRes.accessToken) {
      token = refreshRes.accessToken;
    }
  }

  const isFormData = options.body instanceof FormData;
  let res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  // 🔁 If token expired → try refresh again
  if (res.status === 403 || res.status === 401) {
    const refreshRes = await refreshToken();

    if (refreshRes.accessToken) {
      token = refreshRes.accessToken;

      res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
        credentials: "include",
      });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw data;
  }

  return data;
};
