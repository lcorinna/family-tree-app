import axios from 'axios';

// Создаем экземпляр axios.
// Благодаря прокси в vite.config.js, запросы на /api уйдут на порт 8080
const api = axios.create({
    baseURL: '/api',
});

export const fetchPeople = async () => {
    const response = await api.get('/people');
    return response.data; // Возвращает массив людей
};

export const fetchRelationships = async () => {
    const response = await api.get('/relationships');
    return response.data; // Возвращает массив связей
};

export const createPerson = async (person) => {
    const response = await api.post('/people', person);
    return response.data;
};

export const createRelationship = async (relationship) => {
    const response = await api.post('/relationships', relationship);
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

export const deleteRelationship = async (id) => {
    const response = await api.delete(`/relationships/${id}`);
    return response.data;
};