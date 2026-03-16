import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRooms, deleteRoom } from '../utils/roomStorage'
import { getPreview } from '../api/client'

export default function Dashboard() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [previews, setPreviews] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getRooms()
    setRooms(stored)
    // Fetch last message preview for each room
    Promise.all(
      stored.map(async (room) => {
        try {
          const res = await getPreview(room.chatId, room.ownerToken)
          return { chatId: room.chatId, preview: res.data }
        } catch {
          return { chatId: room.chatId, preview: null }
        }
      })
    ).then(results => {
      const map = {}
      results.forEach(r => { map[r.chatId] = r.preview })
      setPreviews(map)
      setLoading(false)
    })
  }, [])

  const handleDelete = (e, chatId) => {
    e.stopPropagation()
    if (!confirm('Remove this chat from your list?')) return
    deleteRoom(chatId)
    localStorage.removeItem(`owner_token_${chatId}`)
    setRooms(prev => prev.filter(r => r.chatId !== chatId))
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    const date = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - date) / 86400000)
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ←
        </button>
        <h1 className="text-white font-semibold text-lg">My Chats</h1>
        <div className="flex-1" />
        <button
          onClick={async () => {
            const { createChat } = await import('../api/client')
            const { saveRoom } = await import('../utils/roomStorage')
            const res = await createChat()
            const { chat_id, owner_token } = res.data
            localStorage.setItem(`owner_token_${chat_id}`, owner_token)
            saveRoom(chat_id, owner_token)
            navigate(`/chat/${chat_id}`)
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                     px-4 py-2 rounded-xl transition-colors font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500">Loading chats…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-gray-400 text-lg">No chats yet</p>
            <button
              onClick={() => navigate('/')}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Create your first chat →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {rooms.map(room => {
              const preview = previews[room.chatId]
              return (
                <div
                  key={room.chatId}
                  onClick={() => navigate(`/chat/${room.chatId}`)}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-900
                             cursor-pointer transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-indigo-900 flex items-center
                                  justify-center text-indigo-300 font-semibold shrink-0">
                    {room.chatId.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-white font-medium text-sm truncate">
                        Room {room.chatId.slice(0, 8)}…
                      </p>
                      <span className="text-gray-500 text-xs shrink-0 ml-2">
                        {formatTime(preview?.timestamp || room.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">
                      {preview
                        ? `${preview.sender_name}: ${preview.content}`
                        : 'No messages yet'}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, room.chatId)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600
                               hover:text-red-400 transition-all p-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}