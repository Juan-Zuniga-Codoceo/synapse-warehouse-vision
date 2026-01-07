<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="product-details-modal">
        <div class="modal-header">
          <h3>📋 Detalle del Producto</h3>
          <button class="close-btn" @click="close" title="Cerrar">×</button>
        </div>
        
        <div v-if="product" class="product-content">
          <div class="info-section main-info">
            <div class="info-row">
              <label>Producto</label>
              <div class="value highlight">{{ product.product_name }}</div>
            </div>
            <div class="info-row">
              <label>SKU</label>
              <div class="value">{{ product.sku }}</div>
            </div>
          </div>

          <div class="info-section location-info">
            <h4>📍 Ubicación</h4>
            <div class="location-badge">
              {{ product.location?.zona }} - {{ product.location?.pasillo }} - {{ product.location?.rack }} - N{{ product.location?.nivel }} - P{{ product.location?.posicion }}
            </div>
          </div>

          <div class="info-section details-grid">
            <div class="info-item">
              <label>Fecha de Ingreso</label>
              <div class="value">{{ formatDate(product.arrival_date) }}</div>
            </div>
            <div class="info-item">
              <label>Fecha de Vencimiento</label>
              <div class="value" :class="getExpirationClass(product)">
                {{ formatDate(product.expiration_date) || 'No aplica' }}
              </div>
            </div>
            <div class="info-item">
              <label>Factura / Lote</label>
              <div class="value">{{ product.invoice_number || 'No registrado' }}</div>
            </div>
            <div class="info-item">
              <label>Estado</label>
              <div class="value status-badge" :class="product.alert_status">
                {{ getStatusLabel(product.alert_status) }}
              </div>
            </div>
          </div>

          <div v-if="otherLocations.length > 0" class="info-section other-locations">
            <h4>📦 Otras Ubicaciones ({{ otherLocations.length }})</h4>
            <div class="locations-list">
              <div v-for="loc in otherLocations" :key="loc.id" class="other-location-item">
                <span class="loc-badge">{{ loc.zona }}-{{ loc.pasillo }}-{{ loc.rack }}</span>
                <span class="loc-details">Nivel {{ loc.nivel }} - Pos {{ loc.posicion }}</span>
                <span class="loc-expiry" :class="getExpirationClass(loc)">
                  {{ loc.alert_status === 'EXPIRED' ? 'VENCIDO' : loc.alert_status === 'EXPIRING_SOON' ? 'POR VENCER' : 'OK' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="primary" @click="close">Cerrar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { onMounted, watch, ref } from 'vue'

export default {
  name: 'ProductDetailsModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    product: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const otherLocations = ref([])

    const fetchOtherLocations = async () => {
      if (!props.product || !props.product.sku) return
      
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/locations/search/${props.product.sku}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          // Filter out current location
          otherLocations.value = data.data.filter(l => l.id !== props.product.location_id)
        }
      } catch (error) {
        console.error('Error fetching other locations:', error)
      }
    }

    onMounted(() => {
      console.log('ProductDetailsModal mounted')
    })

    watch(() => props.isOpen, (val) => {
      if (val) {
        fetchOtherLocations()
      } else {
        otherLocations.value = []
      }
    })

    const close = () => {
      emit('close')
    }

    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const getExpirationClass = (product) => {
      if (!product.expiration_date) return ''
      if (product.alert_status === 'EXPIRED') return 'text-danger'
      if (product.alert_status === 'EXPIRING_SOON') return 'text-warning'
      return 'text-success'
    }

    const getStatusLabel = (status) => {
      const labels = {
        'EXPIRED': 'VENCIDO',
        'EXPIRING_SOON': 'POR VENCER',
        'NORMAL': 'OK',
        'NO_EXPIRATION': 'SIN VENCIMIENTO',
        'EMPTY': 'VACÍO'
      }
      return labels[status] || status
    }

    return {
      close,
      formatDate,
      getExpirationClass,
      getStatusLabel,
      otherLocations
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

.product-details-modal {
  background: var(--bg-card);
  border: 2px solid var(--primary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
  position: relative;
}

.modal-header h3 {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
  transform: rotate(90deg);
}

.info-section {
  margin-bottom: 1.5rem;
}

.info-row {
  margin-bottom: 1rem;
}

.info-row label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.value {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.value.highlight {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
}

.location-info h4 {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.location-badge {
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid var(--primary);
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 1.1rem;
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.info-item label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-success { color: var(--success); }

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-badge.EXPIRED { background: rgba(245, 101, 101, 0.2); color: var(--danger); }
.status-badge.EXPIRING_SOON { background: rgba(237, 137, 54, 0.2); color: var(--warning); }
.status-badge.NORMAL { background: rgba(72, 187, 120, 0.2); color: var(--success); }

.modal-actions {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  background: var(--primary);
  color: white;
  transition: all 0.2s;
}

.modal-actions button:hover {
  background: var(--primary-light);
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.other-locations h4 {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.locations-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
}

.other-location-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
}

.loc-badge {
  font-family: 'Monaco', monospace;
  font-weight: 700;
  color: var(--primary);
  background: rgba(4, 157, 217, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.loc-details {
  flex: 1;
  color: var(--text-secondary);
}

.loc-expiry {
  font-size: 0.75rem;
  font-weight: 700;
}
</style>
