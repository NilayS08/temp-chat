import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getChatInfo, getMessages, joinChat } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import TypingIndicator from '../components/TypingIndicator'
import { updateLastSeen } from '../utils/roomStorage'

export default function ChatRoom() {
  const { chatId } = useParams()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [senderName, setSenderName] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState(new Map()) // name -> timeout
  const [shareLink, setShareLink] = useState('')
  const [nickname, setNickname] = useState('')
  const [nicknameSet, setNicknameSet] = useState(false)
  const [copied, setCopied] = useState(false)
  const initSent = useRef(false)

  const ownerToken = localStorage.getItem(`owner_token_${chatId}`)

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'init_ack':
        setSessionId(data.session_id)
        setSenderName(data.sender_name)
        setIsOwner(data.is_owner)
        setUserCount(data.user_count)
        break

      case 'message':
        setMessages(prev => [...prev, data])
        break

      case 'join':
        setMessages(prev => [...prev, { ...data, type: 'join' }])
        setUserCount(c => c + 1)
        break

      case 'leave':
        setMessages(prev => [...prev, { ...data, type: 'leave' }])
        setUserCount(c => Math.max(0, c - 1))
        break

      case 'typing':
        setTypingUsers(prev => {
          const next = new Map(prev)
          if (data.is_typing) {
            next.set(data.sender_name, Date.now())
          } else {
            next.delete(data.sender_name)
          }
          return next
        })
        break
    }
  }, [])

  const { send } = useWebSocket(nicknameSet ? chatId : null, {
    onOpen: () => {
      setConnected(true)
      if (!initSent.current) {
        initSent.current = true
        send({
          type: 'init',
          owner_token: ownerToken || undefined,
          nickname: nickname || 'Guest'
        })
      }
    },
    onClose: () => setConnected(false),
    onMessage: handleMessage
  })

  // Load chat info
  useEffect(() => {
    getChatInfo(chatId).catch(() => navigate('/'))
    setShareLink(`${window.location.origin}/chat/${chatId}`)
    updateLastSeen(chatId) // ← add this line
  }, [chatId])

  // Owners load full history
  useEffect(() => {
    if (ownerToken && nicknameSet) {
      getMessages(chatId, ownerToken).then(res => {
        const historical = res.data.map(m => ({
          ...m,
          type: 'message',
          session_id: '__history__' // marks as not "mine" in UI
        }))
        setMessages(historical)
      }).catch(() => {})
    }
  }, [chatId, ownerToken, nicknameSet])

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers(prev => {
        const next = new Map()
        prev.forEach((ts, name) => {
          if (now - ts < 3000) next.set(name, ts)
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = (content) => {
    send({ type: 'message', content })
  }

  const handleTyping = (isTyping) => {
    send({ type: 'typing', is_typing: isTyping })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Nickname picker shown before connecting
  if (!nicknameSet) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-2">
            {ownerToken ? 'Welcome back, owner' : 'Join Chat'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {ownerToken ? 'Enter the room as owner.' : 'Pick a nickname to join the chat.'}
          </p>
          {!ownerToken && (
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 30))}
              onKeyDown={e => e.key === 'Enter' && setNicknameSet(true)}
              placeholder="Your nickname"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 mb-4
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              autoFocus
            />
          )}
          <button
            onClick={() => setNicknameSet(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold
                       py-2.5 rounded-xl transition-colors"
          >
            {ownerToken ? 'Enter Room' : 'Join'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
            <span className="text-white font-medium text-sm truncate">
              {chatId.slice(0, 8)}…
            </span>
            {isOwner && (
              <span className="bg-indigo-900 text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                Owner
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-0.5">{userCount} online</p>
        </div>

        <button
          onClick={copyLink}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white
                     text-sm px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentSessionId={sessionId} />

      {/* Typing */}
      <TypingIndicator
        typingUsers={new Set([...typingUsers.keys()].filter(n => n !== senderName))}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={!connected}
      />
    </div>
  )
}