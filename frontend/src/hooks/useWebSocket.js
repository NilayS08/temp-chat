import { useEffect, useRef, useCallback } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(chatId, { onMessage, onOpen, onClose } = {}) {
  const wsRef = useRef(null)
  const reconnectTimeout = useRef(null)

  const connect = useCallback(() => {
    if (!chatId) return
    const ws = new WebSocket(`${WS_URL}/ws/${chatId}`)
    wsRef.current = ws

    ws.onopen = () => onOpen?.()
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage?.(data)
      } catch {}
    }
    ws.onclose = () => {
      onClose?.()
      // Auto-reconnect after 2s
      reconnectTimeout.current = setTimeout(connect, 2000)
    }
    ws.onerror = () => ws.close()
  }, [chatId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeout.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}