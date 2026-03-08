<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import ProfileDialog from '@/components/ProfileDialog.vue'

const router = useRouter()
const route = useRoute()
const { user, isAuthed, refresh, logout } = useAuth()
const profileDialog = ref<InstanceType<typeof ProfileDialog> | null>(null)
const isAdmin = computed(() => user.value?.role === 'ADMIN')

const navItems = [
  { label: 'Public Gallery', path: '/gallery' },
  { label: 'Search', path: '/search', auth: true },
  { label: 'Upload', path: '/upload', auth: true },
  { label: 'Teams', path: '/teams', auth: true },
  { label: 'Tags', path: '/tags', auth: true },
  { label: 'Admin Review', path: '/admin/reviews', auth: true, admin: true },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => (item.auth ? isAuthed.value : true) && (!item.admin || isAdmin.value))
)

const handleLogout = () => {
  logout()
  router.push('/login')
}

const openProfile = () => {
  profileDialog.value?.open()
}

const isActive = (path: string) => route.path.startsWith(path)

onMounted(() => {
  if (isAuthed.value) {
    refresh()
  }
})
</script>

<template>
  <el-config-provider>
    <div class="app-shell">
      <header class="app-header">
        <button class="brand" @click="router.push('/gallery')">
          <span class="brand-mark"></span>
          <span class="brand-text">
            <span class="brand-title">Cloud Canvas</span>
            <span class="brand-sub">Collaborative Picture Platform</span>
          </span>
        </button>
        <nav class="nav">
          <router-link
            v-for="item in visibleNavItems"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            {{ item.label }}
          </router-link>
        </nav>
        <div class="auth-actions">
          <template v-if="isAuthed">
            <button class="user-pill" @click="openProfile">
              <el-avatar
                v-if="user?.avatarUrl"
                :size="28"
                :src="user.avatarUrl"
              />
              <div v-else class="avatar-fallback">
                {{ (user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase() }}
              </div>
              <span class="user-name">{{ user?.displayName || user?.username }}</span>
            </button>
            <el-button type="default" plain @click="handleLogout">Logout</el-button>
          </template>
          <template v-else>
            <el-button type="primary" @click="router.push('/login')">Login</el-button>
          </template>
        </div>
      </header>
      <main class="app-main">
        <transition name="page-fade" mode="out-in">
          <router-view />
        </transition>
      </main>
      <ProfileDialog ref="profileDialog" />
    </div>
  </el-config-provider>
</template>

<style scoped>
.user-pill {
  gap: 10px;
  border: none;
  cursor: pointer;
  background: rgba(31, 138, 112, 0.12);
  padding: 6px 12px;
  border-radius: 999px;
}

.user-pill:hover {
  background: rgba(31, 138, 112, 0.2);
}

.avatar-fallback {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(239, 107, 47, 0.2);
  color: var(--ink-strong);
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 0.75rem;
}
</style>
