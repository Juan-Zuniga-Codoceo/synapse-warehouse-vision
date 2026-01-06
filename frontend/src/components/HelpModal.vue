<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal help-modal">
      <div class="modal-header">
        <h3>Ayuda y Documentación</h3>
        <button class="close-btn" @click="close" title="Cerrar">×</button>
      </div>
      
      <div class="modal-content">
        <div class="tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="['tab-btn', { active: currentTab === tab.id }]"
            @click="currentTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- General Info -->
          <div v-if="currentTab === 'general'" class="info-section">
            <h4>Warehouse Vision</h4>
            <p>Sistema integral de gestión visual de bodegas. Permite administrar inventario, visualizar ocupación en tiempo real y gestionar alertas de vencimiento.</p>
            
            <div class="feature-list">
              <div class="feature-item">
                <span class="icon">🗺️</span>
                <div>
                  <strong>Mapa Interactivo</strong>
                  <p>Visualice la distribución de su bodega y el estado de cada rack.</p>
                </div>
              </div>
              <div class="feature-item">
                <span class="icon">📦</span>
                <div>
                  <strong>Gestión de Inventario</strong>
                  <p>Registre productos, asigne ubicaciones y controle fechas de vencimiento.</p>
                </div>
              </div>
              <div class="feature-item">
                <span class="icon">⚠️</span>
                <div>
                  <strong>Alertas Inteligentes</strong>
                  <p>Notificaciones automáticas para productos próximos a vencer.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div v-if="currentTab === 'legend'" class="legend-section">
            <h4>Simbología del Mapa</h4>
            <div class="legend-grid">
              <div class="legend-row">
                <div class="color-box empty"></div>
                <div>
                  <strong>Disponible</strong>
                  <p>Ubicación vacía, lista para asignar productos.</p>
                </div>
              </div>
              <div class="legend-row">
                <div class="color-box occupied"></div>
                <div>
                  <strong>Ocupado</strong>
                  <p>Ubicación con productos almacenados.</p>
                </div>
              </div>
              <div class="legend-row">
                <div class="color-box highlight"></div>
                <div>
                  <strong>Seleccionado</strong>
                  <p>Ubicación actualmente seleccionada o encontrada en búsqueda.</p>
                </div>
              </div>
            </div>

            <h4 class="mt-4">Alertas de Vencimiento</h4>
            <div class="legend-grid">
              <div class="legend-row">
                <div class="status-badge normal">Normal</div>
                <p>Producto con fecha de vencimiento lejana.</p>
              </div>
              <div class="legend-row">
                <div class="status-badge warning">Por Vencer</div>
                <p>Producto próximo a vencer (según configuración).</p>
              </div>
              <div class="legend-row">
                <div class="status-badge critical">Vencido</div>
                <p>Producto con fecha de vencimiento expirada.</p>
              </div>
            </div>
          </div>

          <!-- Shortcuts & Scanning -->
          <div v-if="currentTab === 'shortcuts'" class="shortcuts-section">
            <h4>Escaneo de Códigos de Barras</h4>
            <div class="scan-instruction">
              <div class="scan-icon">🔫</div>
              <div class="scan-text">
                <p>El sistema es compatible con lectores de código de barras USB/Bluetooth.</p>
                <p>Simplemente <strong>escanee un código</strong> en cualquier momento para buscar el producto automáticamente en el mapa.</p>
              </div>
            </div>

            <h4 class="mt-4">Atajos de Teclado</h4>
            <div class="shortcuts-list">
              <div class="shortcut-item">
                <kbd>Esc</kbd>
                <span>Cerrar modales / Cancelar selección</span>
              </div>
              <div class="shortcut-item">
                <kbd>Enter</kbd>
                <span>Confirmar búsqueda / Guardar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'HelpModal',
  props: {
    isOpen: Boolean
  },
  emits: ['close'],
  setup(props, { emit }) {
    const currentTab = ref('general')
    const tabs = [
      { id: 'general', label: 'General' },
      { id: 'legend', label: 'Simbología' },
      { id: 'shortcuts', label: 'Escaneo y Atajos' }
    ]

    const close = () => {
      emit('close')
    }

    return {
      currentTab,
      tabs,
      close
    }
  }
}
</script>

<style scoped>
.help-modal {
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.75rem 0;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--primary);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Content Sections */
.info-section h4, .legend-section h4, .shortcuts-section h4 {
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.feature-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.feature-item .icon {
  font-size: 1.5rem;
}

/* Legend */
.legend-grid {
  display: grid;
  gap: 1rem;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-box {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.color-box.empty { background: #f1f5f9; border-color: #94a3b8; }
.color-box.occupied { background: #d1fae5; border-color: #10b981; }
.color-box.highlight { background: #dbeafe; border-color: var(--primary); }

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.status-badge.normal { background: #d1fae5; color: #065f46; }
.status-badge.warning { background: #ffedd5; color: #9a3412; }
.status-badge.critical { background: #fee2e2; color: #991b1b; }

/* Shortcuts */
.scan-instruction {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.scan-icon {
  font-size: 2.5rem;
}

.shortcuts-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

kbd {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  box-shadow: 0 2px 0 #cbd5e1;
}

.mt-4 { margin-top: 1.5rem; }

/* Modal Header & Close Button */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.close-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
  padding: 0;
}

.close-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}
</style>
