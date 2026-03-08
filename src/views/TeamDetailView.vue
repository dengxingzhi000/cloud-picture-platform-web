<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuth } from '@/composables/useAuth'
import {
  cancelInvite,
  exportMemberEvents,
  getTeamDetail,
  updateTeam,
  inviteMember,
  listInviteHistory,
  listMemberEvents,
  listTeamInvites,
  listTeamMembers,
  removeMember,
  updateMemberRole,
} from '@/api/teams'
import type { TeamDetail, TeamMember, TeamMemberEvent } from '@/api/teams'
import { formatDate } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const teamId = computed(() => route.params.id as string)

const team = ref<TeamDetail | null>(null)
const members = ref<TeamMember[]>([])
const invites = ref<TeamMember[]>([])
const inviteHistory = ref<{ items: TeamMember[]; total: number; page: number; size: number } | null>(null)
const events = ref<{ items: TeamMemberEvent[]; total: number; page: number; size: number } | null>(null)

const activeTab = ref<'members' | 'invites' | 'history' | 'events'>('members')

const loading = reactive({
  team: false,
  members: false,
  invites: false,
  history: false,
  events: false,
  action: false,
  exporting: false,
})

const inviteDialog = ref(false)
const editDialog = ref(false)
const exportDialog = ref(false)
const exportTarget = ref<'events' | 'cancellations'>('events')
const inviteForm = reactive({
  username: '',
  role: 'MEMBER' as 'MEMBER' | 'ADMIN',
})

const teamForm = reactive({
  name: '',
  description: '',
})

const historyQuery = reactive({
  page: 0,
  size: 10,
  status: '',
  role: '',
  sortBy: 'invitedAt',
  sortDir: 'desc',
})

const eventsQuery = reactive({
  page: 0,
  size: 10,
  type: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
})

const memberSearch = ref('')
const memberRoleFilter = ref('')
const inviteSearch = ref('')
const inviteRoleFilter = ref('')

const selectedMembers = ref<TeamMember[]>([])
const selectedInvites = ref<TeamMember[]>([])

const exportConfig = reactive({
  limit: 500,
  includeHeaders: true,
  templateName: '',
  fields: [
    'id',
    'teamId',
    'type',
    'role',
    'userId',
    'username',
    'displayName',
    'actorId',
    'actorUsername',
    'actorDisplayName',
    'detail',
    'createdAt',
  ] as string[],
})

const exportFields = [
  { label: 'Event ID', value: 'id' },
  { label: 'Team ID', value: 'teamId' },
  { label: 'Type', value: 'type' },
  { label: 'Role', value: 'role' },
  { label: 'User ID', value: 'userId' },
  { label: 'Username', value: 'username' },
  { label: 'Display name', value: 'displayName' },
  { label: 'Actor ID', value: 'actorId' },
  { label: 'Actor username', value: 'actorUsername' },
  { label: 'Actor display name', value: 'actorDisplayName' },
  { label: 'Detail', value: 'detail' },
  { label: 'Created at', value: 'createdAt' },
]

const exportTemplates = ref<{ name: string; fields: string[]; includeHeaders: boolean }[]>(
  JSON.parse(localStorage.getItem('cpp:export-templates') || '[]')
)

const saveExportTemplate = () => {
  const name = exportConfig.templateName.trim()
  if (!name) {
    ElMessage.warning('Template name is required')
    return
  }
  const existingIndex = exportTemplates.value.findIndex((template) => template.name === name)
  const template = {
    name,
    fields: [...exportConfig.fields],
    includeHeaders: exportConfig.includeHeaders,
  }
  if (existingIndex >= 0) {
    exportTemplates.value[existingIndex] = template
  } else {
    exportTemplates.value.push(template)
  }
  localStorage.setItem('cpp:export-templates', JSON.stringify(exportTemplates.value))
  ElMessage.success('Template saved')
}

const applyExportTemplate = (name?: string) => {
  if (!name) return
  const template = exportTemplates.value.find((item) => item.name === name)
  if (!template) return
  exportConfig.fields = [...template.fields]
  exportConfig.includeHeaders = template.includeHeaders
}

const moveField = (field: string, direction: 'up' | 'down') => {
  const index = exportConfig.fields.indexOf(field)
  if (index === -1) return
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (nextIndex < 0 || nextIndex >= exportConfig.fields.length) return
  const fields = [...exportConfig.fields]
  const [item] = fields.splice(index, 1)
  fields.splice(nextIndex, 0, item)
  exportConfig.fields = fields
}
const historyRange = ref<[Date, Date] | null>(null)
const eventsRange = ref<[Date, Date] | null>(null)

