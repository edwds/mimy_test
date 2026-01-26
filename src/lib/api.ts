export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");
// Hardcoded for now as requested, or can be env var
export const WEB_BASE_URL = "https://mimytest.vercel.app";
console.log("API_BASE_URL:", API_BASE_URL); // Debug logging
