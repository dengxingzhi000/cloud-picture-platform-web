import * as Y from 'yjs'

export const ELEMENTS_KEY = 'excalidraw-elements'
export const FILES_KEY = 'excalidraw-files'

export function readExcalidrawElements(doc: Y.Doc): Map<string, any> {
  const yMap = doc.getMap(ELEMENTS_KEY)
  const elements = new Map<string, any>()
  yMap.forEach((value, key) => {
    elements.set(key, value)
  })
  return elements
}

export function writeExcalidrawElements(doc: Y.Doc, elements: any[]): void {
  const yMap = doc.getMap(ELEMENTS_KEY)
  doc.transact(() => {
    const existingIds = new Set(elements.map(el => el.id))
    // Remove deleted elements
    yMap.forEach((_, key) => {
      if (!existingIds.has(key)) {
        yMap.delete(key)
      }
    })
    // Upsert elements
    elements.forEach(el => {
      yMap.set(el.id, el)
    })
  })
}

export function readExcalidrawFiles(doc: Y.Doc): Map<string, any> {
  const yMap = doc.getMap(FILES_KEY)
  const files = new Map<string, any>()
  yMap.forEach((value, key) => {
    files.set(key, value)
  })
  return files
}

export function writeExcalidrawFile(doc: Y.Doc, fileId: string, fileData: any): void {
  const yMap = doc.getMap(FILES_KEY)
  yMap.set(fileId, fileData)
}

export function isExcalidrawDocEmpty(doc: Y.Doc): boolean {
  const yMap = doc.getMap(ELEMENTS_KEY)
  return yMap.size === 0
}
