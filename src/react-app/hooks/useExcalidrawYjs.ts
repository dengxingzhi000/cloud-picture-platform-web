import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { readExcalidrawElements, writeExcalidrawElements, readExcalidrawFiles, writeExcalidrawFile, isExcalidrawDocEmpty } from '@/react-app/collab/excalidrawDocument'
import { getSnapshot } from '@/api/scenes'

interface UseExcalidrawYjsOptions {
  sceneId: string
  roomUrl: string
  token: string
  enabled?: boolean
}

interface UseExcalidrawYjsReturn {
  yDoc: Y.Doc | null
  provider: HocuspocusProvider | null
  connected: boolean
  synced: boolean
  initialElements: any[]
  initialFiles: Map<string, any>
  updateElements: (elements: any[]) => void
  updateFile: (fileId: string, fileData: any) => void
}

export function useExcalidrawYjs({ sceneId, roomUrl, token, enabled = true }: UseExcalidrawYjsOptions): UseExcalidrawYjsReturn {
  const [connected, setConnected] = useState(false)
  const [synced, setSynced] = useState(false)
  const [initialElements, setInitialElements] = useState<any[]>([])
  const [initialFiles, setInitialFiles] = useState<Map<string, any>>(new Map())
  const yDocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<HocuspocusProvider | null>(null)
  const indexeddbRef = useRef<IndexeddbPersistence | null>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    if (!enabled || !sceneId || !roomUrl) return

    const doc = new Y.Doc()
    yDocRef.current = doc

    // IndexedDB persistence for offline support
    const indexeddb = new IndexeddbPersistence(`excalidraw-${sceneId}`, doc)
    indexeddbRef.current = indexeddb

    // Hocuspocus provider
    const provider = new HocuspocusProvider({
      url: roomUrl,
      name: `scene:${sceneId}`,
      token,
      document: doc,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onSynced: () => setSynced(true),
    })
    providerRef.current = provider

    // Seed from server snapshot if doc is empty
    const seedFromSnapshot = async () => {
      if (seededRef.current || !isExcalidrawDocEmpty(doc)) {
        // Read existing elements from Yjs
        setInitialElements(Array.from(readExcalidrawElements(doc).values()))
        setInitialFiles(readExcalidrawFiles(doc))
        seededRef.current = true
        return
      }

      try {
        const snapshot = await getSnapshot(sceneId)
        if (snapshot.snapshotData) {
          const data = JSON.parse(snapshot.snapshotData)
          if (data.elements) {
            writeExcalidrawElements(doc, data.elements)
          }
          if (data.files) {
            Object.entries(data.files).forEach(([key, value]) => {
              writeExcalidrawFile(doc, key, value)
            })
          }
        }
        setInitialElements(Array.from(readExcalidrawElements(doc).values()))
        setInitialFiles(readExcalidrawFiles(doc))
        seededRef.current = true
      } catch (err) {
        console.warn('Failed to seed from snapshot:', err)
        seededRef.current = true
      }
    }

    // Wait for sync before seeding
    if (provider.isSynced) {
      seedFromSnapshot()
    } else {
      provider.on('synced', seedFromSnapshot)
    }

    return () => {
      provider.off('synced', seedFromSnapshot)
      provider.destroy()
      indexeddb.destroy()
      doc.destroy()
      yDocRef.current = null
      providerRef.current = null
      indexeddbRef.current = null
      seededRef.current = false
      setConnected(false)
      setSynced(false)
    }
  }, [sceneId, roomUrl, token, enabled])

  const updateElements = useCallback((newElements: any[]) => {
    if (yDocRef.current) {
      writeExcalidrawElements(yDocRef.current, newElements)
    }
  }, [])

  const updateFile = useCallback((fileId: string, fileData: any) => {
    if (yDocRef.current) {
      writeExcalidrawFile(yDocRef.current, fileId, fileData)
    }
  }, [])

  return {
    yDoc: yDocRef.current,
    provider: providerRef.current,
    connected,
    synced,
    initialElements,
    initialFiles,
    updateElements,
    updateFile,
  }
}
