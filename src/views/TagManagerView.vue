<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createTag, deleteTag, listTags, updateTag, type TagInfo } from '@/api/tags'
import { formatDate } from '@/utils/format'

const items = ref<TagInfo[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)
const keyword = ref('')

const createName = ref('')
const createLoading = ref(false)

const editVisible = ref(false)
const editLoading = ref(false)
const editForm = reactive({
  id: '',
  name: '',
})

const load = async () => {
  loading.value = true
  try {
    const data = await listTags({
      page: page.value - 1,
      size: size.value,
      keyword: keyword.value.trim() || undefined,
    })
    items.value = data.items
    total.value = data.total
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to load tags')
  } finally {
    loading.value = false
  }
}

const search = () => {
  page.value = 1
  load()
}

const submitCreate = async () => {
  const name = createName.value.trim()
  if (!name) {
    ElMessage.warning('Tag name is required')
    return
  }
  createLoading.value = true
  try {
    await createTag({ name })
    createName.value = ''
    ElMessage.success('Tag created')
    search()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to create tag')
  } finally {
    createLoading.value = false
  }
}

const openEdit = (tag: TagInfo) => {
  editForm.id = tag.id
  editForm.name = tag.name
  editVisible.value = true
}

const submitEdit = async () => {
  const name = editForm.name.trim()
  if (!name) {
    ElMessage.warning('Tag name is required')
    return
  }
  editLoading.value = true
  try {
    await updateTag(editForm.id, { name })
    ElMessage.success('Tag updated')
    editVisible.value = false
    load()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to update tag')
  } finally {
    editLoading.value = false
  }
}

const removeTag = async (tag: TagInfo) => {
  try {
    await ElMessageBox.confirm(
      `Delete tag "${tag.name}"? This will only remove the catalog entry.`,
      'Confirm delete',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await deleteTag(tag.id)
    ElMessage.success('Tag deleted')
    load()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to delete tag')
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Tag Manager</h1>
        <p class="page-subtitle">Maintain the tag catalog for search and labeling.</p>
      </div>
      <div class="create-tools">
        <el-input
          v-model="createName"
          placeholder="New tag name"
          clearable
          @keyup.enter="submitCreate"
        />
        <el-button type="primary" :loading="createLoading" @click="submitCreate">Create</el-button>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <el-input
          v-model="keyword"
          placeholder="Search tags"
          clearable
          class="toolbar-input"
          @keyup.enter="search"
        />
        <el-button plain @click="search">Search</el-button>
      </div>

      <el-table :data="items" v-loading="loading" class="table">
        <el-table-column prop="name" label="Name" min-width="200" />
        <el-table-column label="Created" width="200">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="id" label="ID" min-width="260" />
        <el-table-column label="Actions" width="160">
          <template #default="{ row }">
            <el-button type="primary" text @click="openEdit(row)">Edit</el-button>
            <el-button type="danger" text @click="removeTag(row)">Delete</el-button>
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

    <el-dialog v-model="editVisible" title="Edit tag" width="420px">
      <el-form label-position="top">
        <el-form-item label="Tag name">
          <el-input v-model="editForm.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.create-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.toolbar-input {
  min-width: 240px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.table :deep(.el-table__cell) {
  vertical-align: top;
}
</style>
