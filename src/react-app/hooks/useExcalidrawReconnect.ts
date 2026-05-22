import { useEffect, useRef, useCallback, useState } from 'react'

interface UseExcalidrawReconnectOptions {
  connected: boolean
  synced: boolean
  onReconnect: () => void
}

export function useExcalidrawReconnect({ connected, synced, onReconnect }: UseExcalidrawReconnectOptions) {
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 10
  const baseDelay = 1000
  const maxDelay = 30000

  useEffect(() => {
    if (connected) {
      setReconnectAttempts(0)
    }
  }, [connected])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) return

    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxDelay)
    const jitter = delay * 0.1 * Math.random()
    const totalDelay = delay + jitter

    const timer = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1)
      onReconnect()
    }, totalDelay)

    return () => clearTimeout(timer)
  }, [reconnectAttempts, onReconnect])

  useEffect(() => {
    if (!connected && reconnectAttempts < maxReconnectAttempts) {
      return scheduleReconnect()
    }
  }, [connected, reconnectAttempts, scheduleReconnect])

  return {
    reconnectAttempts,
    maxReconnectAttempts,
    isReconnecting: !connected && reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts,
  }
}
