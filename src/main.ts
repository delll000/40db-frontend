import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

import '@/assets/styles/tokens.css'
import '@/assets/styles/global.css'
import 'leaflet/dist/leaflet.css'

const app = createApp(App)

app.use(createPinia())

// Restaurar sesión desde localStorage ANTES de montar el router,
// para que los guards lean el estado correcto en la primera navegación.
useAuthStore().restore()

app.use(router)
app.mount('#app')
