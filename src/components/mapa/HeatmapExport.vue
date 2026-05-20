<script setup lang="ts">
import { ref } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import BaseButton from '@/components/common/BaseButton.vue'
import { useToast } from '@/composables/useToast'
import type { HeatmapPoint, HeatmapKpis } from '@/types/kpi'

const props = defineProps<{
  /** Elemento DOM del mapa para exportar a PNG */
  mapElement: HTMLElement | null
  points: HeatmapPoint[]
  kpis: HeatmapKpis | null
}>()

const toast = useToast()
const exporting = ref<'png' | 'csv' | 'pdf' | null>(null)

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
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('blob null')
      downloadBlob(blob, `heatmap_${nowStamp()}.png`)
      toast.success('Imagen exportada')
    })
  } catch (e) {
    toast.error('Error al exportar PNG', e instanceof Error ? e.message : undefined)
  } finally {
    exporting.value = null
  }
}

function exportCsv() {
  exporting.value = 'csv'
  try {
    const header = 'lat,lng,db,zone\n'
    const rows = props.points
      .map((p) => `${p.lat},${p.lng},${p.db},"${p.zone.replace(/"/g, '""')}"`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `heatmap_${nowStamp()}.csv`)
    toast.success('CSV exportado', `${props.points.length} puntos`)
  } catch (e) {
    toast.error('Error al exportar CSV', e instanceof Error ? e.message : undefined)
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

    doc.save(`heatmap_${nowStamp()}.pdf`)
    toast.success('PDF exportado')
  } catch (e) {
    toast.error('Error al exportar PDF', e instanceof Error ? e.message : undefined)
  } finally {
    exporting.value = null
  }
}
</script>

<template>
  <div class="exp">
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
      :loading="exporting === 'csv'"
      :disabled="exporting !== null"
      @click="exportCsv"
    >
      ↓ CSV
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
</template>

<style scoped>
.exp {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
</style>
