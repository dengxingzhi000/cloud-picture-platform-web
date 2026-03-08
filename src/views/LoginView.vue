<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { login, register } from '@/api/auth'
import { setToken, setUser } from '@/utils/auth'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { refresh } = useAuth()

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  usernameOrEmail: '',
  password: '',
  username: '',
  email: '',
  displayName: '',
})

const rules: FormRules = {
  usernameOrEmail: [{ required: true, message: 'Enter username or email', trigger: 'blur' }],
  password: [{ required: true, message: 'Enter password', trigger: 'blur' }],
  username: [{ required: true, message: 'Username is required', trigger: 'blur' }],
  email: [{ type: 'email', message: 'Invalid email', trigger: 'blur' }],
}

const submit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) return
  loading.value = true
  try {
    if (mode.value === 'login') {
      const result = await login({
        usernameOrEmail: form.usernameOrEmail,
        password: form.password,
      })
      setToken(result.token)
      setUser({ userId: result.userId, username: result.username })
      await refresh()
      ElMessage.success('Welcome back')
    } else {
      const result = await register({
        username: form.username,
        email: form.email || undefined,
        password: form.password,
        displayName: form.displayName || undefined,
      })
      setToken(result.token)
      setUser({ userId: result.userId, username: result.username })
      await refresh()
      ElMessage.success('Account created')
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/gallery'
    router.push(redirect)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || 'Request failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page login">
    <div class="page-header">
      <div>
        <h1 class="page-title">Welcome to Cloud Canvas</h1>
        <p class="page-subtitle">Sign in to upload, review, and collaborate.</p>
      </div>
    </div>

    <div class="panel login-panel">
      <el-tabs v-model="mode" stretch>
        <el-tab-pane label="Login" name="login" />
        <el-tab-pane label="Register" name="register" />
      </el-tabs>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <template v-if="mode === 'login'">
          <el-form-item label="Username or Email" prop="usernameOrEmail">
            <el-input v-model="form.usernameOrEmail" placeholder="you@company.com" />
          </el-form-item>
        </template>

        <template v-else>
          <div class="grid cols-2">
            <el-form-item label="Username" prop="username">
              <el-input v-model="form.username" placeholder="studio_admin" />
            </el-form-item>
            <el-form-item label="Display Name">
              <el-input v-model="form.displayName" placeholder="Studio Lead" />
            </el-form-item>
          </div>
          <el-form-item label="Email" prop="email">
            <el-input v-model="form.email" placeholder="name@company.com" />
          </el-form-item>
        </template>

        <el-form-item label="Password" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="At least 8 characters" />
        </el-form-item>

        <el-button type="primary" :loading="loading" class="cta" @click="submit">
          {{ mode === 'login' ? 'Login' : 'Create Account' }}
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-panel {
  max-width: 520px;
}

.cta {
  width: 100%;
  height: 44px;
  margin-top: 8px;
}
</style>
