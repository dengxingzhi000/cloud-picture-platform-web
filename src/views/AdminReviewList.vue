<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { exportReviews, listPending, type AdminPictureSummary } from '@/api/pictures'
import { formatBytes, formatDate } from '@/utils/format'

const router = useRouter()
const items = ref<AdminPictureSummary[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const loading = ref(false)
const exportLoading = ref(false)
const exportPictureId = ref('')

const load = async () => {
  loading.value = true
  try {
    const data = await listPending(page.value - 1, size.value)
    items.value = data.items
    total.value = data.total
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load pending list')
  } finally {
    loading.value = false
  }
}

const openDetail = (item: AdminPictureSummary) => {
  sessionStorage.setItem('cpp:admin:selected', JSON.stringify(item))
  router.push(`/admin/reviews/${item.id}`)
}

const exportCsv = async () => {
  exportLoading.value = true
  try {
    const blob = await exportReviews({
      pictureId: exportPictureId.value || undefined,
      sortBy: 'reviewedAt',
      sortDir: 'desc',
      limit: 5000,
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'moderation_reviews.csv'
    link.click()
    URL.revokeObjectURL(url)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Export failed')
  } finally {
    exportLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Review Queue</h1>
        <p class="page-subtitle">Pending public submissions awaiting approval.</p>
      </div>
      <div class="export-tools">
        <el-input v-model="exportPictureId" placeholder="Filter by picture id" />
        <el-button type="primary" plain :loading="exportLoading" @click="exportCsv">
          Export Reviews CSV
        </el-button>
      </div>
    </div>

    <div class="panel">
      <el-table :data="items" v-loading="loading" class="table">
        <el-table-column label="Preview" width="140">
          <template #default="{ row }">
            <div class="thumb">
              <img :src="row.url" :alt="row.name" />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Name" min-width="180" />
        <el-table-column label="Owner" min-width="160">
          <template #default="{ row }">
            <strong>{{ row.ownerDisplayName || row.ownerUsername || '—' }}</strong>
            <div class="meta">{{ row.ownerId }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Size" width="120">
          <template #default="{ row }">{{ formatBytes(row.sizeBytes) }}</template>
        </el-table-column>
        <el-table-column label="Visibility" width="120">
          <template #default="{ row }">
            <el-tag :type="row.visibility === 'PUBLIC' ? 'success' : 'info'">
              {{ row.visibility }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Last Review" min-width="180">
          <template #default="{ row }">
            <div>{{ row.lastReviewerDisplayName || row.lastReviewerUsername || '—' }}</div>
            <div class="meta">{{ formatDate(row.lastReviewedAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Action" width="140">
          <template #default="{ row }">
            <el-button type="primary" text @click="openDetail(row)">Review</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="size"
          :current-page="page"
          @current-change="(val: number) => { page = val; load() }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.thumb {
  width: 110px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #efe7dd;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.meta {
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.export-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.table :deep(.el-table__cell) {
  vertical-align: top;
}
</style>
