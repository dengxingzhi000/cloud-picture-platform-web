<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadPicture } from '@/api/pictures'
import { formatBytes } from '@/utils/format'

const form = reactive({
  name: '',
  visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC',
})

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const uploading = ref(false)
const uploaded = ref(false)

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  file.value = target.files[0]
  uploaded.value = false
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file.value)
}

const submit = async () => {
  if (!file.value) {
    ElMessage.warning('Choose a file first')
    return
  }
  uploading.value = true
  try {
    await uploadPicture({
      file: file.value,
      visibility: form.visibility,
      name: form.name || undefined,
    })
    uploaded.value = true
    ElMessage.success('Upload complete')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Upload failed')
  } finally {
    uploading.value = false
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Upload Studio</h1>
        <p class="page-subtitle">Send assets to your space or submit for public review.</p>
      </div>
    </div>

    <div class="grid cols-2">
      <section class="panel">
        <h2 class="panel-title">Asset Details</h2>
        <el-form label-position="top">
          <el-form-item label="Display Name">
            <el-input v-model="form.name" placeholder="Autumn Campaign Banner" />
          </el-form-item>
          <el-form-item label="Visibility">
            <el-radio-group v-model="form.visibility">
              <el-radio-button label="PRIVATE">Private</el-radio-button>
              <el-radio-button label="PUBLIC">Public</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="File">
            <input class="file-input" type="file" accept="image/*" @change="handleFileChange" />
            <div v-if="file" class="file-meta">
              <span>{{ file.name }}</span>
              <span class="meta">{{ formatBytes(file.size) }}</span>
            </div>
          </el-form-item>
          <el-button type="primary" :loading="uploading" class="cta" @click="submit">
            Upload
          </el-button>
          <p v-if="uploaded" class="note">
            {{ form.visibility === 'PUBLIC' ? 'Awaiting review approval.' : 'Saved to your private space.' }}
          </p>
        </el-form>
      </section>

      <section class="panel soft preview">
        <h2 class="panel-title">Preview</h2>
        <div v-if="previewUrl" class="preview-frame">
          <img :src="previewUrl" alt="Preview" />
        </div>
        <div v-else class="preview-empty">
          Drag in your best shot. We will extract size and metadata after upload.
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.panel-title {
  margin: 0 0 12px;
  font-size: 1.1rem;
}

.file-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.6);
}

.file-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin-top: 8px;
}

.cta {
  width: 100%;
  height: 44px;
}

.note {
  margin-top: 10px;
  color: var(--ink-soft);
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-frame {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: #efe7dd;
  aspect-ratio: 4 / 3;
}

.preview-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-empty {
  color: var(--ink-soft);
  padding: 24px;
  border-radius: 16px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  text-align: center;
}
</style>