const roleDrafts = reactive<Record<string, 'MEMBER' | 'ADMIN' | 'OWNER'>>({})

const currentUserId = computed(() => user.value?.userId)
const selfMembership = computed(() => members.value.find((member) => member.userId === currentUserId.value))
const selfRole = computed(() => selfMembership.value?.role || 'MEMBER')
const isOwner = computed(() => selfRole.value === 'OWNER')
const isAdmin = computed(() => selfRole.value === 'OWNER' || selfRole.value === 'ADMIN')

const filteredMembers = computed(() => {
  const keyword = memberSearch.value.trim().toLowerCase()
  const role = memberRoleFilter.value
  return members.value.filter((member) => {
    const name = `${member.displayName ?? ''} ${member.username ?? ''}`.toLowerCase()
    const matchesKeyword = !keyword || name.includes(keyword)
    const matchesRole = !role || member.role === role
    return matchesKeyword && matchesRole
  })
})

const filteredInvites = computed(() => {
  const keyword = inviteSearch.value.trim().toLowerCase()
  const role = inviteRoleFilter.value
  return invites.value.filter((member) => {
    const name = `${member.displayName ?? ''} ${member.username ?? ''}`.toLowerCase()
    const matchesKeyword = !keyword || name.includes(keyword)
    const matchesRole = !role || member.role === role
    return matchesKeyword && matchesRole
  })
})

const syncRoleDrafts = () => {
  Object.keys(roleDrafts).forEach((key) => delete roleDrafts[key])
  members.value.forEach((member) => {
    roleDrafts[member.userId] = member.role
  })
}

const loadTeam = async () => {
  loading.team = true
  try {
    team.value = await getTeamDetail(teamId.value)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load team')
  } finally {
    loading.team = false
  }
}

const openEditDialog = () => {
  if (!team.value) return
  teamForm.name = team.value.name
  teamForm.description = team.value.description || ''
  editDialog.value = true
}

const handleUpdateTeam = async () => {
  if (!teamForm.name.trim()) {
    ElMessage.warning('Team name is required')
    return
  }
  loading.action = true
  try {
    team.value = await updateTeam(teamId.value, {
      name: teamForm.name.trim(),
      description: teamForm.description?.trim() || null,
    })
    ElMessage.success('Team updated')
    editDialog.value = false
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to update team')
  } finally {
    loading.action = false
  }
}

const loadMembers = async () => {
  loading.members = true
  try {
    members.value = await listTeamMembers(teamId.value)
    syncRoleDrafts()
    selectedMembers.value = []
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load members')
  } finally {
    loading.members = false
  }
}

const loadInvites = async () => {
  loading.invites = true
  try {
    invites.value = await listTeamInvites(teamId.value)
    selectedInvites.value = []
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load invites')
  } finally {
    loading.invites = false
  }
}

const loadHistory = async () => {
  loading.history = true
  try {
    const [start, end] = historyRange.value ?? []
    inviteHistory.value = await listInviteHistory(teamId.value, {
      page: historyQuery.page,
      size: historyQuery.size,
      status: historyQuery.status || undefined,
      role: historyQuery.role || undefined,
      invitedAfter: start ? start.toISOString() : undefined,
      invitedBefore: end ? end.toISOString() : undefined,
      sortBy: historyQuery.sortBy,
      sortDir: historyQuery.sortDir,
    })
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load history')
  } finally {
    loading.history = false
  }
}

const loadEvents = async () => {
  loading.events = true
  try {
    const [start, end] = eventsRange.value ?? []
    events.value = await listMemberEvents(teamId.value, {
      page: eventsQuery.page,
      size: eventsQuery.size,
      type: eventsQuery.type || undefined,
      createdAfter: start ? start.toISOString() : undefined,
      createdBefore: end ? end.toISOString() : undefined,
      sortBy: eventsQuery.sortBy,
      sortDir: eventsQuery.sortDir,
    })
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load events')
  } finally {
    loading.events = false
  }
}

const loadCore = async () => {
  await Promise.all([loadTeam(), loadMembers()])
}

const handleInvite = async () => {
  if (!inviteForm.username.trim()) {
    ElMessage.warning('Username or email is required')
    return
  }
  loading.action = true
  try {
    await inviteMember(teamId.value, {
      username: inviteForm.username.trim(),
      role: inviteForm.role,
    })
    ElMessage.success('Invite sent')
    inviteForm.username = ''
    inviteForm.role = 'MEMBER'
    inviteDialog.value = false
    await loadInvites()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to invite member')
  } finally {
    loading.action = false
  }
}

