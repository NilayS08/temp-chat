const ROOMS_KEY = 'tempchat_rooms'

export function saveRoom(chatId, ownerToken) {
  const rooms = getRooms()
  // Don't duplicate
  if (rooms.find(r => r.chatId === chatId)) return
  rooms.unshift({
    chatId,
    ownerToken,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  })
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
}

export function getRooms() {
  try {
    return JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]')
  } catch {
    return []
  }
}

export function updateLastSeen(chatId) {
  const rooms = getRooms()
  const room = rooms.find(r => r.chatId === chatId)
  if (room) {
    room.lastSeen = new Date().toISOString()
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
  }
}

export function deleteRoom(chatId) {
  const rooms = getRooms().filter(r => r.chatId !== chatId)
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
}