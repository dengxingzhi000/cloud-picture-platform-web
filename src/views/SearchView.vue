<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { searchPictures, type PictureSummary } from '@/api/pictures'
import { listTags, type TagInfo } from '@/api/tags'
import { formatBytes } from '@/utils/format'

type Orientation = 'all' | 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE'
type VisibilityFilter = 'all' | 'PUBLIC' | 'PRIVATE' | 'TEAM'
type ReviewFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED'
type SortBy = 'createdAt' | 'updatedAt' | 'sizeBytes'
type SortDir = 'asc' | 'desc'
type TagOption = {
  value: string
  id: string
}

const items = ref<PictureSummary[]>([])
const total = ref(0)
const page = ref(0)
const size = ref(12)
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = computed(() => items.value.length < total.value)

const keyword = ref('')
const tag = ref('')
const tagId = ref('')
const ownerId = ref('')
const spaceId = ref('')
const orientation = ref<Orientation>('all')
const visibility = ref<VisibilityFilter>('all')
const reviewStatus = ref<ReviewFilter>('all')
const minSizeMb = ref('')
const maxSizeMb = ref('')
const createdRange = ref<[Date, Date] | null>(null)
const sortBy = ref<SortBy>('createdAt')
const sortDir = ref<SortDir>('desc')
let autoTimer: number | null = null
const lastSearchedAt = ref<Date | null>(null)
const autoSearchEnabled = ref(true)
const selectedTagName = ref('')

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)

const formatTimestamp = (value: Date | null) => (value ? value.toLocaleString() : '')

const ownerIdError = computed(() => {
  const value = ownerId.value.trim()
  return value && !isUuid(value) ? 'Owner id must be a valid UUID' : ''
})

const spaceIdError = computed(() => {
  const value = spaceId.value.trim()
  return value && !isUuid(value) ? 'Space id must be a valid UUID' : ''
})

const tagIdError = computed(() => {
  const value = tagId.value.trim()
  return value && !isUuid(value) ? 'Tag id must be a valid UUID' : ''
})

const minSizeError = computed(() => {
  const value = minSizeMb.value.trim()
  if (!value) return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? '' : 'Enter a valid min size'
})

const maxSizeError = computed(() => {
  const value = maxSizeMb.value.trim()
  if (!value) return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? '' : 'Enter a valid max size'
})

const sizeRangeError = computed(() => {
  if (minSizeError.value || maxSizeError.value) return ''
  const minBytes = toBytes(minSizeMb.value)
  const maxBytes = toBytes(maxSizeMb.value)
  if (minBytes !== undefined && maxBytes !== undefined && minBytes > maxBytes) {
    return 'Min size cannot exceed max size'
  }
  return ''
})

const dateRangeError = computed(() => {
  if (createdRange.value?.[0] && createdRange.value?.[1]) {
    if (createdRange.value[0].getTime() > createdRange.value[1].getTime()) {
      return 'Created range is invalid'
    }
  }
  return ''
})

const fetchTagSuggestions = async (queryString: string, cb: (items: TagOption[]) => void) => {
  const keyword = queryString.trim()
  if (!keyword) {
    cb([])
    return
  }
  try {
    const data = await listTags({ page: 0, size: 8, keyword })
    const options = data.items.map((item: TagInfo) => ({
      value: item.name,
      id: item.id,
    }))
    cb(options)
  } catch {
    cb([])
  }
}

const handleTagSelect = (option: TagOption) => {
  tag.value = option.value
  tagId.value = option.id
  selectedTagName.value = option.value
}

const toBytes = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return Math.round(parsed * 1024 * 1024)
}

const buildParams = (pageIndex: number) => {
  const range = createdRange.value
  return {
    page: pageIndex,
    size: size.value,
    keyword: keyword.value.trim() || undefined,
    tag: tag.value.trim() || undefined,
    tagId: tagId.value.trim() || undefined,
    ownerId: ownerId.value.trim() || undefined,
    spaceId: spaceId.value.trim() || undefined,
    visibility: visibility.value === 'all' ? undefined : visibility.value,
    reviewStatus: reviewStatus.value === 'all' ? undefined : reviewStatus.value,
    minSizeBytes: toBytes(minSizeMb.value),
    maxSizeBytes: toBytes(maxSizeMb.value),
    createdAfter: range?.[0] ? range[0].toISOString() : undefined,
    createdBefore: range?.[1] ? range[1].toISOString() : undefined,
    orientation: orientation.value === 'all' ? undefined : orientation.value,
    sortBy: sortBy.value,
    sortDir: sortDir.value,
  }
}

const validateFilters = () => {
  const minBytes = toBytes(minSizeMb.value)
  const maxBytes = toBytes(maxSizeMb.value)
  if (sizeRangeError.value || dateRangeError.value) {
    return false
  }
  if (ownerIdError.value || spaceIdError.value || tagIdError.value || minSizeError.value || maxSizeError.value) {
    return false
  }
  return true
}

