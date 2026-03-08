<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateProfile } from '@/api/auth'
import { useAuth } from '@/composables/useAuth'

type CropState = {
  zoom: number
}

const { user, refresh } = useAuth()

const visible = ref(false)
const saving = ref(false)
const uploading = ref(false)
const form = reactive({
  displayName: '',
  avatarUrl: '' as string | null,
})

const crop = reactive<CropState>({
  zoom: 1,
})

const imageRef = ref<HTMLImageElement | null>(null)
const previewUrl = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const hasAvatar = computed(() => Boolean(form.avatarUrl))

const open = () => {
  form.displayName = user.value?.displayName || user.value?.username || ''
  form.avatarUrl = user.value?.avatarUrl || ''
  previewUrl.value = null
  imageRef.value = null
  crop.zoom = 1
  visible.value = true
}

const close = () => {
  visible.value = false
}

const renderCrop = () => {
  if (!imageRef.value) return
  const image = imageRef.value
  const size = Math.min(image.width, image.height) / crop.zoom
  const sx = (image.width - size) / 2
  const sy = (image.height - size) / 2
  const canvas = document.createElement('canvas')
  const outputSize = 256
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.drawImage(image, sx, sy, size, size, 0, 0, outputSize, outputSize)
  previewUrl.value = canvas.toDataURL('image/png')
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      imageRef.value = image
      crop.zoom = 1
      renderCrop()
      URL.revokeObjectURL(objectUrl)
    }
    image.onerror = () => {
      ElMessage.error('Failed to load image')
      URL.revokeObjectURL(objectUrl)
    }
    image.src = objectUrl
  } finally {
    uploading.value = false
  }
}

const applyCropped = () => {
  if (!previewUrl.value) {
    ElMessage.warning('Upload an image first')
    return
  }
  form.avatarUrl = previewUrl.value
  ElMessage.success('Cropped avatar applied')
}

const clearAvatar = () => {
  form.avatarUrl = ''
  previewUrl.value = null
  imageRef.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const save = async () => {
  saving.value = true
  try {
    await updateProfile({
      displayName: form.displayName?.trim() || undefined,
      avatarUrl: form.avatarUrl?.trim() || null,
    })
    await refresh()
    ElMessage.success('Profile updated')
    close()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Failed to update profile')
  } finally {
    saving.value = false
  }
}

watch(
  () => crop.zoom,
  () => renderCrop()
)

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" title="Profile settings" width="640px">
    <div class="profile-grid">
      <div class="profile-pane">
        <h3 class="section-title">Basic info</h3>
        <el-form label-position="top">
          <el-form-item label="Display name">
            <el-input v-model="form.displayName" placeholder="Studio Lead" />
          </el-form-item>
          <el-form-item label="Avatar URL (optional)">
            <el-input v-model="form.avatarUrl" placeholder="https://..." />
          </el-form-item>
        </el-form>
      </div>

      <div class="profile-pane">
        <h3 class="section-title">Upload & crop</h3>
        <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          accept="image/*"
          @change="handleFileChange"
        />
        <div class="crop-preview">
          <div v-if="previewUrl" class="preview-avatar">
            <img :src="previewUrl" alt="Avatar preview" />
          </div>
          <div v-else class="preview-empty">No image selected</div>
        </div>
        <div class="crop-controls">
          <span>Zoom</span>
          <el-slider v-model="crop.zoom" :min="1" :max="3" :step="0.05" />
        </div>
        <div class="crop-actions">
          <el-button :loading="uploading" type="primary" plain @click="applyCropped">
            Use cropped avatar
          </el-button>
          <el-button plain @click="clearAvatar" :disabled="!hasAvatar">Clear</el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="close">Cancel</el-button>
      <el-button type="primary" :loading="saving" @click="save">Save</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.profile-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 1rem;
}

.file-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.6);
}

.crop-preview {
  display: grid;
  place-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--stroke-soft);
  min-height: 180px;
}

.preview-avatar {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  overflow: hidden;
  border: 3px solid rgba(239, 107, 47, 0.2);
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-empty {
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.crop-controls {
  display: grid;
  gap: 6px;
  color: var(--ink-soft);
  font-size: 0.85rem;
}

.crop-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
