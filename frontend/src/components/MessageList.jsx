import { useEffect, useRef } from 'react'

export default function MessageList({ messages, currentSessionId }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No messages yet. Say hello!
        </p>
      )}
      {messages.map((msg, i) => {
        if (msg.type === 'join' || msg.type === 'leave') {
          return (
            <div key={i} className="text-center text-xs text-gray-500 py-1">
              {msg.content}
            </div>
          )
        }

        const isMe = msg.session_id === currentSessionId
        const isOwner = msg.sender_type === 'owner'

        return (
          <div key={msg.message_id || i}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg`}>
              {!isMe && (
                <p className="text-xs text-gray-400 mb-1 ml-1">
                  {msg.sender_name}
                  {isOwner && (
                    <span className="ml-1 text-indigo-400 font-medium">(owner)</span>
                  )}
                </p>
              )}
              <div className={`px-4 py-2 rounded-2xl text-sm break-words
                ${isMe
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                }`}>
                {msg.content}
              </div>
              <p className={`text-xs text-gray-600 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit'
                }) : ''}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}