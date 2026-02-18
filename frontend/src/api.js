import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// Dynamically determine API URL to allow mobile access
// If accessing from a network IP (e.g. 192.168.x.x), assume backend is on the same host at port 8000
const dynamicBaseURL = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
  ? `http://${window.location.hostname}:8000`
  : API_BASE;

const API = axios.create({ baseURL: dynamicBaseURL });


API.interceptors.request.use(cfg => {
  const token = localStorage.getItem("ddas_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 && !error.config.url.includes("/login")) {
        localStorage.removeItem("ddas_token");
        window.location.href = "/login";
      } else {
        console.error(`API Error ${error.response.status}:`, error.response.data?.detail || error.message);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
