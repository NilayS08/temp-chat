import { useState, useRef } from 'react'

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState('')
  const typingTimeout = useRef(null)

  const handleChange = (e) => {
    setValue(e.target.value)
    onTyping?.(true)
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => onTyping?.(false), 1500)
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    onTyping?.(false)
    clearTimeout(typingTimeout.current)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 border-t border-gray-800 flex gap-2">
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Type a message… (Enter to send)"
        className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500
                   rounded-xl px-4 py-2.5 resize-none focus:outline-none
                   focus:ring-2 focus:ring-indigo-500 text-sm"
        style={{ maxHeight: '120px', overflowY: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                   text-white px-4 py-2.5 rounded-xl font-medium text-sm
                   transition-colors shrink-0"
      >
        Send
      </button>
    </div>
  )
}