import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL + "/api"
  : "http://localhost:5000/api";

const API = axios.create({
  baseURL,
});

// attach Authorization header automatically from localStorage
API.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
