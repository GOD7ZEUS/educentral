import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const storedSchool = localStorage.getItem("activeSchool");
  if (storedSchool) {
    const { id } = JSON.parse(storedSchool);
    config.params = { schoolId: id, ...config.params };
  }

  return config;
});
