<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="close">
      <div class="modal product-modal">
        <h3>📦 Registrar Insumo Médico</h3>
        <p class="location-info">
          Ubicación: {{ location?.zona }}-{{ location?.pasillo }}-{{ location?.rack }}-{{ location?.nivel }}-{{ location?.posicion }}
        </p>
        
        <form @submit.prevent="handleSubmit">
          <!-- Product Name -->
          <div class="input-group relative">
            <label>Nombre del Producto *</label>
            <input 
              :value="form.product_name"
              @input="handleSearch"
              @blur="closeSearch"
              type="text" 
              placeholder="Ej: Guantes Nitrilo Talla M"
              required
              ref="firstInput"
              autocomplete="off"
            />
            
            <!-- Search Results Dropdown -->
            <div v-if="showSearchResults" class="search-results">
              <div 
                v-for="(result, index) in searchResults" 
                :key="index"
                class="search-item"
                @mousedown="selectProduct(result)"
              >
                <div class="item-name">{{ result.product_name }}</div>
                <div class="item-sku">{{ result.sku }}</div>
              </div>
            </div>
          </div>
          
          <!-- SKU -->
          <div class="input-group">
            <label>SKU / Código *</label>
            <input 
              v-model="form.sku" 
              type="text" 
              placeholder="Ej: MED-GLV-M-001"
              required
            />
          </div>
          
          <!-- Invoice Number -->
          <div class="input-group">
            <label>Número de Factura / Lote</label>
            <input 
              v-model="form.invoice_number" 
              type="text" 
              placeholder="Ej: FAC-2026-0001 o LOTE-2026-A"
            />
          </div>
          
          <!-- Dates Row -->
          <div class="date-row">
            <div class="input-group">
              <label>Fecha de Ingreso *</label>
              <input 
                v-model="form.arrival_date" 
                type="date" 
                :max="today"
                required
              />
            </div>
            
            <div class="input-group">
              <label>Fecha de Vencimiento</label>
              <input 
                v-model="form.expiration_date" 
                type="date" 
                :min="form.arrival_date || today"
              />
            </div>
          </div>
          
          <!-- Alert Threshold -->
          <div class="input-group">
            <label>Alerta de Vencimiento</label>
            <div class="threshold-options">
              <button 
                type="button"
                v-for="option in thresholdOptions" 
                :key="option.value"
                :class="['threshold-btn', { active: form.alert_threshold_days === option.value }]"
                @click="selectThreshold(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <div class="custom-threshold" v-if="showCustomThreshold">
              <label>Días personalizados</label>
              <input 
                v-model.number="customDays" 
                type="number" 
                min="1"
                placeholder="Ingrese días"
                @input="form.alert_threshold_days = customDays"
              />
            </div>
          </div>
          
          <!-- Validation Error -->
          <div v-if="validationError" class="error-message">
            {{ validationError }}
          </div>
          
          <!-- Actions -->
          <div class="modal-actions">
            <button type="button" class="secondary" @click="close">Cancelar</button>
            <button type="submit" :disabled="!isValid">Registrar Insumo</button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'

