<template>
  <Teleport to="body">
    <div v-if="isOpen" class="setup-overlay" @click.self="close">
      <div class="setup-panel">
        <div class="setup-header">
          <h2>⚙️ Configuración de Bodega</h2>
          <button class="close-btn" @click="close">✕</button>
        </div>
        
        <div class="setup-content">
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <p>Esta herramienta generará una nueva estructura de bodega. Todos los datos actuales serán eliminados.</p>
          </div>
          
          <form @submit.prevent="handleSubmit">
            <!-- Zone Name -->
            <div class="input-group">
              <label>Nombre de la Zona *</label>
              <input 
                v-model="config.zoneName" 
                type="text" 
                placeholder="Ej: Bodega Farmacia"
                required
              />
            </div>
            
            <!-- Aisles -->
            <div class="input-group">
              <label>Cantidad de Pasillos *</label>
              <input 
                v-model.number="config.aisles" 
                type="number" 
                min="1"
                max="20"
                required
              />
              <small>Número de pasillos paralelos</small>
            </div>

            <!-- Aisle Naming Strategy -->
            <div class="input-group">
              <label>Tipo de Nombres de Pasillo *</label>
              <select v-model="config.aisleNaming" required>
                <option value="numeric">Numérico (A01, A02...)</option>
                <option value="alpha">Alfabético (A, B, C...)</option>
              </select>
              <small>Formato de las etiquetas de los pasillos</small>
            </div>
            
            <!-- Racks per Aisle -->
            <div class="input-group">
              <label>Racks por Pasillo (cada lado) *</label>
              <input 
                v-model.number="config.racksPerAisle" 
                type="number" 
                min="1"
                max="50"
                required
              />
              <small>Racks enfrentados a cada lado del pasillo</small>
            </div>
            
            <!-- Levels per Rack -->
            <div class="input-group">
              <label>Niveles por Rack *</label>
              <input 
                v-model.number="config.levelsPerRack" 
                type="number" 
                min="1"
                max="10"
                required
              />
              <small>Altura del rack (niveles verticales)</small>
            </div>
            
            <!-- Positions per Level -->
            <div class="input-group">
              <label>Posiciones por Nivel *</label>
              <input 
                v-model.number="config.positionsPerLevel" 
                type="number" 
                min="1"
                max="20"
                required
              />
              <small>Espacios horizontales por nivel</small>
            </div>
            
            <!-- Summary -->
            <div class="summary-box">
              <h3>Resumen de Configuración</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Total Pasillos:</span>
                  <span class="summary-value">{{ config.aisles }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Total Racks:</span>
                  <span class="summary-value">{{ totalRacks }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Total Ubicaciones:</span>
                  <span class="summary-value">{{ totalLocations }}</span>
                </div>
              </div>
            </div>
            
            <!-- Loading Indicator -->
            <div v-if="loading" class="loading-indicator">
              <div class="spinner"></div>
              <p>Generando estructura de bodega...</p>
              <p class="loading-detail">Esto puede tomar unos segundos. Por favor espere.</p>
            </div>
            
            <!-- Actions -->
            <div class="setup-actions" v-if="!loading">
              <button type="button" class="secondary" @click="close">Cancelar</button>
              <button type="submit" :disabled="loading">
                Generar Estructura de Bodega
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed } from 'vue'
import axios from 'axios'

export default {
  name: 'WarehouseSetup',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'success'],
  setup(props, { emit }) {
    const loading = ref(false)
    
    const config = ref({
      zoneName: 'Bodega Principal',
      aisles: 3,
      racksPerAisle: 5,
      levelsPerRack: 4,
      racksPerAisle: 5,
      levelsPerRack: 4,
      positionsPerLevel: 3,
      aisleNaming: 'numeric'
    })
    
    const totalRacks = computed(() => {
      return config.value.aisles * config.value.racksPerAisle * 2 // 2 sides per aisle
    })
    
    const totalLocations = computed(() => {
      return totalRacks.value * config.value.levelsPerRack * config.value.positionsPerLevel
    })
    
    const handleSubmit = async () => {
      const confirmed = confirm(
        `⚠️ ADVERTENCIA\n\n` +
        `Esta acción borrará todas las ubicaciones e inventario actuales.\n\n` +
        `Se generarán ${totalLocations.value} nuevas ubicaciones vacías.\n\n` +
        `¿Deseas continuar?`
      )
      
      if (!confirmed) return
      
      await performInitialization(false)
    }
    
    const performInitialization = async (forceReset) => {
      loading.value = true
      
      try {
        await axios.post('/api/setup/initialize', {
          zone_name: config.value.zoneName,
          aisles: config.value.aisles,
          racks_per_aisle: config.value.racksPerAisle,
          levels_per_rack: config.value.levelsPerRack,
          levels_per_rack: config.value.levelsPerRack,
          positions_per_level: config.value.positionsPerLevel,
          aisle_naming: config.value.aisleNaming,
          force_reset: forceReset
        })
        
        alert(`✅ Estructura generada exitosamente!\n\n${totalLocations.value} ubicaciones creadas.`)
        emit('success')
        close()
      } catch (error) {
        console.error('Error generating warehouse structure:', error)
        
        // Check if error is due to existing inventory
        if (error.response?.data?.requiresForceReset) {
          const inventoryCount = error.response.data.inventoryCount
          
          // Show critical confirmation dialog
          const criticalConfirm = confirm(
            `🚨 ¡PELIGRO! 🚨\n\n` +
            `La bodega contiene ${inventoryCount} producto(s) registrado(s).\n\n` +
            `⚠️ ESTA ACCIÓN ES IRREVERSIBLE ⚠️\n\n` +
            `Se eliminará TODO el inventario y la estructura actual.\n\n` +
            `¿REALMENTE desea borrar todo el inventario y reconfigurar la bodega?`
          )
          
          if (criticalConfirm) {
            // Retry with force_reset flag
            await performInitialization(true)
          }
        } else {
          alert('❌ Error al generar estructura: ' + (error.response?.data?.error || error.message))
        }
      } finally {
        loading.value = false
      }
    }
    
    const close = () => {
      emit('close')
    }
    
    return {
      loading,
      config,
      totalRacks,
      totalLocations,
      handleSubmit,
      close
    }
  }
}
</script>

