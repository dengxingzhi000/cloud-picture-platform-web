import * as Y from 'yjs'
import type { PictureDocument, PictureDocumentElement } from '@/api/pictures'

export type WorkspaceElement =
  | {
      id: string
      type: 'rect'
      x: number
      y: number
      width: number
      height: number
    }
  | {
      id: string
      type: 'text'
      x: number
      y: number
      width: number
      height: number
      text: string
    }

const ELEMENTS_KEY = 'elements'

function getElementsArray(doc: Y.Doc) {
  return doc.getArray<Y.Map<unknown>>(ELEMENTS_KEY)
}

function toElementMap(element: WorkspaceElement) {
  const map = new Y.Map<unknown>()
  map.set('id', element.id)
  map.set('type', element.type)
  map.set('x', element.x)
  map.set('y', element.y)
  map.set('width', element.width)
  map.set('height', element.height)
  if (element.type === 'text') {
    map.set('text', element.text)
  }
  return map
}

export function normalizeElement(element: PictureDocumentElement): WorkspaceElement {
  if (element.type === 'text') {
    return {
      id: element.id,
      type: 'text',
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      text: element.text ?? '',
    }
  }
  return {
    id: element.id,
    type: 'rect',
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  }
}

export function snapshotToWorkspaceElements(document: PictureDocument): WorkspaceElement[] {
  return (document.elements ?? []).map(normalizeElement)
}

export function readWorkspaceElements(doc: Y.Doc): WorkspaceElement[] {
  return getElementsArray(doc)
    .toArray()
    .map((entry) => {
      const type = entry.get('type')
      const base = {
        id: String(entry.get('id') ?? ''),
        x: Number(entry.get('x') ?? 0),
        y: Number(entry.get('y') ?? 0),
        width: Number(entry.get('width') ?? 0),
        height: Number(entry.get('height') ?? 0),
      }
      if (type === 'text') {
        return {
          ...base,
          type: 'text' as const,
          text: String(entry.get('text') ?? ''),
        }
      }
      return {
        ...base,
        type: 'rect' as const,
      }
    })
}

export function isWorkspaceDocEmpty(doc: Y.Doc) {
  return getElementsArray(doc).length === 0
}

export function replaceWorkspaceFromSnapshot(doc: Y.Doc, snapshot: PictureDocument, origin = 'snapshot-seed') {
  const nextElements = snapshotToWorkspaceElements(snapshot)
  replaceWorkspaceElements(doc, nextElements, origin)
}

export function replaceWorkspaceElements(doc: Y.Doc, elements: WorkspaceElement[], origin = 'snapshot-seed') {
  const array = getElementsArray(doc)
  doc.transact(() => {
    if (array.length > 0) {
      array.delete(0, array.length)
    }
    if (elements.length > 0) {
      array.push(elements.map(toElementMap))
    }
  }, origin)
}

export function upsertWorkspaceElement(doc: Y.Doc, element: WorkspaceElement, origin = 'local-ui') {
  const array = getElementsArray(doc)
  const entries = array.toArray()
  const index = entries.findIndex((entry) => String(entry.get('id')) === element.id)
  doc.transact(() => {
    if (index === -1) {
      array.push([toElementMap(element)])
      return
    }
    const current = entries[index]
    current.set('type', element.type)
    current.set('x', element.x)
    current.set('y', element.y)
    current.set('width', element.width)
    current.set('height', element.height)
    if (element.type === 'text') {
      current.set('text', element.text)
    } else {
      current.delete('text')
    }
  }, origin)
}

export function removeWorkspaceElement(doc: Y.Doc, elementId: string, origin = 'local-ui') {
  const array = getElementsArray(doc)
  const entries = array.toArray()
  const index = entries.findIndex((entry) => String(entry.get('id')) === elementId)
  if (index === -1) {
    return
  }
  doc.transact(() => {
    array.delete(index, 1)
  }, origin)
}