export default {
  name: 'ProductRegistrationModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    location: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'submit'],
  setup(props, { emit }) {
    const firstInput = ref(null)
    const today = new Date().toISOString().split('T')[0]
    
    const form = ref({
      product_name: '',
      sku: '',
      invoice_number: '',
      arrival_date: today,
      expiration_date: '',
      alert_threshold_days: 180
    })
    
    const customDays = ref(null)
    const searchResults = ref([])
    const showSearchResults = ref(false)
    const isSearching = ref(false)
    let searchTimeout = null

    const handleSearch = async (event) => {
      const query = event.target.value
      form.value.product_name = query
      
      if (query.length < 2) {
        searchResults.value = []
        showSearchResults.value = false
        return
      }

      if (searchTimeout) clearTimeout(searchTimeout)

      searchTimeout = setTimeout(async () => {
        isSearching.value = true
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/inventory/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const data = await response.json()
          if (data.success) {
            searchResults.value = data.data
            showSearchResults.value = data.data.length > 0
          }
        } catch (error) {
          console.error('Search error:', error)
        } finally {
          isSearching.value = false
        }
      }, 300)
    }

    const selectProduct = (product) => {
      form.value.product_name = product.product_name
      form.value.sku = product.sku
      form.value.alert_threshold_days = product.alert_threshold_days
      
      // Update custom threshold if needed
      if (!thresholdOptions.slice(0, 3).some(opt => opt.value === product.alert_threshold_days)) {
        customDays.value = product.alert_threshold_days
      } else {
        customDays.value = null
      }
      
      showSearchResults.value = false
    }

    const closeSearch = () => {
      setTimeout(() => {
        showSearchResults.value = false
      }, 200)
    }
    
    // Medical-grade alert thresholds
    const thresholdOptions = [
      { label: '6 Meses', value: 180 },
      { label: '1 Año', value: 365 },
      { label: '2 Años', value: 730 },
      { label: 'Personalizado', value: null }
    ]
    
    const showCustomThreshold = computed(() => {
      return !thresholdOptions.slice(0, 3).some(opt => opt.value === form.value.alert_threshold_days)
    })
    
    const validationError = ref('')
    
    const isValid = computed(() => {
      if (!form.value.product_name || !form.value.sku || !form.value.arrival_date) {
        return false
      }
      
      if (form.value.expiration_date && form.value.arrival_date) {
        if (new Date(form.value.expiration_date) <= new Date(form.value.arrival_date)) {
          validationError.value = 'La fecha de vencimiento debe ser posterior a la fecha de ingreso'
          return false
        }
      }
      
      validationError.value = ''
      return true
    })
    
    const selectThreshold = (value) => {
      if (value === null) {
        // Personalizado
        customDays.value = form.value.alert_threshold_days || 180
      } else {
        form.value.alert_threshold_days = value
        customDays.value = null
      }
    }
    
    const handleSubmit = () => {
      if (!isValid.value) return
      
      const data = {
        location_id: props.location.id,
        ...form.value,
        expiration_date: form.value.expiration_date || null,
        invoice_number: form.value.invoice_number || null
      }
      
      emit('submit', data)
    }
    
    const close = () => {
      emit('close')
    }
    
    const resetForm = () => {
      form.value = {
        product_name: '',
        sku: '',
        invoice_number: '',
        arrival_date: today,
        expiration_date: '',
        alert_threshold_days: 180
      }
      customDays.value = null
      validationError.value = ''
    }
    
    // Reset form when modal opens
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        resetForm()
        nextTick(() => {
          if (firstInput.value) {
            firstInput.value.focus()
          }
        })
      }
    })
    
    return {
      firstInput,
      today,
      form,
      customDays,
      thresholdOptions,
      showCustomThreshold,
      validationError,
      isValid,
      selectThreshold,
      handleSubmit,
      close,
      searchResults,
      showSearchResults,
      handleSearch,
      selectProduct,
      closeSearch
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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.product-modal {
  background: var(--bg-card);
  border: 2px solid var(--primary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.product-modal h3 {
  color: var(--primary);
  margin-bottom: 1rem;
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.location-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: var(--bg-dark);
  border-radius: 4px;
  border-left: 3px solid var(--primary);
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.input-group input,
.input-group select {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(4, 157, 217, 0.1);
}

.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.threshold-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.threshold-btn {
  padding: 0.5rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.threshold-btn:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
}

.threshold-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  font-weight: 600;
}

.custom-threshold {
  margin-top: 0.75rem;
}

.custom-threshold label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.custom-threshold input {
  width: 100%;
}

.error-message {
  padding: 0.75rem;
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid var(--danger);
  border-radius: 4px;
  color: var(--danger);
  font-size: 0.85rem;
  margin-top: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-actions button:not(.secondary) {
  background: var(--primary);
  color: white;
}

.modal-actions button:not(.secondary):hover {
  background: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(4, 157, 217, 0.3);
}

.modal-actions button.secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-actions button.secondary:hover {
  background: var(--border);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:disabled:hover {
  transform: none;
  box-shadow: none;
}

input[type="date"] {
  cursor: pointer;
}

@media (max-width: 768px) {
  .date-row {
    grid-template-columns: 1fr;
  }
  
  .threshold-options {
    grid-template-columns: repeat(2, 1fr);
  }
}

.relative {
  position: relative;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--primary);
  border-radius: 0 0 4px 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.search-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:hover {
  background: var(--bg-hover);
}

.item-name {
  font-weight: 600;
  color: var(--text-primary);
}

.item-sku {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>

