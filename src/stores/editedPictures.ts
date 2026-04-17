type EditedPicture = {
  previewUrl: string
  fileName: string
  width: number
  height: number
}

const STORAGE_KEY = 'cpp:edited-pictures'

function readStore(): Record<string, EditedPicture> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, EditedPicture>
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, EditedPicture>) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getEditedPicture(pictureId: string) {
  const store = readStore()
  return store[pictureId] ?? null
}

export function setEditedPicture(pictureId: string, next: EditedPicture) {
  const store = readStore()
  store[pictureId] = next
  writeStore(store)
}

export function clearEditedPicture(pictureId: string) {
  const store = readStore()
  delete store[pictureId]
  writeStore(store)
}
