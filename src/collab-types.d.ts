export type UserPresence = {
  userId: string
  username: string
  joinedAt: string
}

export type LockInfo = {
  lockedByUserId: string
  lockedByUsername: string
  lockedAt: string
  expiresAt: string
}

export type PresenceSnapshot = {
  pictureId: string
  users: UserPresence[]
  lock?: LockInfo | null
}

export type CollabEventType =
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'PRESENCE_UPDATE'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED'
  | 'LOCK_DENIED'
  | 'CURSOR_UPDATE'
  | 'SELECTION_UPDATE'
  | 'REVIEW_DECISION'
  | 'PICTURE_UPLOADED'
  | 'ANNOTATION_ADD'
  | 'ANNOTATION_REMOVE'
  | 'ELEMENT_ADD'
  | 'ELEMENT_UPDATE'
  | 'ELEMENT_REMOVE'
  | 'VERSION_CONFLICT'

export type CollabElementPayload = {
  id: string
  type: 'rect' | 'text'
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string | null
}

export type CursorPayload = {
  x: number
  y: number
}

export type SelectionPayload = {
  activeElementId?: string | null
  elementIds?: string[]
}

export type CollabMessage = {
  type: CollabEventType
  schemaVersion?: string
  pictureId?: string
  userId?: string
  username?: string
  timestamp?: string
  version?: number
  payload?: unknown
}

export type PictureDocumentSnapshotPayload = {
  pictureId: string
  schemaVersion: string
  version: number
  lastUpdatedByUserId?: string | null
  updatedAt?: string | null
  elements: CollabElementPayload[]
}

export type NotificationKind =
  | 'PICTURE_APPROVED'
  | 'PICTURE_REJECTED'
  | 'REVIEW_PENDING'
  | 'TEAM_INVITE'
  | 'UPLOAD_COMPLETE'
  | 'TEAM_PICTURE_UPLOADED'
  | 'TEAM_MEMBER_JOINED'

export type NotificationMessage = {
  title?: string
  body?: string
  kind?: NotificationKind
  targetId?: string
  timestamp?: string
}
