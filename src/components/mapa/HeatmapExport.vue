<script setup lang="ts">
import { computed, ref } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import BaseButton from '@/components/common/BaseButton.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { reportesAdminArchivosService } from '@/services/reportesAdminArchivos.service'
import type { HeatmapPoint, HeatmapKpis } from '@/types/kpi'
import type { TipoArchivoAdmin } from '@/types/api'

const props = defineProps<{
  /** Elemento DOM del mapa para exportar a PNG */
  mapElement: HTMLElement | null
  points: HeatmapPoint[]
  kpis: HeatmapKpis | null
}>()

const toast = useToast()
const auth = useAuthStore()
const exporting = ref<'png' | 'pdf' | null>(null)

// Solo los admins pueden subir al bucket privado. Para el resto la opción
// no se muestra y el flujo es exclusivamente descarga local.
const esAdmin = computed(() => auth.role === 'admin')

// Opt-in: por defecto en true para que la acción explícita ("Exportar PDF")
// también persista la copia en el panel. Si el admin está experimentando
// puede destildar antes de exportar.
const guardarEnPanel = ref(true)

function nowStamp() {
  const d = new Date()
  return `${d.toISOString().slice(0, 10)}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Sube el mismo blob al bucket admin. No bloquea el flujo de descarga: si
// falla, el archivo ya está en el disco del usuario y mostramos un error
// aparte para que el admin sepa que NO quedó copia en el panel.
async function guardarEnBucket(blob: Blob, nombre: string, tipo: TipoArchivoAdmin) {
  if (!esAdmin.value || !guardarEnPanel.value) return
  try {
    await reportesAdminArchivosService.subir({ blob, nombre, tipo })
    toast.success('Guardado en panel admin', nombre)
  } catch (e) {
    toast.error('No se pudo guardar en panel admin', e instanceof Error ? e.message : undefined)
  }
}

async function exportPng() {
  if (!props.mapElement) {
    toast.error('No se pudo exportar', 'Mapa no disponible.')
    return
  }
  exporting.value = 'png'
  try {
    const canvas = await html2canvas(props.mapElement, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    })
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))
    if (!blob) throw new Error('No se pudo serializar la imagen.')
    const nombre = `heatmap_${nowStamp()}.png`
    downloadBlob(blob, nombre)
    toast.success('Imagen exportada')
    await guardarEnBucket(blob, nombre, 'imagen')
  } catch (e) {
    toast.error('Error al exportar PNG', e instanceof Error ? e.message : undefined)
  } finally {
    exporting.value = null
  }
}

async function exportPdf() {
  exporting.value = 'pdf'
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

    // Encabezado
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('40dB — Mapa de Ruido', 40, 50)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 40, 68)
    doc.setTextColor(50)

    // Captura del mapa
    if (props.mapElement) {
      const canvas = await html2canvas(props.mapElement, {
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const img = canvas.toDataURL('image/png')
      const pageWidth = doc.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 80
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      doc.addImage(img, 'PNG', 40, 90, imgWidth, Math.min(imgHeight, 350))
    }

    // KPIs como tabla
    if (props.kpis) {
      autoTable(doc, {
        startY: 460,
        head: [['Indicador', 'Valor']],
        body: [
          ['dB promedio', `${props.kpis.avgDb} dB(A)`],
          ['Zonas sobre estándar', String(props.kpis.zonesOverStandard)],
          ['Sensores activos', String(props.kpis.activeSensors)],
          [
            'Zona más ruidosa',
            props.kpis.noisiestZone
              ? `${props.kpis.noisiestZone.zone} — ${props.kpis.noisiestZone.db} dB`
              : '—',
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [0, 77, 64] },
        styles: { font: 'helvetica' },
      })
    }

    // doc.output('blob') en lugar de doc.save() para tener el binario en
    // memoria: lo bajamos manualmente y, si corresponde, lo subimos al bucket.
    const blob = doc.output('blob')
    const nombre = `heatmap_${nowStamp()}.pdf`
    downloadBlob(blob, nombre)
    toast.success('PDF exportado')
    await guardarEnBucket(blob, nombre, 'pdf')
  } catch (e) {
    toast.error('Error al exportar PDF', e instanceof Error ? e.message : undefined)
  } finally {
    exporting.value = null
  }
}
</script>

<template>
  <div class="exp">
    <div class="exp__buttons">
      <BaseButton
        variant="secondary"
        size="sm"
        :loading="exporting === 'png'"
        :disabled="exporting !== null"
        @click="exportPng"
      >
        ↓ PNG
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        :loading="exporting === 'pdf'"
        :disabled="exporting !== null"
        @click="exportPdf"
      >
        ↓ PDF
      </BaseButton>
    </div>

    <label v-if="esAdmin" class="exp__flag">
      <input
        type="checkbox"
        v-model="guardarEnPanel"
        :disabled="exporting !== null"
      />
      <span>Guardar copia en el panel admin</span>
    </label>
  </div>
</template>

<style scoped>
.exp {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.exp__buttons {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.exp__flag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}
.exp__flag input {
  cursor: pointer;
}
</style>
