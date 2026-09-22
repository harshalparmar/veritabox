import { io } from 'socket.io-client';

// Dynamic Socket resolution for cross-device network access
const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    return `http://${hostname}:5000`;
  }
  
  return "http://localhost:5000";
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: localStorage.getItem('token') });
  }
});
