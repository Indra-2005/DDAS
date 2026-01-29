import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const API = axios.create({ baseURL: API_BASE });


API.interceptors.request.use(cfg => {
  const token = localStorage.getItem("ddas_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default API;
