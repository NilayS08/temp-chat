import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export const createChat = () => api.post('/create_chat')

export const getChatInfo = (chatId) => api.get(`/chat/${chatId}`)

export const joinChat = (chatId, nickname) =>
  api.post(`/join/${chatId}?nickname=${encodeURIComponent(nickname)}`)

export const getMessages = (chatId, ownerToken) =>
  api.get(`/messages/${chatId}`, {
    headers: { 'X-Owner-Token': ownerToken }
  })

export const getPreview = (chatId, ownerToken) =>
  api.get(`/preview/${chatId}`, {
    headers: { 'X-Owner-Token': ownerToken }
  })

export default api