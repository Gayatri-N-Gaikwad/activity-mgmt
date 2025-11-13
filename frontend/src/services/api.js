import axios from "axios";

// Detect environment and set backend URL accordingly
const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL + "/api" || "http://localhost:5000/api",
  // 👆 Uses your Render backend when deployed (from Netlify env variable)
  // 👇 Defaults to local backend when running locally
});

export default API;
