<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { acceptInvite, createTeam, listMyInvites, listTeams, rejectInvite } from '@/api/teams'
import type { TeamInviteSummary, TeamSummary } from '@/api/teams'
import { formatDate } from '@/utils/format'

const router = useRouter()

const teams = ref<TeamSummary[]>([])
const invites = ref<TeamInviteSummary[]>([])
const search = ref('')
const roleFilter = ref('')
const sortOrder = ref<'newest' | 'oldest'>('newest')
const loading = reactive({
  teams: false,
  invites: false,
  creating: false,
  action: false,
})

const createDialog = ref(false)
const form = reactive({
  name: '',
  description: '',
})

const loadTeams = async () => {
  loading.teams = true
  try {
    teams.value = await listTeams()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load teams')
  } finally {
    loading.teams = false
  }
}

const loadInvites = async () => {
  loading.invites = true
  try {
    invites.value = await listMyInvites()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load invites')
  } finally {
    loading.invites = false
  }
}

const handleCreate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('Team name is required')
    return
  }
  loading.creating = true
  try {
    const created = await createTeam({
      name: form.name.trim(),
      description: form.description?.trim() || undefined,
    })
    createDialog.value = false
    form.name = ''
    form.description = ''
    await loadTeams()
    router.push(`/teams/${created.id}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to create team')
  } finally {
    loading.creating = false
  }
}

const handleAccept = async (invite: TeamInviteSummary) => {
  loading.action = true
  try {
    await acceptInvite(invite.teamId)
    ElMessage.success('Joined team')
    await Promise.all([loadInvites(), loadTeams()])
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to accept invite')
  } finally {
    loading.action = false
  }
}

const handleReject = async (invite: TeamInviteSummary) => {
  loading.action = true
  try {
    await rejectInvite(invite.teamId)
    ElMessage.success('Invite declined')
    await loadInvites()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to reject invite')
  } finally {
    loading.action = false
  }
}

const filteredTeams = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const role = roleFilter.value
  const items = teams.value.filter((team) => {
    const matchesKeyword = !keyword || team.name.toLowerCase().includes(keyword)
    const matchesRole = !role || team.role === role
    return matchesKeyword && matchesRole
  })
  const sorted = [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return sortOrder.value === 'newest' ? bTime - aTime : aTime - bTime
  })
  return sorted
})

onMounted(async () => {
  await Promise.all([loadTeams(), loadInvites()])
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Team Spaces</h1>
        <p class="page-subtitle">Manage shared workspaces, invite collaborators, and track membership.</p>
      </div>
      <el-button type="primary" @click="createDialog = true">Create Team</el-button>
    </div>

    <div class="grid cols-2">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Your Teams</h2>
            <p class="panel-subtitle">{{ teams.length }} active spaces</p>
          </div>
          <div class="panel-actions">
            <el-input v-model="search" placeholder="Search teams" clearable />
            <el-select v-model="roleFilter" placeholder="Role" clearable>
              <el-option label="Owner" value="OWNER" />
              <el-option label="Admin" value="ADMIN" />
              <el-option label="Member" value="MEMBER" />
            </el-select>
            <el-select v-model="sortOrder" placeholder="Sort">
              <el-option label="Newest" value="newest" />
              <el-option label="Oldest" value="oldest" />
            </el-select>
          </div>
        </div>

        <div v-if="loading.teams" class="panel-loading">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="filteredTeams.length === 0" class="panel-empty">
          <el-empty description="No team spaces yet" />
        </div>
        <div v-else class="team-grid">
          <article v-for="team in filteredTeams" :key="team.id" class="team-card">
            <div class="team-meta">
              <span class="team-role">{{ team.role }}</span>
              <span class="team-count">{{ team.memberCount }} members</span>
            </div>
            <h3 class="team-name">{{ team.name }}</h3>
            <p class="team-date">Created {{ formatDate(team.createdAt) }}</p>
            <div class="team-actions">
              <el-button type="primary" plain @click="router.push(`/teams/${team.id}`)">Open</el-button>
            </div>
          </article>
        </div>
      </section>

      <section class="panel soft">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">Pending Invites</h2>
            <p class="panel-subtitle">Respond quickly to start collaborating.</p>
          </div>
        </div>
        <div v-if="loading.invites" class="panel-loading">
          <el-skeleton :rows="3" animated />
        </div>
        <div v-else-if="invites.length === 0" class="panel-empty">
          <el-empty description="No pending invites" />
        </div>
        <div v-else class="invite-list">
          <div v-for="invite in invites" :key="invite.teamId" class="invite-item">
            <div>
              <div class="invite-title">{{ invite.teamName || 'Team' }}</div>
              <div class="invite-meta">
                <span class="tag">{{ invite.role }}</span>
                <span class="invite-meta-text">
                  Invited by {{ invite.inviterDisplayName || invite.inviterUsername || 'Team admin' }}
                </span>
              </div>
              <div class="invite-time">Sent {{ formatDate(invite.invitedAt) }}</div>
            </div>
            <div class="invite-actions">
              <el-button type="success" :loading="loading.action" @click="handleAccept(invite)">
                Accept
              </el-button>
              <el-button type="default" plain :loading="loading.action" @click="handleReject(invite)">
                Decline
              </el-button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <el-dialog v-model="createDialog" title="Create a Team Space" width="520px">
    <el-form label-position="top">
      <el-form-item label="Team name">
        <el-input v-model="form.name" placeholder="Design Ops" />
      </el-form-item>
      <el-form-item label="Description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Optional summary for the team space."
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialog = false">Cancel</el-button>
      <el-button type="primary" :loading="loading.creating" @click="handleCreate">
        Create
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.panel-title {
  margin: 0;
  font-size: 1.2rem;
}

.panel-subtitle {
  margin: 6px 0 0;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.panel-loading,
.panel-empty {
  padding: 16px 0;
}

.team-grid {
  display: grid;
  gap: 16px;
}

.team-card {
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--stroke-soft);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(251, 247, 241, 0.9));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-meta {
  display: flex;
  justify-content: space-between;
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.team-role {
  font-weight: 600;
  color: var(--accent);
}

.team-name {
  margin: 0;
  font-size: 1.1rem;
}

.team-date {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.team-actions {
  display: flex;
  justify-content: flex-end;
}

.invite-list {
  display: grid;
  gap: 12px;
}

.invite-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--stroke-soft);
  background: rgba(255, 255, 255, 0.85);
}

.invite-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.invite-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invite-meta-text {
  color: var(--ink-soft);
  font-size: 0.8rem;
}

.invite-time {
  color: var(--ink-soft);
  font-size: 0.75rem;
  margin-top: 4px;
}

.invite-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 110px;
}

.panel-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

@media (max-width: 900px) {
  .invite-item {
    flex-direction: column;
  }

  .invite-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