<style scoped>
.setup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.setup-panel {
  background: var(--bg-card);
  border: 2px solid var(--primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
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

.setup-header {
  padding: 1.5rem 2rem;
  border-bottom: 2px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-dark);
}

.setup-header h2 {
  color: var(--primary);
  font-size: 1.25rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--danger);
  border-color: var(--danger);
  transform: rotate(90deg);
}

.setup-content {
  padding: 2rem;
}

.warning-box {
  background: rgba(237, 137, 54, 0.1);
  border: 2px solid #ed8936;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-box p {
  color: #ed8936;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-group label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.input-group input {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;
}

.input-group select {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s;
  cursor: pointer;
}

.input-group input:focus,
.input-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(4, 157, 217, 0.1);
}

.input-group small {
  display: block;
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-top: 0.25rem;
  font-style: italic;
}

.summary-box {
  background: var(--bg-dark);
  border: 1px solid var(--primary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.summary-box h3 {
  color: var(--primary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 1rem 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.summary-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.setup-actions {
  display: flex;
  gap: 1rem;
}

.setup-actions button {
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

.setup-actions button:not(.secondary) {
  background: var(--primary);
  color: white;
}

.setup-actions button:not(.secondary):hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(4, 157, 217, 0.3);
}

.setup-actions button.secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.setup-actions button.secondary:hover {
  background: var(--border);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  background: var(--bg-dark);
  border-radius: 8px;
  margin-top: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-indicator p {
  color: var(--primary);
  font-weight: 600;
  margin: 0.5rem 0;
}

.loading-detail {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
