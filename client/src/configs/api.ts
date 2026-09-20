import axios from "axios";

const api = axios.create({
    // In production, we use a relative path so Vercel can proxy it. 
    // In development, we use localhost:3000.
    baseURL: import.meta.env.PROD ? "" : 'http://localhost:3000',
    withCredentials:true
})

console.log("Axios baseURL is set to:", api.defaults.baseURL);

export default api;