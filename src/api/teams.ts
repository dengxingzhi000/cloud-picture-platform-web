import api, { unwrap } from '@/api/client'
import type { ApiResponse, PageResponse } from '@/api/client'

export type TeamSummary = {
  id: string
  name: string
  ownerId: string
  spaceId?: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  memberCount: number
  createdAt: string
}

export type TeamDetail = {
  id: string
  name: string
  description?: string | null
  ownerId: string
  spaceId?: string | null
  createdAt: string
}

export type TeamMember = {
  userId: string
  username?: string | null
  displayName?: string | null
  invitedBy?: string | null
  inviterUsername?: string | null
  inviterDisplayName?: string | null
  inviterEmail?: string | null
  inviterAvatarUrl?: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  status: 'INVITED' | 'ACTIVE'
  invitedAt?: string | null
  joinedAt?: string | null
}

export type TeamInviteSummary = {
  teamId: string
  teamName?: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  invitedAt?: string | null
  invitedBy?: string | null
  inviterUsername?: string | null
  inviterDisplayName?: string | null
  inviterEmail?: string | null
  inviterAvatarUrl?: string | null
}

export type TeamMemberEvent = {
  id: string
  teamId: string
  userId?: string | null
  username?: string | null
  displayName?: string | null
  actorId?: string | null
  actorUsername?: string | null
  actorDisplayName?: string | null
  type:
    | 'INVITED'
    | 'INVITE_REJECTED'
    | 'INVITE_CANCELED'
    | 'JOINED'
    | 'LEFT'
    | 'MEMBER_REMOVED'
    | 'TEAM_UPDATED'
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | null
  detail?: string | null
  createdAt: string
}

export async function listTeams() {
  const response = await api.get<ApiResponse<TeamSummary[]>>('/api/v1/teams')
  return unwrap(response.data)
}

export async function createTeam(payload: { name: string; description?: string }) {
  const response = await api.post<ApiResponse<TeamDetail>>('/api/v1/teams', payload)
  return unwrap(response.data)
}

export async function getTeamDetail(teamId: string) {
  const response = await api.get<ApiResponse<TeamDetail>>(`/api/teams/${teamId}`)
  return unwrap(response.data)
}

export async function updateTeam(teamId: string, payload: { name: string; description?: string | null }) {
  const response = await api.patch<ApiResponse<TeamDetail>>(`/api/teams/${teamId}`, payload)
  return unwrap(response.data)
}

export async function listTeamMembers(teamId: string) {
  const response = await api.get<ApiResponse<TeamMember[]>>(`/api/teams/${teamId}/members`)
  return unwrap(response.data)
}

export async function listTeamInvites(teamId: string) {
  const response = await api.get<ApiResponse<TeamMember[]>>(`/api/teams/${teamId}/invites`)
  return unwrap(response.data)
}

export async function listInviteHistory(
  teamId: string,
  params: {
    page?: number
    size?: number
    status?: 'INVITED' | 'ACTIVE'
    role?: 'OWNER' | 'ADMIN' | 'MEMBER'
    invitedAfter?: string
    invitedBefore?: string
    joinedAfter?: string
    joinedBefore?: string
    sortBy?: string
    sortDir?: string
  }
) {
  const response = await api.get<ApiResponse<PageResponse<TeamMember>>>(`/api/teams/${teamId}/invites/history`, {
    params,
  })
  return unwrap(response.data)
}

export async function listMyInvites() {
  const response = await api.get<ApiResponse<TeamInviteSummary[]>>('/api/v1/teams/invites')
  return unwrap(response.data)
}

export async function inviteMember(teamId: string, payload: { username: string; role?: 'ADMIN' | 'MEMBER' }) {
  const response = await api.post<ApiResponse<TeamMember>>(`/api/teams/${teamId}/invites`, payload)
  return unwrap(response.data)
}

export async function acceptInvite(teamId: string) {
  const response = await api.post<ApiResponse<TeamMember>>(`/api/teams/${teamId}/accept`)
  return unwrap(response.data)
}

export async function rejectInvite(teamId: string) {
  const response = await api.post<ApiResponse<void>>(`/api/teams/${teamId}/reject`)
  return unwrap(response.data)
}

export async function cancelInvite(teamId: string, userId: string) {
  const response = await api.delete<ApiResponse<TeamMember>>(`/api/teams/${teamId}/invites/${userId}`)
  return unwrap(response.data)
}

export async function updateMemberRole(teamId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
  const response = await api.patch<ApiResponse<TeamMember>>(`/api/teams/${teamId}/members/${userId}/role`, {
    role,
  })
  return unwrap(response.data)
}

export async function removeMember(teamId: string, userId: string) {
  const response = await api.delete<ApiResponse<void>>(`/api/teams/${teamId}/members/${userId}`)
  return unwrap(response.data)
}

export async function listMemberEvents(
  teamId: string,
  params: {
    page?: number
    size?: number
    type?: TeamMemberEvent['type']
    userId?: string
    actorId?: string
    createdAfter?: string
    createdBefore?: string
    sortBy?: string
    sortDir?: string
  }
) {
  const response = await api.get<ApiResponse<PageResponse<TeamMemberEvent>>>(`/api/teams/${teamId}/events`, {
    params,
  })
  return unwrap(response.data)
}

export async function listInviteCancelEvents(
  teamId: string,
  params: {
    page?: number
    size?: number
    userId?: string
    actorId?: string
    createdAfter?: string
    createdBefore?: string
    sortBy?: string
    sortDir?: string
  }
) {
  const response = await api.get<ApiResponse<PageResponse<TeamMemberEvent>>>(
    `/api/teams/${teamId}/invites/cancellations`,
    {
      params,
    }
  )
  return unwrap(response.data)
}

export async function exportMemberEvents(
  teamId: string,
  params: {
    type?: TeamMemberEvent['type']
    userId?: string
    actorId?: string
    createdAfter?: string
    createdBefore?: string
    sortBy?: string
    sortDir?: string
    limit?: number
  }
) {
  const response = await api.get(`/api/teams/${teamId}/events/export`, {
    params,
    responseType: 'blob',
  })
  return response.data as Blob
}
