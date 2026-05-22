import { useEffect, useRef, useCallback } from 'react'
import { updateSnapshot } from '@/api/scenes'

interface UseExcalidrawAutosaveOptions {
  sceneId: string | null
  elements: any[]
  files: Map<string, any>
  enabled?: boolean
  intervalMs?: number
}

export function useExcalidrawAutosave({
  sceneId,
  elements,
  files,
  enabled = true,
  intervalMs = 5000,
}: UseExcalidrawAutosaveOptions) {
  const lastSavedRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const saveSnapshot = useCallback(async () => {
    if (!sceneId || !enabled) return

    const snapshotData = JSON.stringify({
      elements,
      files: Object.fromEntries(files),
    })

    // Only save if changed
    if (snapshotData === lastSavedRef.current) return

    try {
      await updateSnapshot(sceneId, snapshotData)
      lastSavedRef.current = snapshotData
      console.debug('[ExcalidrawAutosave] Snapshot saved')
    } catch (err) {
      console.warn('[ExcalidrawAutosave] Failed to save snapshot:', err)
    }
  }, [sceneId, elements, files, enabled])

  useEffect(() => {
    if (!enabled || !sceneId) return

    saveTimerRef.current = setInterval(saveSnapshot, intervalMs)

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
      }
    }
  }, [enabled, sceneId, intervalMs, saveSnapshot])

  return {
    saveNow: saveSnapshot,
  }
}
