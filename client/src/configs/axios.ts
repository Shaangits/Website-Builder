import axios from 'axios';

const api = axios.create({
    baseURL: "https://website-builder-backend-d5ya.onrender.com" ,
    withCredentials: true
})


export default api;
