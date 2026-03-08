import { createRouter, createWebHistory } from 'vue-router'
import { getToken, getUser } from '@/utils/auth'

const routes = [
  { path: '/', redirect: '/gallery' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: () => import('@/views/GalleryView.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/teams',
    name: 'teams',
    component: () => import('@/views/TeamListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/teams/:id',
    name: 'team-detail',
    component: () => import('@/views/TeamDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/reviews',
    name: 'admin-reviews',
    component: () => import('@/views/AdminReviewList.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/reviews/:id',
    name: 'admin-review-detail',
    component: () => import('@/views/AdminReviewDetail.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/TagManagerView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta?.requiresAuth && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta?.requiresAdmin) {
    const user = getUser()
    if (!user || user.role !== 'ADMIN') {
      return { name: 'gallery' }
    }
  }
  return true
})

export default router
