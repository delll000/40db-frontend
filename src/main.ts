import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { setAuthTokenProvider } from '@/services/http'
import { getAccessToken } from '@/services/supabase'

import '@/assets/styles/tokens.css'
import '@/assets/styles/global.css'
import 'leaflet/dist/leaflet.css'

const app = createApp(App)
app.use(createPinia())

// Conectar el cliente HTTP al JWT vigente de Supabase.
setAuthTokenProvider(getAccessToken)

// Restaurar sesión + perfil ANTES de montar el router, para que los guards
// vean el estado correcto en la primera navegación.
const auth = useAuthStore()
await auth.restore()
auth.subscribeToAuthChanges()

app.use(router)
app.mount('#app')
