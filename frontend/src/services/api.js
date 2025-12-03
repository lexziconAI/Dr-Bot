import axios from 'axios'

// Support both local development and production deployment
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4700/api';

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000
})

// attach token
instance.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if(token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export default instance
