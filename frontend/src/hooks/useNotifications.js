import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, socketURL } from '../api/client'
import * as api from '../api/endpoints'

/** Notification inbox plus the live WebSocket feed from the backend. */
export function useNotifications(enabled = true) {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const retryRef = useRef(null)

  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const [list, count] = await Promise.all([api.listNotifications({ size: 25 }), api.unreadCount()])
      setItems(list.data.items || [])
      setUnread(count.data.unread || 0)
    } catch {
      /* the bell simply stays quiet if the inbox cannot be read */
    }
  }, [enabled])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!enabled) return undefined
    let closed = false

    function connect() {
      const token = getToken()
      if (!token) return
      try {
        const socket = new WebSocket(socketURL(token))
        socketRef.current = socket
        socket.onopen = () => setConnected(true)
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'notification') load()
          } catch {
            /* ignore malformed frames */
          }
        }
        socket.onclose = () => {
          setConnected(false)
          if (!closed) retryRef.current = setTimeout(connect, 8000)
        }
        socket.onerror = () => socket.close()
      } catch {
        setConnected(false)
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retryRef.current)
      socketRef.current?.close()
    }
  }, [enabled, load])

  const markRead = useCallback(
    async (id) => {
      await api.markRead(id)
      load()
    },
    [load],
  )

  const markAllRead = useCallback(async () => {
    await api.markAllRead()
    load()
  }, [load])

  return { items, unread, connected, reload: load, markRead, markAllRead }
}
