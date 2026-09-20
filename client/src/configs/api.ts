import axios from "axios";

console.log("VITE_BASE_URL:", import.meta.env.VITE_BASE_URL);

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:3000',
    withCredentials:true
})

console.log("Axios baseURL is set to:", api.defaults.baseURL);

export default api;