const load = async () => {
  loading.value = true
  page.value = 0
  try {
    const data = await searchPictures(buildParams(0))
    items.value = data.items
    total.value = data.total
    lastSearchedAt.value = new Date()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load search results')
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const data = await searchPictures(buildParams(nextPage))
    items.value = items.value.concat(data.items)
    total.value = data.total
    page.value = nextPage
    lastSearchedAt.value = new Date()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load more results')
  } finally {
    loadingMore.value = false
  }
}

const applyFilters = () => {
  if (!validateFilters()) return
  load()
}

const resetFilters = () => {
  keyword.value = ''
  tag.value = ''
  tagId.value = ''
  ownerId.value = ''
  spaceId.value = ''
  orientation.value = 'all'
  visibility.value = 'all'
  reviewStatus.value = 'all'
  minSizeMb.value = ''
  maxSizeMb.value = ''
  createdRange.value = null
  sortBy.value = 'createdAt'
  sortDir.value = 'desc'
  size.value = 12
  load()
}

const visibilityTagType = (value: PictureSummary['visibility']) => {
  if (value === 'PUBLIC') return 'success'
  if (value === 'TEAM') return 'warning'
  return 'info'
}

const scheduleAutoSearch = (delay = 300) => {
  if (!autoSearchEnabled.value) return
  if (!validateFilters()) return
  if (autoTimer) {
    window.clearTimeout(autoTimer)
  }
  autoTimer = window.setTimeout(() => {
    autoTimer = null
    load()
  }, delay)
}

watch([orientation, visibility, reviewStatus, sortBy, sortDir, size, createdRange], () =>
  scheduleAutoSearch(300)
)
watch([keyword, tag, tagId, ownerId, spaceId, minSizeMb, maxSizeMb], () => scheduleAutoSearch(500))
watch(autoSearchEnabled, (enabled) => {
  if (enabled) {
    scheduleAutoSearch(200)
  }
})

watch(tag, (value) => {
  if (!value || (tagId.value && value !== selectedTagName.value)) {
    tagId.value = ''
    selectedTagName.value = value
  }
})

onMounted(load)
</script>

