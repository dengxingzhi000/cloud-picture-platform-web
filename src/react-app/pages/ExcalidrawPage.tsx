import React, { useCallback, useEffect, useMemo, useRef, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExcalidrawYjs } from '@/react-app/hooks/useExcalidrawYjs'
import { getToken } from '@/utils/auth'
import { getScene, createScene, getSceneByPictureId } from '@/api/scenes'
import "@excalidraw/excalidraw/index.css"

const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then(module => ({ default: module.Excalidraw }))
)

export default function ExcalidrawPage() {
  const { sceneId, pictureId } = useParams<{ sceneId?: string; pictureId?: string }>()
  const navigate = useNavigate()
  const token = getToken()
  const [currentSceneId, setCurrentSceneId] = React.useState<string | null>(sceneId || null)
  const [sceneName, setSceneName] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const excalidrawAPIRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const isResolvingRef = useRef(false)

  // Resolve scene ID - only run once
  useEffect(() => {
    // Guard against multiple executions
    if (isResolvingRef.current) return
    isResolvingRef.current = true

    const resolveScene = async () => {
      try {
        if (sceneId) {
          // Existing scene - fetch metadata
          const scene = await getScene(sceneId)
          setCurrentSceneId(scene.id)
          setSceneName(scene.sceneName)
        } else if (pictureId) {
          try {
            const scene = await getSceneByPictureId(pictureId)
            setCurrentSceneId(scene.id)
            setSceneName(scene.sceneName)
          } catch (err: any) {
            if (err?.response?.status === 404) {
              const scene = await createScene({ pictureId, sceneName: 'Image Annotation' })
              setCurrentSceneId(scene.id)
              setSceneName('Image Annotation')
              navigate(`/excalidraw/${scene.id}`, { replace: true })
            } else {
              throw err
            }
          }
        } else {
          // No sceneId - create new whiteboard
          const scene = await createScene({ sceneName: 'Untitled Whiteboard' })
          setCurrentSceneId(scene.id)
          setSceneName('Untitled Whiteboard')
          navigate(`/excalidraw/${scene.id}`, { replace: true })
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load scene')
      } finally {
        setLoading(false)
        isResolvingRef.current = false
      }
    }
    resolveScene()
  }, []) // Empty dependency array - only run once on mount

  // Yjs integration
  const roomUrl = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws`
  }, [])

  const { connected, synced, initialElements, initialFiles, updateElements, updateFile } = useExcalidrawYjs({
    sceneId: currentSceneId || '',
    roomUrl,
    token: token || '',
    enabled: !!currentSceneId && !!token,
  })

  // Store initial data in ref to avoid re-renders
  const initialDataRef = useRef<{ elements: any[]; files: Record<string, any> }>({ elements: [], files: {} })
  useEffect(() => {
    if (!isInitializedRef.current && (initialElements.length > 0 || initialFiles.size > 0)) {
      // Convert Map to plain object for Excalidraw
      const filesObj: Record<string, any> = {}
      initialFiles.forEach((value, key) => {
        filesObj[key] = value
      })
      initialDataRef.current = { elements: initialElements, files: filesObj }
      isInitializedRef.current = true
    }
  }, [initialElements, initialFiles])

  // Handle Excalidraw changes - use throttled update
  const handleChange = useCallback((excalidrawElements: any, appState: any, excalidrawFiles: any) => {
    // Only update if we have an API reference and the doc is ready
    if (!excalidrawAPIRef.current) return
    
    updateElements(excalidrawElements)
    if (excalidrawFiles) {
      Object.entries(excalidrawFiles).forEach(([key, value]) => {
        updateFile(key, value)
      })
    }
  }, [updateElements, updateFile])

  // Handle Excalidraw API ready
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
        <span>Loading scene...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'red', background: '#f5f5f5' }}>
        <span>Error: {error}</span>
      </div>
    )
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex', 
      flexDirection: 'column',
      background: '#f5f5f5'
    }}>
      {/* Status bar */}
      <div style={{ 
        padding: '6px 16px', 
        background: '#fff', 
        borderBottom: '1px solid #e0e0e0', 
        display: 'flex', 
        gap: '16px', 
        fontSize: '13px',
        zIndex: 100,
        alignItems: 'center'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '14px',
            color: '#666',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          ← Back
        </button>
        <span style={{ fontWeight: 500, color: '#333' }}>
          {sceneName || 'Untitled'}
        </span>
        <span style={{ color: connected ? '#22c55e' : '#ef4444' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
        <span style={{ color: synced ? '#22c55e' : '#9ca3af' }}>
          {synced ? '● Synced' : '○ Syncing...'}
        </span>
      </div>

      {/* Excalidraw canvas - fills remaining space */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Suspense fallback={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            background: '#f5f5f5'
          }}>
            <span>Loading Excalidraw...</span>
          </div>
        }>
          <Excalidraw
            initialData={initialDataRef.current}
            onChange={handleChange}
            excalidrawAPI={handleExcalidrawAPI}
            isCollaborating={connected}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: true,
                clearCanvas: true,
                export: { saveFileToDisk: true },
                loadScene: true,
                saveToActiveFile: true,
                toggleTheme: true,
              },
              tools: {
                image: true,
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  )
}
