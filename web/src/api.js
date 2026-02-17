import axios from 'axios';

// Создаем экземпляр axios
const api = axios.create({
  baseURL: '/api',
});

// --- ПЕРЕХВАТЧИК (INTERCEPTOR) ---
// Перед отправкой любого запроса, этот код проверит, есть ли токен в "кармане" (localStorage)
// И если есть, прикрепит его к заголовкам.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- API ФУНКЦИИ ---

// Авторизация
export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
  return response.data; // Вернет { token: "...", email: "..." }
};

export const register = async (email, password) => {
  const response = await api.post('/register', { email, password });
  return response.data;
};

// Люди
export const fetchPeople = async () => {
  const response = await api.get('/people');
  return response.data;
};

export const createPerson = async (person) => {
  const response = await api.post('/people', person);
  return response.data;
};

export const updatePerson = async (id, person) => {
  const response = await api.put(`/people/${id}`, person);
  return response.data;
};

export const deletePerson = async (id) => {
  const response = await api.delete(`/people/${id}`);
  return response.data;
};

// Связи
export const fetchRelationships = async () => {
  const response = await api.get('/relationships');
  return response.data;
};

export const createRelationship = async (relationship) => {
  const response = await api.post('/relationships', relationship);
  return response.data;
};

export const deleteRelationship = async (id) => {
  const response = await api.delete(`/relationships/${id}`);
  return response.data;
};

export const saveNodePosition = async (id, x, y) => {
  return api.put('/people/position', { id: parseInt(id), x, y });
};
