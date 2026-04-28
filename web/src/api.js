import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // отправлять httpOnly куку с каждым запросом
});

// При 401 — сообщаем приложению, что сессия истекла
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

// --- API ФУНКЦИИ ---

// Авторизация
export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
  return response.data; // { email }
};

export const register = async (email, password) => {
  const response = await api.post('/register', { email, password });
  return response.data;
};

export const logout = async () => {
  await api.post('/logout');
};

export const checkAuth = async () => {
  const response = await api.get('/me');
  return response.data; // { user_id, email }
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

export const updateRelationship = async (id, description) => {
  const response = await api.put(`/relationships/${id}`, { description });
  return response.data;
};

export const deleteRelationship = async (id) => {
  const response = await api.delete(`/relationships/${id}`);
  return response.data;
};

export const saveNodePosition = async (id, x, y) => {
  return api.put('/people/position', { id: parseInt(id), x, y });
};
