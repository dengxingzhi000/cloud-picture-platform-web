import { useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import type { IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken, getUser } from '@/utils/auth'

type ToolId = 'select' | 'rect' | 'text'

export type RectElement = {
  id: string
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type TextElement = {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  height: number
  text: string
}

export type CanvasElement = RectElement | TextElement

type ElementOpType = 'ELEMENT_ADD' | 'ELEMENT_UPDATE' | 'ELEMENT_REMOVE'

type DragState =
  | { mode: 'none' }
  | { mode: 'draw-rect'; startX: number; startY: number }
  | { mode: 'drag'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { mode: 'resize'; id: string; startX: number; startY: number; origWidth: number; origHeight: number }

type Metrics = { offsetX: number; offsetY: number; width: number; height: number }

function uuid() {
  const maybeRandomUuid = typeof crypto !== 'undefined' ? (crypto as any)?.randomUUID : undefined
  if (typeof maybeRandomUuid === 'function') return maybeRandomUuid()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function parseIncomingBody(frameBody: string) {
  try {
    const parsed = JSON.parse(frameBody)
    if (typeof parsed === 'string') return JSON.parse(parsed)
    return parsed
  } catch {
    return null
  }
}

function elementToUpdateShape(el: CanvasElement) {
  if (el.type === 'rect') return { id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height }
  return { id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, text: el.text }
}

export default function CollabCanvas({
  pictureId,
  pictureUrl,
  initialElements,
}: {
  pictureId: string
  pictureUrl: string
  initialElements?: CanvasElement[]
}) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null)
  const [imageMetrics, setImageMetrics] = useState<Metrics | null>(null)
  const [elements, setElements] = useState<CanvasElement[]>(() => initialElements ?? [])
  const elementsRef = useRef(elements)
  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTool, setCurrentTool] = useState<ToolId>('select')
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const dragStateRef = useRef<DragState>({ mode: 'none' })
  const lastBroadcastAtRef = useRef<number>(0)

  const selectedIdRef = useRef(selectedId)
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const tools = useMemo(
    () => [
      { id: 'select' as const, label: 'Select' },
      { id: 'rect' as const, label: 'Rectangle' },
      { id: 'text' as const, label: 'Text' },
    ],
    [],
  )

  const clientIdRef = useRef(uuid())

  const user = useMemo(() => getUser(), [])
  const userId = user?.userId ?? ''
  const username = user?.username ?? ''

  useEffect(() => {
    if (initialElements) setElements(initialElements)
  }, [initialElements])

  const HANDLE_SIZE = 10
  const TEXT_PADDING_X = 8
  const TEXT_BASELINE_Y = 22
  const TEXT_HEIGHT = 26
  const TEXT_WIDTH_PER_CHAR = 9

  function uuidEl() {
    return uuid()
  }

  function bringToTop(id: string) {
    const arr = elementsRef.current
    const idx = arr.findIndex((e) => e.id === id)
    if (idx < 0 || idx === arr.length - 1) return
    const next = arr.slice()
    const [el] = next.splice(idx, 1)
    next.push(el)
    setElements(next)
  }

  function getPointFromClient(event: { clientX: number; clientY: number }) {
    const host = canvasHostRef.current
    const m = imageMetrics
    if (!host || !m) return null
    const rect = host.getBoundingClientRect()
    const x = event.clientX - rect.left - m.offsetX
    const y = event.clientY - rect.top - m.offsetY
    if (x < 0 || y < 0 || x > m.width || y > m.height) return null
    return { x, y }
  }

  function hitTest(x: number, y: number): CanvasElement | null {
    const arr = elementsRef.current
    for (let i = arr.length - 1; i >= 0; i--) {
      const el = arr[i]
      if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) return el
    }
    return null
  }

  function maybeBroadcastUpdate() {
    const now = Date.now()
    if (now - lastBroadcastAtRef.current < 60) return false
    lastBroadcastAtRef.current = now
    return true
  }

  const stompClientRef = useRef<Client | null>(null)
  const subRef = useRef<any>(null)

  function broadcastOp(op: ElementOpType, payload: any) {
    const stomp = stompClientRef.current
    if (!stomp || !stomp.connected) return
    const msg = {
      type: op,
      pictureId,
      clientId: clientIdRef.current,
      userId,
      username,
      timestamp: new Date().toISOString(),
      payload,
    }
    stomp.publish({
      destination: `/app/pictures/${pictureId}/annotation`,
      body: JSON.stringify(msg),
    })
  }

  function applyRemoteMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return
    if (msg.clientId === clientIdRef.current) return
    if (msg.pictureId && msg.pictureId !== pictureId) return
    const opType = msg.type as ElementOpType | undefined
    if (!opType || !['ELEMENT_ADD', 'ELEMENT_UPDATE', 'ELEMENT_REMOVE'].includes(opType)) return

    const payload = msg.payload
    if (!payload) return

    if (opType === 'ELEMENT_ADD') {
      const el = payload.element as CanvasElement | undefined
      if (!el || !el.id || !el.type) return
      if (elementsRef.current.some((e) => e.id === el.id)) return
      setElements((prev) => [...prev, el])
      return
    }

    if (opType === 'ELEMENT_UPDATE') {
      const el = payload.element as Partial<CanvasElement> & { id: string } | undefined
      if (!el || !el.id) return
      const target = elementsRef.current.find((e) => e.id === el.id)
      if (!target) return
      if (typeof (el as any).x === 'number') target.x = (el as any).x
      if (typeof (el as any).y === 'number') target.y = (el as any).y
      if (target.type === 'rect') {
        if (typeof (el as any).width === 'number') target.width = (el as any).width
        if (typeof (el as any).height === 'number') target.height = (el as any).height
      }
      if (target.type === 'text') {
        if (typeof (el as any).width === 'number') target.width = (el as any).width
        if (typeof (el as any).height === 'number') target.height = (el as any).height
        if (typeof (el as any).text === 'string') (target as TextElement).text = (el as any).text
      }
      setElements((prev) => prev.map((e) => (e.id === target.id ? { ...target } : e)))
      return
    }

    if (opType === 'ELEMENT_REMOVE') {
      const elementId = payload.elementId as string | undefined
      if (!elementId) return
      setElements((prev) => prev.filter((e) => e.id !== elementId))
      if (selectedIdRef.current === elementId) setSelectedId(null)
    }
  }

  useEffect(() => {
    function onWindowMouseMove(ev: MouseEvent) {
      const state = dragStateRef.current
      if (state.mode === 'none') return
      const point = getPointFromClient(ev)
      if (!point) return

      if (state.mode === 'draw-rect') {
        const x = Math.min(state.startX, point.x)
        const y = Math.min(state.startY, point.y)
        setDraftRect({
          x,
          y,
          width: Math.max(0, Math.abs(point.x - state.startX)),
          height: Math.max(0, Math.abs(point.y - state.startY)),
        })
        return
      }

      if (state.mode === 'drag') {
        setElements((prev) => {
          const next = prev.map((e) => {
            if (e.id !== state.id) return e
            return { ...e, x: state.origX + (point.x - state.startX), y: state.origY + (point.y - state.startY) }
          })
          return next
        })
        if (maybeBroadcastUpdate()) {
          const target = elementsRef.current.find((e) => e.id === state.id)
          if (target) {
            const updated = elementToUpdateShape({
              ...target,
              x: state.origX + (point.x - state.startX),
              y: state.origY + (point.y - state.startY),
            })
            broadcastOp('ELEMENT_UPDATE', { opId: uuidEl(), element: updated })
          }
        }
        return
      }

      if (state.mode === 'resize') {
        setElements((prev) => {
          const next = prev.map((e) => {
            if (e.id !== state.id) return e
            if (e.type !== 'rect') return e
            return {
              ...e,
              width: Math.max(10, state.origWidth + (point.x - state.startX)),
              height: Math.max(10, state.origHeight + (point.y - state.startY)),
            }
          })
          return next
        })
        if (maybeBroadcastUpdate()) {
          const target = elementsRef.current.find((e) => e.id === state.id)
          if (target && target.type === 'rect') {
            const updated = elementToUpdateShape({
              ...target,
              width: Math.max(10, state.origWidth + (point.x - state.startX)),
              height: Math.max(10, state.origHeight + (point.y - state.startY)),
            } as RectElement)
            broadcastOp('ELEMENT_UPDATE', { opId: uuidEl(), element: updated })
          }
        }
      }
    }

    function onWindowMouseUp() {
      const state = dragStateRef.current
      if (state.mode === 'none') return

      if (state.mode === 'draw-rect' && draftRect) {
        const minSize = 10
        if (draftRect.width >= minSize && draftRect.height >= minSize) {
          const el = {
            id: uuidEl(),
            type: 'rect' as const,
            x: draftRect.x,
            y: draftRect.y,
            width: draftRect.width,
            height: draftRect.height,
          }
          setElements((prev) => [...prev, el])
          setSelectedId(el.id)
          bringToTop(el.id)
          broadcastOp('ELEMENT_ADD', { opId: uuidEl(), element: el })
        }
      }

      dragStateRef.current = { mode: 'none' }
      setDraftRect(null)
    }

    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRect])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return
      if (currentTool !== 'select') return
      if (!selectedIdRef.current) return

      const id = selectedIdRef.current
      setElements((prev) => prev.filter((x) => x.id !== id))
      setSelectedId(null)
      broadcastOp('ELEMENT_REMOVE', { opId: uuidEl(), elementId: id })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool])

  useEffect(() => {
    const token = getToken() || ''
    const apiBase = ((import.meta as any)?.env?.VITE_API_BASE as string | undefined) ?? ''
    const sock = new SockJS(apiBase + '/ws')
    const client = new Client({ webSocketFactory: () => sock })
    client.connectHeaders = { Authorization: 'Bearer ' + token }
    stompClientRef.current = client

    client.onConnect = () => {
      subRef.current = client.subscribe(`/topic/pictures/${pictureId}/collab`, (frame: IMessage) => {
        const parsed = parseIncomingBody(frame.body)
        if (!parsed) return
        applyRemoteMessage(parsed)
      })
    }

    client.activate()

    return () => {
      try {
        subRef.current?.unsubscribe?.()
      } catch {
        // ignore
      }
      try {
        client.deactivate()
      } catch {
        // ignore
      }
      stompClientRef.current = null
      subRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pictureId])

  function createTextAt(point: { x: number; y: number }, text: string) {
    const el: TextElement = {
      id: uuidEl(),
      type: 'text',
      x: point.x,
      y: point.y,
      width: Math.max(10, text.length * TEXT_WIDTH_PER_CHAR + 2 * TEXT_PADDING_X),
      height: TEXT_HEIGHT,
      text,
    }
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
    bringToTop(el.id)
    broadcastOp('ELEMENT_ADD', { opId: uuidEl(), element: el })
  }

  function onCanvasMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    const point = getPointFromClient(e)
    if (!point) {
      if (currentTool === 'select') setSelectedId(null)
      return
    }

    if (currentTool === 'rect') {
      setSelectedId(null)
      dragStateRef.current = { mode: 'draw-rect', startX: point.x, startY: point.y }
      setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 })
      return
    }

    if (currentTool === 'text') {
      const text = window.prompt('Text content')?.trim()
      if (!text) return
      createTextAt(point, text)
      return
    }

    const target = hitTest(point.x, point.y)
    if (!target) {
      setSelectedId(null)
      return
    }

    if (target.type === 'rect' && target.id === selectedIdRef.current) {
      const rx = target.x + target.width - HANDLE_SIZE
      const ry = target.y + target.height - HANDLE_SIZE
      if (point.x >= rx && point.x <= rx + HANDLE_SIZE && point.y >= ry && point.y <= ry + HANDLE_SIZE) {
        bringToTop(target.id)
        dragStateRef.current = {
          mode: 'resize',
          id: target.id,
          startX: point.x,
          startY: point.y,
          origWidth: target.width,
          origHeight: target.height,
        }
        return
      }
    }

    bringToTop(target.id)
    setSelectedId(target.id)
    dragStateRef.current = {
      mode: 'drag',
      id: target.id,
      startX: point.x,
      startY: point.y,
      origX: target.x,
      origY: target.y,
    }
  }

  return (
    <div className="collab-root">
      <div className="toolbar">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`tool-btn${currentTool === tool.id ? ' active' : ''}`}
            onClick={() => setCurrentTool(tool.id)}
          >
            {tool.label}
          </button>
        ))}
        <button
          type="button"
          className="tool-btn danger"
          disabled={!selectedId}
          onClick={() => {
            if (!selectedIdRef.current) return
            const id = selectedIdRef.current
            setElements((prev) => prev.filter((x) => x.id !== id))
            setSelectedId(null)
            broadcastOp('ELEMENT_REMOVE', { opId: uuidEl(), elementId: id })
          }}
        >
          Delete
        </button>
      </div>

      <div ref={canvasHostRef} className="canvas-host">
        <img className="background-image" src={pictureUrl} alt={`Picture ${pictureId}`} onLoad={(ev) => {
          const img = ev.currentTarget
          const host = canvasHostRef.current
          if (!host) return
          const rect = host.getBoundingClientRect()
          const hostW = rect.width
          const hostH = rect.height
          const naturalW = img.naturalWidth
          const naturalH = img.naturalHeight
          if (!naturalW || !naturalH || hostW <= 0 || hostH <= 0) return

          const scale = Math.min(hostW / naturalW, hostH / naturalH)
          const dispW = naturalW * scale
          const dispH = naturalH * scale
          const offsetX = (hostW - dispW) / 2
          const offsetY = (hostH - dispH) / 2
          setImageMetrics({ offsetX, offsetY, width: dispW, height: dispH })
        }} />

        {imageMetrics ? (
          <svg
            className="overlay"
            width={imageMetrics.width}
            height={imageMetrics.height}
            style={{ left: imageMetrics.offsetX, top: imageMetrics.offsetY, position: 'absolute' }}
            onMouseDown={onCanvasMouseDown}
          >
            {elements.map((el) => {
              if (el.type === 'rect') {
                return (
                  <g key={el.id}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      className={`shape-rect${el.id === selectedId ? ' selected' : ''}`}
                    />
                    {el.id === selectedId ? (
                      <rect
                        className="resize-handle"
                        x={el.x + el.width - HANDLE_SIZE / 2}
                        y={el.y + el.height - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                      />
                    ) : null}
                  </g>
                )
              }
              return (
                <g key={el.id}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    className={`text-bg${el.id === selectedId ? ' selected' : ''}`}
                  />
                  <text className="shape-text" x={el.x + TEXT_PADDING_X} y={el.y + TEXT_BASELINE_Y}>
                    {el.text}
                  </text>
                </g>
              )
            })}

            {draftRect ? (
              <rect
                className="shape-rect draft"
                x={draftRect.x}
                y={draftRect.y}
                width={draftRect.width}
                height={draftRect.height}
              />
            ) : null}
          </svg>
        ) : (
          <div className="loading-overlay">Loading image...</div>
        )}
      </div>
    </div>
  )
}

