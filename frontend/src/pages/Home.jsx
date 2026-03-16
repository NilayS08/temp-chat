import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChat } from '../api/client'
import { saveRoom, getRooms } from '../utils/roomStorage'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const existingRooms = getRooms()

  const handleCreate = async () => {
    setLoading(true)
    try {
      const res = await createChat()
      const { chat_id, owner_token } = res.data
      localStorage.setItem(`owner_token_${chat_id}`, owner_token)
      // Save to room list
      saveRoom(chat_id, owner_token)
      navigate(`/chat/${chat_id}`)
    } catch {
      alert('Failed to create chat room. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">TempChat</h1>
          <p className="text-gray-400 text-lg">
            Create a private chat room and share the link.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="space-y-4 mb-6 text-left">
            <Feature icon="🔗" text="Get a shareable link instantly" />
            <Feature icon="👁️" text="You keep the full chat history" />
            <Feature icon="💨" text="Guest messages vanish when they leave" />
            <Feature icon="⚡" text="Real-time with WebSockets" />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                       text-white font-semibold py-3 px-6 rounded-xl transition-colors text-lg"
          >
            {loading ? 'Creating room…' : 'Create Chat Room'}
          </button>

          {existingRooms.length > 0 && (
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full mt-3 bg-gray-800 hover:bg-gray-700 text-gray-300
                         font-semibold py-3 px-6 rounded-xl transition-colors text-lg"
            >
              My Chats ({existingRooms.length})
            </button>
          )}
        </div>

        <p className="text-gray-600 text-sm mt-4">No account required</p>
      </div>
    </div>
  )
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-300">
      <span className="text-xl">{icon}</span>
      <span>{text}</span>
    </div>
  )
}