<template>
  <div class="page">
    <section class="panel hero">
      <div>
        <h1 class="page-title">Picture Search</h1>
        <p class="page-subtitle">Filter assets across spaces, tags, and owners.</p>
      </div>
      <div class="hero-badges">
        <span class="tag">Advanced Filters</span>
        <span class="tag alt">Server Search</span>
        <span class="tag soft">Authenticated</span>
      </div>
    </section>

    <section class="panel">
      <div class="page-header">
        <div>
          <h2 class="page-title">Search Filters</h2>
          <p class="page-subtitle">Fine tune by metadata, size, and visibility.</p>
        </div>
      </div>

      <div class="filters">
        <div class="filter-toolbar">
          <div class="filter-toggle">
            <span class="meta">Auto-search</span>
            <el-switch v-model="autoSearchEnabled" />
          </div>
        </div>
        <div class="filters-grid">
          <el-input v-model="keyword" placeholder="Keyword or name" clearable @keyup.enter="applyFilters" />
          <el-autocomplete
            v-model="tag"
            placeholder="Tag text"
            clearable
            :fetch-suggestions="fetchTagSuggestions"
            @select="handleTagSelect"
            @keyup.enter="applyFilters"
          />
          <el-select v-model="orientation" placeholder="Orientation">
            <el-option label="All" value="all" />
            <el-option label="Landscape" value="LANDSCAPE" />
            <el-option label="Portrait" value="PORTRAIT" />
            <el-option label="Square" value="SQUARE" />
          </el-select>
          <el-select v-model="visibility" placeholder="Visibility">
            <el-option label="All" value="all" />
            <el-option label="Public" value="PUBLIC" />
            <el-option label="Private" value="PRIVATE" />
            <el-option label="Team" value="TEAM" />
          </el-select>
          <el-select v-model="reviewStatus" placeholder="Review status">
            <el-option label="All" value="all" />
            <el-option label="Pending" value="PENDING" />
            <el-option label="Approved" value="APPROVED" />
            <el-option label="Rejected" value="REJECTED" />
          </el-select>
          <div class="field">
            <el-input
              v-model="minSizeMb"
              placeholder="Min size (MB)"
              clearable
              :status="minSizeError || sizeRangeError ? 'error' : ''"
            />
            <div v-if="minSizeError" class="field-hint">{{ minSizeError }}</div>
          </div>
          <div class="field">
            <el-input
              v-model="maxSizeMb"
              placeholder="Max size (MB)"
              clearable
              :status="maxSizeError || sizeRangeError ? 'error' : ''"
            />
            <div v-if="maxSizeError || sizeRangeError" class="field-hint">
              {{ maxSizeError || sizeRangeError }}
            </div>
          </div>
          <div class="field span-2">
            <el-date-picker
              v-model="createdRange"
              type="datetimerange"
              range-separator="to"
              start-placeholder="Created after"
              end-placeholder="Created before"
              :class="{ 'is-error': !!dateRangeError }"
            />
            <div v-if="dateRangeError" class="field-hint">{{ dateRangeError }}</div>
          </div>
        </div>
        <div class="filters-grid advanced">
          <div class="field">
            <el-input
              v-model="tagId"
              placeholder="Tag id"
              clearable
              :status="tagIdError ? 'error' : ''"
            />
            <div v-if="tagIdError" class="field-hint">{{ tagIdError }}</div>
          </div>
          <div class="field">
            <el-input
              v-model="ownerId"
              placeholder="Owner id"
              clearable
              :status="ownerIdError ? 'error' : ''"
            />
            <div v-if="ownerIdError" class="field-hint">{{ ownerIdError }}</div>
          </div>
          <div class="field">
            <el-input
              v-model="spaceId"
              placeholder="Space id"
              clearable
              :status="spaceIdError ? 'error' : ''"
            />
            <div v-if="spaceIdError" class="field-hint">{{ spaceIdError }}</div>
          </div>
          <el-select v-model="sortBy" placeholder="Sort by">
            <el-option label="Created time" value="createdAt" />
            <el-option label="Updated time" value="updatedAt" />
            <el-option label="Size" value="sizeBytes" />
          </el-select>
          <el-select v-model="sortDir" placeholder="Sort direction">
            <el-option label="Newest first" value="desc" />
            <el-option label="Oldest first" value="asc" />
          </el-select>
          <el-select v-model="size" placeholder="Page size">
            <el-option label="12 per page" :value="12" />
            <el-option label="24 per page" :value="24" />
            <el-option label="36 per page" :value="36" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button type="primary" :loading="loading" @click="applyFilters">Search</el-button>
          <el-button plain @click="resetFilters">Reset</el-button>
        </div>
      </div>

      <div class="list-meta">
        <span>Showing {{ items.length }} of {{ total }} results</span>
        <span class="meta-divider">•</span>
        <span>Auto-search on</span>
        <template v-if="lastSearchedAt">
          <span class="meta-divider">•</span>
          <span>Last updated {{ formatTimestamp(lastSearchedAt) }}</span>
        </template>
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
            <div class="card-header">
              <strong>{{ item.name }}</strong>
              <el-tag size="small" :type="visibilityTagType(item.visibility)">
                {{ item.visibility }}
              </el-tag>
            </div>
            <div class="meta-row">
              <span class="meta">{{ formatBytes(item.sizeBytes) }}</span>
              <span class="meta">{{ item.width || '--' }} x {{ item.height || '--' }}</span>
            </div>
          </div>
        </article>
        <div v-if="items.length === 0" class="empty-state">
          No results yet. Adjust filters and search again.
        </div>
      </div>

      <div class="load-more">
        <el-button v-if="hasMore" :loading="loadingMore" plain @click="loadMore">
          Load more
        </el-button>
        <span v-else class="meta">End of results</span>
      </div>
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

.filters {
  display: grid;
  gap: 16px;
}

.filter-toolbar {
  display: flex;
  justify-content: flex-end;
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(31, 138, 112, 0.12);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.filters-grid.advanced {
  grid-template-columns: repeat(6, minmax(160px, 1fr));
}

.filters-grid :deep(.el-input__wrapper),
.filters-grid :deep(.el-select__wrapper),
.filters-grid :deep(.el-date-editor) {
  width: 100%;
}

.filters-grid :deep(.el-autocomplete) {
  width: 100%;
}

.filters-grid :deep(.el-date-editor.is-error) {
  box-shadow: 0 0 0 1px rgba(200, 76, 43, 0.6) inset;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field.span-2 {
  grid-column: span 2;
}

.field-hint {
  font-size: 0.75rem;
  color: #c84c2b;
}

.filters-grid :deep(.el-date-editor) {
  grid-column: span 2;
}

.filter-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.list-meta {
  margin: 16px 0 12px;
  color: var(--ink-soft);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-divider {
  color: rgba(90, 82, 76, 0.6);
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.empty-state {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: var(--ink-soft);
}

.load-more {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 48px;
}

@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-grid,
  .filters-grid.advanced {
    grid-template-columns: 1fr;
  }

  .field.span-2 {
    grid-column: 1 / -1;
  }

  .filter-actions {
    justify-content: flex-start;
  }

  .filter-toolbar {
    justify-content: flex-start;
  }
}
</style>
