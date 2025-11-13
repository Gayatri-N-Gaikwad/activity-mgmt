import axios from "axios";

// Detect environment and set backend URL accordingly
const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  // 👆 If deployed, it uses the environment variable from Netlify/Vercel
  // 👇 Otherwise, it defaults to your local backend
});

export default API;
