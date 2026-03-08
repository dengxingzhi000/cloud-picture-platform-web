<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { listPublic, type PictureSummary } from '@/api/pictures'
import { formatBytes } from '@/utils/format'

type Orientation = 'all' | 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'
type SizeBand = 'all' | 'small' | 'medium' | 'large'

const items = ref<PictureSummary[]>([])
const total = ref(0)
const page = ref(0)
const size = ref(12)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = computed(() => items.value.length < total.value)
const sentinel = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null
let autoTimer: number | null = null

const query = ref('')
const orientation = ref<Orientation>('all')
const sizeBand = ref<SizeBand>('all')

const resetFilters = () => {
  query.value = ''
  orientation.value = 'all'
  sizeBand.value = 'all'
}

const buildParams = (pageIndex: number) => {
  let minSizeBytes: number | undefined
  let maxSizeBytes: number | undefined
  if (sizeBand.value === 'small') {
    maxSizeBytes = 1024 * 1024 - 1
  } else if (sizeBand.value === 'medium') {
    minSizeBytes = 1024 * 1024
    maxSizeBytes = 5 * 1024 * 1024 - 1
  } else if (sizeBand.value === 'large') {
    minSizeBytes = 5 * 1024 * 1024
  }
  return {
    page: pageIndex,
    size: size.value,
    keyword: query.value.trim() || undefined,
    orientation: orientation.value === 'all' ? undefined : orientation.value,
    minSizeBytes,
    maxSizeBytes,
  }
}

const load = async () => {
  loading.value = true
  page.value = 0
  try {
    const data = await listPublic(buildParams(0))
    items.value = data.items
    total.value = data.total
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load gallery')
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const data = await listPublic(buildParams(nextPage))
    items.value = items.value.concat(data.items)
    total.value = data.total
    page.value = nextPage
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load more')
  } finally {
    loadingMore.value = false
  }
}

const setupObserver = () => {
  if (!sentinel.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      loadMore()
    }
  })
  observer.observe(sentinel.value)
}

const scheduleLoad = (delay = 400) => {
  if (autoTimer) {
    window.clearTimeout(autoTimer)
  }
  autoTimer = window.setTimeout(() => {
    autoTimer = null
    load()
  }, delay)
}

watch([query, orientation, sizeBand], () => scheduleLoad())

onMounted(async () => {
  await load()
  setupObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="page">
    <section class="panel hero">
      <div>
        <h1 class="page-title">Public Gallery</h1>
        <p class="page-subtitle">
          Browse the latest approved visuals from the community and teams.
        </p>
      </div>
      <div class="hero-badges">
        <span class="tag">Approved Only</span>
        <span class="tag alt">Fast Preview</span>
        <span class="tag soft">Collaborative</span>
      </div>
    </section>

    <section class="panel">
      <div class="page-header">
        <div>
          <h2 class="page-title">Latest Uploads</h2>
          <p class="page-subtitle">Fresh assets ready for reuse.</p>
        </div>
        <div class="filters">
          <el-input v-model="query" placeholder="Search by name" clearable />
          <el-select v-model="orientation" placeholder="Orientation">
            <el-option label="All" value="all" />
            <el-option label="Landscape" value="LANDSCAPE" />
            <el-option label="Portrait" value="PORTRAIT" />
            <el-option label="Square" value="SQUARE" />
          </el-select>
          <el-select v-model="sizeBand" placeholder="Size">
            <el-option label="All" value="all" />
            <el-option label="Small (<1MB)" value="small" />
            <el-option label="Medium (1-5MB)" value="medium" />
            <el-option label="Large (5MB+)" value="large" />
          </el-select>
          <el-button plain @click="resetFilters">Reset</el-button>
        </div>
      </div>

      <div class="list-meta">
        Showing {{ items.length }} of {{ total }} assets
      </div>

      <el-skeleton v-if="loading" :rows="6" animated />
      <div v-else class="grid cols-3">
        <article
          v-for="(item, index) in items"
          :key="item.id"
          class="card"
          :style="{ '--delay': `${index * 40}ms` }"
        >
          <div class="card-image">
            <img :src="item.url" :alt="item.name" loading="lazy" />
          </div>
          <div class="card-meta">
            <strong>{{ item.name }}</strong>
            <div class="meta-row">
              <span class="meta">{{ formatBytes(item.sizeBytes) }}</span>
              <span class="meta">{{ item.width || '--' }} x {{ item.height || '--' }}</span>
            </div>
          </div>
        </article>
        <div v-if="items.length === 0" class="empty-state">
          No matches yet. Adjust your filters or load more.
        </div>
      </div>

      <div class="load-more">
        <el-button v-if="hasMore" :loading="loadingMore" plain @click="loadMore">
          Load more
        </el-button>
        <span v-else class="meta">End of gallery</span>
      </div>
      <div ref="sentinel" class="sentinel"></div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
}

.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag.alt {
  background: rgba(239, 107, 47, 0.14);
  color: #b84e1f;
}

.tag.soft {
  background: rgba(83, 113, 151, 0.12);
  color: #3c5a78;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.filters :deep(.el-input__wrapper),
.filters :deep(.el-select__wrapper) {
  width: 100%;
}

.list-meta {
  margin-bottom: 12px;
  color: var(--ink-soft);
}

.load-more {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
}

.sentinel {
  height: 1px;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: var(--ink-soft);
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