const handleCancelInvite = async (member: TeamMember) => {
  loading.action = true
  try {
    await cancelInvite(teamId.value, member.userId)
    ElMessage.success('Invite canceled')
    await loadInvites()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to cancel invite')
  } finally {
    loading.action = false
  }
}

const handleRoleChange = async (member: TeamMember) => {
  const nextRole = roleDrafts[member.userId]
  if (nextRole === member.role) return
  loading.action = true
  try {
    await updateMemberRole(teamId.value, member.userId, nextRole as 'ADMIN' | 'MEMBER')
    ElMessage.success('Role updated')
    await loadMembers()
  } catch (error: any) {
    roleDrafts[member.userId] = member.role
    ElMessage.error(error?.response?.data?.message || 'Failed to update role')
  } finally {
    loading.action = false
  }
}

const handleRemoveMember = async (member: TeamMember) => {
  try {
    await ElMessageBox.confirm(
      `Remove ${member.displayName || member.username || 'member'} from the team?`,
      'Confirm removal',
      { type: 'warning' }
    )
  } catch {
    return
  }
  loading.action = true
  try {
    await removeMember(teamId.value, member.userId)
    if (member.userId === currentUserId.value) {
      ElMessage.success('You left the team')
      router.push('/teams')
    } else {
      ElMessage.success('Member removed')
      await loadMembers()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to remove member')
  } finally {
    loading.action = false
  }
}

const handleRemoveSelected = async () => {
  const removable = selectedMembers.value.filter((member) => canRemove(member))
  if (removable.length === 0) {
    ElMessage.warning('No removable members selected')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Remove ${removable.length} selected member(s)?`,
      'Confirm removal',
      { type: 'warning' }
    )
  } catch {
    return
  }
  loading.action = true
  try {
    const results = await Promise.allSettled(
      removable.map((member) => removeMember(teamId.value, member.userId))
    )
    const failures = results
      .map((result, index) => ({ result, member: removable[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, member }) => ({
        label: member.displayName || member.username || member.userId,
        reason: parseError((result as PromiseRejectedResult).reason),
      }))

    if (failures.length) {
      await showFailureDetails('Removal failures', failures)
    }
    const successItems = removable.filter(
      (member) => !failures.some((f) => f.label === (member.displayName || member.username || member.userId))
    )
    if (successItems.length > 0) {
      ElMessage.success('Members removed')
      await promptUndoInvites(successItems)
    }
    await loadMembers()
  } finally {
    loading.action = false
  }
}

const handleCancelSelected = async () => {
  if (selectedInvites.value.length === 0) {
    ElMessage.warning('No invites selected')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Cancel ${selectedInvites.value.length} invite(s)?`,
      'Confirm cancellation',
      { type: 'warning' }
    )
  } catch {
    return
  }
  loading.action = true
  try {
    const results = await Promise.allSettled(
      selectedInvites.value.map((member) => cancelInvite(teamId.value, member.userId))
    )
    const failures = results
      .map((result, index) => ({ result, member: selectedInvites.value[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, member }) => ({
        label: member.displayName || member.username || member.userId,
        reason: parseError((result as PromiseRejectedResult).reason),
      }))
    if (failures.length) {
      await showFailureDetails('Cancellation failures', failures)
    }
    const successCount = selectedInvites.value.length - failures.length
    if (successCount > 0) {
      ElMessage.success('Invites canceled')
      await promptUndoInvites(
        selectedInvites.value.filter(
          (member) => !failures.some((f) => f.label === (member.displayName || member.username || member.userId))
        ),
        true
      )
    }
    await loadInvites()
  } finally {
    loading.action = false
  }
}

const parseError = (error: any) =>
  error?.response?.data?.message || error?.message || 'Request failed'

const showFailureDetails = async (title: string, failures: { label: string; reason: string }[]) => {
  if (!failures.length) return
  const rows = failures
    .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.reason)}</td></tr>`)
    .join('')
  const html = `
    <div class="failure-table">
      <table>
        <thead>
          <tr><th>Target</th><th>Reason</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="failure-hint">You can export this report for auditing.</p>
    </div>
  `
  await ElMessageBox.confirm(html, title, {
    type: 'warning',
    confirmButtonText: 'Export report',
    cancelButtonText: 'Close',
    dangerouslyUseHTMLString: true,
  }).then(() => exportFailureReport(title, failures)).catch(() => {})
}

const exportFailureReport = (title: string, failures: { label: string; reason: string }[]) => {
  const headers = ['Target', 'Reason']
  const lines = [headers.map(escapeCsv).join(',')]
  failures.forEach((item) => {
    lines.push([item.label, item.reason].map(escapeCsv).join(','))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const filename = `${title.toLowerCase().replace(/\s+/g, '_')}_report.csv`
  downloadBlob(blob, filename)
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const promptUndoInvites = async (items: TeamMember[], isCancel = false) => {
  const candidates = items.filter((member) => member.username)
  if (!candidates.length) return
  const label = isCancel ? 'Send invites again?' : 'Re-invite removed members?'
  try {
    await ElMessageBox.confirm(
      `${label} (${candidates.length})`,
      'Undo action',
      { type: 'info', confirmButtonText: 'Re-invite', cancelButtonText: 'Close' }
    )
  } catch {
    return
  }
  loading.action = true
  try {
    const results = await Promise.allSettled(
      candidates.map((member) =>
        inviteMember(teamId.value, {
          username: member.username as string,
          role: member.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        })
      )
    )
    const failures = results
      .map((result, index) => ({ result, member: candidates[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, member }) => ({
        label: member.displayName || member.username || member.userId,
        reason: parseError((result as PromiseRejectedResult).reason),
      }))
    if (failures.length) {
      showFailureDetails('Re-invite failures', failures)
    } else {
      ElMessage.success('Invites sent')
    }
    await loadInvites()
  } finally {
    loading.action = false
  }
}

const canEditRole = (member: TeamMember) => isOwner.value && member.role !== 'OWNER'
const canRemove = (member: TeamMember) => {
  if (member.role === 'OWNER') return false
  if (member.userId === currentUserId.value) return true
  if (isOwner.value) return true
  return isAdmin.value && member.role === 'MEMBER'
}

const handleMemberSelection = (rows: TeamMember[]) => {
  selectedMembers.value = rows
}

const handleInviteSelection = (rows: TeamMember[]) => {
  selectedInvites.value = rows
}

const setQuickRange = (target: 'history' | 'events', days: number) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  if (target === 'history') {
    historyRange.value = [start, end]
  } else {
    eventsRange.value = [start, end]
  }
}

const setMonthRange = (target: 'history' | 'events') => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  if (target === 'history') {
    historyRange.value = [start, end]
  } else {
    eventsRange.value = [start, end]
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const handleExportEvents = async (type?: TeamMemberEvent['type'], allowRetry = true) => {
  if (loading.exporting) return
  loading.exporting = true
  const notice = ElMessage({
    message: 'Preparing export...',
    type: 'info',
    duration: 0,
  })
  try {
    const [start, end] = eventsRange.value ?? []
    const blob = await exportMemberEvents(teamId.value, {
      type,
      createdAfter: start ? start.toISOString() : undefined,
      createdBefore: end ? end.toISOString() : undefined,
      sortBy: eventsQuery.sortBy,
      sortDir: eventsQuery.sortDir,
      limit: 2000,
    })
    const suffix = type ? type.toLowerCase() : 'events'
    downloadBlob(blob, `team_${teamId.value}_${suffix}.csv`)
    ElMessage.success('Export ready')
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to export'
    if (allowRetry) {
      try {
        await ElMessageBox.confirm(`${message}. Retry?`, 'Export failed', { type: 'warning' })
        await handleExportEvents(type, false)
      } catch {
        ElMessage.error(message)
      }
    } else {
      ElMessage.error(message)
    }
  } finally {
    notice.close()
    loading.exporting = false
  }
}

const handleExportCancellations = async (allowRetry = true) => {
  if (loading.exporting) return
  loading.exporting = true
  const notice = ElMessage({
    message: 'Preparing cancellation export...',
    type: 'info',
    duration: 0,
  })
  try {
    const [start, end] = historyRange.value ?? []
    const blob = await exportMemberEvents(teamId.value, {
      type: 'INVITE_CANCELED',
      createdAfter: start ? start.toISOString() : undefined,
      createdBefore: end ? end.toISOString() : undefined,
      sortBy: eventsQuery.sortBy,
      sortDir: eventsQuery.sortDir,
      limit: 2000,
    })
    downloadBlob(blob, `team_${teamId.value}_invite_canceled.csv`)
    ElMessage.success('Export ready')
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Failed to export'
    if (allowRetry) {
      try {
        await ElMessageBox.confirm(`${message}. Retry?`, 'Export failed', { type: 'warning' })
        await handleExportCancellations(false)
      } catch {
        ElMessage.error(message)
      }
    } else {
      ElMessage.error(message)
    }
  } finally {
    notice.close()
    loading.exporting = false
  }
}

const openExportDialog = (target: 'events' | 'cancellations') => {
  exportTarget.value = target
  exportDialog.value = true
}

const resetExportFields = () => {
  exportConfig.fields = exportFields.map((field) => field.value)
}

const buildCsv = (items: TeamMemberEvent[]) => {
  const fieldMap: Record<string, (item: TeamMemberEvent) => string | number | null | undefined> = {
    id: (item) => item.id,
    teamId: (item) => item.teamId,
    type: (item) => item.type,
    role: (item) => item.role,
    userId: (item) => item.userId,
    username: (item) => item.username,
    displayName: (item) => item.displayName,
    actorId: (item) => item.actorId,
    actorUsername: (item) => item.actorUsername,
    actorDisplayName: (item) => item.actorDisplayName,
    detail: (item) => item.detail,
    createdAt: (item) => item.createdAt,
  }
  const headers = exportConfig.fields.map((field) => exportFields.find((f) => f.value === field)?.label || field)
  const lines = []
  if (exportConfig.includeHeaders) {
    lines.push(headers.map(escapeCsv).join(','))
  }
  items.forEach((item) => {
    const row = exportConfig.fields.map((field) => escapeCsv(fieldMap[field]?.(item)))
    lines.push(row.join(','))
  })
  return lines.join('\n')
}

const escapeCsv = (value: any) => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const exportWithConfig = async () => {
  if (!exportConfig.fields.length) {
    ElMessage.warning('Select at least one field')
    return
  }
  loading.exporting = true
  const notice = ElMessage({
    message: 'Building export...',
    type: 'info',
    duration: 0,
  })
  try {
    const type = exportTarget.value === 'cancellations' ? 'INVITE_CANCELED' : (eventsQuery.type || undefined)
    const [rangeStart, rangeEnd] =
      exportTarget.value === 'cancellations' ? historyRange.value ?? [] : eventsRange.value ?? []
    const limit = Math.min(Math.max(50, exportConfig.limit), 1000)
    const items: TeamMemberEvent[] = []
    let page = 0
    while (items.length < limit) {
      const size = Math.min(100, limit - items.length)
      const result = await listMemberEvents(teamId.value, {
        page,
        size,
        type: type as TeamMemberEvent['type'],
        createdAfter: rangeStart ? rangeStart.toISOString() : undefined,
        createdBefore: rangeEnd ? rangeEnd.toISOString() : undefined,
        sortBy: eventsQuery.sortBy,
        sortDir: eventsQuery.sortDir,
      })
      items.push(...result.items)
      if (result.items.length < size) break
      page += 1
    }
    const csv = buildCsv(items)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const suffix = exportTarget.value === 'cancellations' ? 'invite_canceled' : 'events'
    downloadBlob(blob, `team_${teamId.value}_${suffix}_custom.csv`)
    exportDialog.value = false
    ElMessage.success('Export ready')
  } catch (error: any) {
    ElMessage.error(parseError(error))
  } finally {
    notice.close()
    loading.exporting = false
  }
}

watch(
  () => teamId.value,
  async () => {
    await loadCore()
    if (activeTab.value === 'invites' && isAdmin.value) await loadInvites()
    if (activeTab.value === 'history' && isAdmin.value) await loadHistory()
    if (activeTab.value === 'events' && isAdmin.value) await loadEvents()
  }
)

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'invites' && isAdmin.value) await loadInvites()
    if (tab === 'history' && isAdmin.value) await loadHistory()
    if (tab === 'events' && isAdmin.value) await loadEvents()
  }
)

onMounted(loadCore)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ team?.name || 'Team Space' }}</h1>
        <p class="page-subtitle">
          {{ team?.description || 'Coordinate assets, permissions, and membership from one hub.' }}
        </p>
      </div>
      <div class="header-actions">
        <el-button plain @click="router.push('/teams')">Back to teams</el-button>
        <el-button v-if="isAdmin" plain @click="openEditDialog">Edit team</el-button>
        <el-button v-if="isAdmin" type="primary" @click="inviteDialog = true">Invite member</el-button>
      </div>
    </div>

    <div class="panel hero" v-if="team">
      <div>
        <h2 class="panel-title">Team overview</h2>
        <p class="panel-subtitle">Space ID: {{ team.spaceId || 'Unassigned' }}</p>
      </div>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-label">Members</span>
          <span class="stat-value">{{ members.length }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Your role</span>
          <span class="stat-value">{{ selfRole }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Created</span>
          <span class="stat-value">{{ formatDate(team.createdAt) }}</span>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Members" name="members">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Active members</h2>
              <p class="panel-subtitle">Manage roles and membership.</p>
            </div>
            <div class="panel-actions">
              <el-input v-model="memberSearch" placeholder="Search members" clearable />
              <el-select v-model="memberRoleFilter" placeholder="Role" clearable>
                <el-option label="Owner" value="OWNER" />
                <el-option label="Admin" value="ADMIN" />
                <el-option label="Member" value="MEMBER" />
              </el-select>
              <el-button
                v-if="isAdmin"
                type="danger"
                plain
                :loading="loading.action"
                @click="handleRemoveSelected"
              >
                Remove selected
              </el-button>
            </div>
          </div>
          <el-table
            v-loading="loading.members"
            :data="filteredMembers"
            stripe
            class="table"
            row-key="userId"
            @selection-change="handleMemberSelection"
          >
            <el-table-column v-if="isAdmin" type="selection" width="48" />
            <el-table-column label="Member">
              <template #default="{ row }">
                <div class="member-cell">
                  <div class="member-name">
                    {{ row.displayName || row.username }}
                  </div>
                  <div class="member-meta">@{{ row.username }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Role" width="180">
              <template #default="{ row }">
                <el-select
                  v-if="canEditRole(row)"
                  v-model="roleDrafts[row.userId]"
                  size="small"
                  @change="handleRoleChange(row)"
                >
                  <el-option label="Admin" value="ADMIN" />
                  <el-option label="Member" value="MEMBER" />
                </el-select>
                <span v-else class="tag">{{ row.role }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Joined">
              <template #default="{ row }">{{ formatDate(row.joinedAt) }}</template>
            </el-table-column>
            <el-table-column label="Invited by">
              <template #default="{ row }">
                {{ row.inviterDisplayName || row.inviterUsername || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="140">
              <template #default="{ row }">
                <el-button
                  v-if="canRemove(row)"
                  type="danger"
                  link
                  :loading="loading.action"
                  @click="handleRemoveMember(row)"
                >
                  {{ row.userId === currentUserId ? 'Leave' : 'Remove' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane v-if="isAdmin" label="Invites" name="invites">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Pending invites</h2>
              <p class="panel-subtitle">Cancel or resend invitations.</p>
            </div>
            <div class="panel-actions">
              <el-input v-model="inviteSearch" placeholder="Search invites" clearable />
              <el-select v-model="inviteRoleFilter" placeholder="Role" clearable>
                <el-option label="Admin" value="ADMIN" />
                <el-option label="Member" value="MEMBER" />
              </el-select>
              <el-button
                type="danger"
                plain
                :loading="loading.action"
                @click="handleCancelSelected"
              >
                Cancel selected
              </el-button>
            </div>
          </div>
          <el-table
            v-loading="loading.invites"
            :data="filteredInvites"
            stripe
            class="table"
            row-key="userId"
            @selection-change="handleInviteSelection"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column label="Invitee">
              <template #default="{ row }">
                <div class="member-cell">
                  <div class="member-name">{{ row.displayName || row.username }}</div>
                  <div class="member-meta">@{{ row.username }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Role" width="140">
              <template #default="{ row }"><span class="tag">{{ row.role }}</span></template>
            </el-table-column>
            <el-table-column label="Invited at" width="200">
              <template #default="{ row }">{{ formatDate(row.invitedAt) }}</template>
            </el-table-column>
            <el-table-column label="Actions" width="140">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  link
                  :loading="loading.action"
                  @click="handleCancelInvite(row)"
                >
                  Cancel
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane v-if="isAdmin" label="Invite history" name="history">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Invite history</h2>
              <p class="panel-subtitle">Track invites and join status.</p>
            </div>
            <div class="panel-actions">
              <el-button type="primary" plain @click="openExportDialog('cancellations')">
                Export cancellations
              </el-button>
            </div>
          </div>
          <div class="filters">
            <el-select v-model="historyQuery.status" placeholder="Status" clearable>
              <el-option label="Invited" value="INVITED" />
              <el-option label="Active" value="ACTIVE" />
            </el-select>
            <el-select v-model="historyQuery.role" placeholder="Role" clearable>
              <el-option label="Owner" value="OWNER" />
              <el-option label="Admin" value="ADMIN" />
              <el-option label="Member" value="MEMBER" />
            </el-select>
            <el-date-picker
              v-model="historyRange"
              type="daterange"
              unlink-panels
              start-placeholder="Invited after"
              end-placeholder="Invited before"
            />
            <div class="quick-filters">
              <el-button text @click="setQuickRange('history', 7)">Last 7d</el-button>
              <el-button text @click="setQuickRange('history', 30)">Last 30d</el-button>
              <el-button text @click="setMonthRange('history')">This month</el-button>
            </div>
            <el-button type="primary" plain @click="loadHistory">Apply</el-button>
          </div>
          <el-table
            v-loading="loading.history"
            :data="inviteHistory?.items || []"
            stripe
            class="table"
          >
            <el-table-column label="Member">
              <template #default="{ row }">
                <div class="member-cell">
                  <div class="member-name">{{ row.displayName || row.username }}</div>
                  <div class="member-meta">@{{ row.username }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Role" width="120">
              <template #default="{ row }"><span class="tag">{{ row.role }}</span></template>
            </el-table-column>
            <el-table-column label="Status" width="120">
              <template #default="{ row }">{{ row.status }}</template>
            </el-table-column>
            <el-table-column label="Invited at" width="200">
              <template #default="{ row }">{{ formatDate(row.invitedAt) }}</template>
            </el-table-column>
            <el-table-column label="Joined at" width="200">
              <template #default="{ row }">{{ formatDate(row.joinedAt) }}</template>
            </el-table-column>
            <el-table-column label="Invited by" width="160">
              <template #default="{ row }">{{ row.inviterDisplayName || row.inviterUsername || '—' }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              v-if="inviteHistory"
              background
              layout="prev, pager, next"
              :total="inviteHistory.total"
              :page-size="inviteHistory.size"
              :current-page="inviteHistory.page + 1"
              @current-change="(page) => { historyQuery.page = page - 1; loadHistory() }"
            />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane v-if="isAdmin" label="Activity" name="events">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Member activity</h2>
              <p class="panel-subtitle">Event stream for invites and membership actions.</p>
            </div>
            <div class="panel-actions">
              <el-button type="primary" plain @click="openExportDialog('events')">Export events</el-button>
            </div>
          </div>
          <div class="filters">
            <el-select v-model="eventsQuery.type" placeholder="Event type" clearable>
              <el-option label="Invited" value="INVITED" />
              <el-option label="Joined" value="JOINED" />
              <el-option label="Left" value="LEFT" />
              <el-option label="Removed" value="MEMBER_REMOVED" />
              <el-option label="Invite rejected" value="INVITE_REJECTED" />
              <el-option label="Invite canceled" value="INVITE_CANCELED" />
              <el-option label="Team updated" value="TEAM_UPDATED" />
            </el-select>
            <el-date-picker
              v-model="eventsRange"
              type="daterange"
              unlink-panels
              start-placeholder="Created after"
              end-placeholder="Created before"
            />
            <div class="quick-filters">
              <el-button text @click="setQuickRange('events', 7)">Last 7d</el-button>
              <el-button text @click="setQuickRange('events', 30)">Last 30d</el-button>
              <el-button text @click="setMonthRange('events')">This month</el-button>
            </div>
            <el-button type="primary" plain @click="loadEvents">Apply</el-button>
          </div>
          <el-table
            v-loading="loading.events"
            :data="events?.items || []"
            stripe
            class="table"
          >
            <el-table-column label="Event" width="180">
              <template #default="{ row }">{{ row.type }}</template>
            </el-table-column>
            <el-table-column label="User">
              <template #default="{ row }">
                {{ row.displayName || row.username || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="Actor">
              <template #default="{ row }">
                {{ row.actorDisplayName || row.actorUsername || 'System' }}
              </template>
            </el-table-column>
            <el-table-column label="Role" width="120">
              <template #default="{ row }">{{ row.role || '—' }}</template>
            </el-table-column>
            <el-table-column label="Detail">
              <template #default="{ row }">
                <span class="detail-text">{{ row.detail || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Time" width="200">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              v-if="events"
              background
              layout="prev, pager, next"
              :total="events.total"
              :page-size="events.size"
              :current-page="events.page + 1"
              @current-change="(page) => { eventsQuery.page = page - 1; loadEvents() }"
            />
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>

  <el-dialog v-model="inviteDialog" title="Invite a member" width="480px">
    <el-form label-position="top">
      <el-form-item label="Username or email">
        <el-input v-model="inviteForm.username" placeholder="jane.doe" />
      </el-form-item>
      <el-form-item label="Role">
        <el-select v-model="inviteForm.role">
          <el-option label="Member" value="MEMBER" />
          <el-option label="Admin" value="ADMIN" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="inviteDialog = false">Cancel</el-button>
      <el-button type="primary" :loading="loading.action" @click="handleInvite">Send invite</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="editDialog" title="Edit team" width="520px">
    <el-form label-position="top">
      <el-form-item label="Team name">
        <el-input v-model="teamForm.name" placeholder="Design Ops" />
      </el-form-item>
      <el-form-item label="Description">
        <el-input v-model="teamForm.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editDialog = false">Cancel</el-button>
      <el-button type="primary" :loading="loading.action" @click="handleUpdateTeam">
        Save
      </el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="exportDialog" title="Configure export" width="560px">
    <div class="export-config">
      <div class="config-row">
        <div class="config-label">Target</div>
        <div class="config-value">
          <span class="tag">
            {{ exportTarget === 'events' ? 'Member events' : 'Invite cancellations' }}
          </span>
        </div>
      </div>
      <div class="config-row">
        <div class="config-label">Templates</div>
        <div class="config-value">
          <el-select placeholder="Select template" clearable @change="applyExportTemplate">
            <el-option
              v-for="template in exportTemplates"
              :key="template.name"
              :label="template.name"
              :value="template.name"
            />
          </el-select>
        </div>
      </div>
      <div class="config-row">
        <div class="config-label">Row limit</div>
        <el-input-number v-model="exportConfig.limit" :min="50" :max="1000" />
      </div>
      <div class="config-row">
        <div class="config-label">Include headers</div>
        <el-switch v-model="exportConfig.includeHeaders" />
      </div>
      <div class="config-row">
        <div class="config-label">Fields</div>
        <div class="config-fields">
          <el-checkbox-group v-model="exportConfig.fields" class="field-list">
            <div v-for="field in exportFields" :key="field.value" class="field-row">
              <el-checkbox :label="field.value">{{ field.label }}</el-checkbox>
              <div class="field-actions">
                <el-button
                  text
                  size="small"
                  :disabled="exportConfig.fields.indexOf(field.value) <= 0"
                  @click="moveField(field.value, 'up')"
                >
                  ↑
                </el-button>
                <el-button
                  text
                  size="small"
                  :disabled="
                    exportConfig.fields.indexOf(field.value) === -1 ||
                    exportConfig.fields.indexOf(field.value) === exportConfig.fields.length - 1
                  "
                  @click="moveField(field.value, 'down')"
                >
                  ↓
                </el-button>
              </div>
            </div>
          </el-checkbox-group>
        </div>
        <el-button text @click="resetExportFields">Reset fields</el-button>
      </div>
      <div class="config-row">
        <div class="config-label">Save as</div>
        <div class="config-value">
          <el-input v-model="exportConfig.templateName" placeholder="Template name" />
        </div>
        <el-button text @click="saveExportTemplate">Save template</el-button>
      </div>
    </div>
    <template #footer>
      <el-button @click="exportDialog = false">Cancel</el-button>
      <el-button type="primary" :loading="loading.exporting" @click="exportWithConfig">
        Export
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.header-actions {
  display: flex;
  gap: 12px;
}

.hero {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.panel-title {
  margin: 0;
  font-size: 1.2rem;
}

.panel-subtitle {
  margin: 6px 0 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.hero-stats {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

.stat {
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--stroke-soft);
  min-width: 140px;
}

.stat-label {
  display: block;
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
}

.table {
  width: 100%;
}

.member-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-name {
  font-weight: 600;
}

.member-meta {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.detail-text {
  display: inline-block;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  align-items: center;
}

.panel-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-filters {
  display: flex;
  gap: 6px;
}

.export-config {
  display: grid;
  gap: 14px;
}

.config-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: center;
}

.config-label {
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.config-fields {
  display: grid;
  gap: 10px;
}

.field-list {
  display: grid;
  gap: 8px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.field-actions {
  display: flex;
  gap: 6px;
}

.failure-table table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}

.failure-table th,
.failure-table td {
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 6px 8px;
  font-size: 0.85rem;
  text-align: left;
}

.failure-table th {
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink-strong);
}

.failure-hint {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
