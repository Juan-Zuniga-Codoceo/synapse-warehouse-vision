<template>
  <Teleport to="body">
    <div v-if="isOpen" class="elevation-overlay" @click.self="close">
    <div class="elevation-panel">
      <!-- Header -->
      <div class="elevation-header">
        <div>
          <h2>{{ rackData.zona }}-{{ rackData.pasillo }}-{{ rackData.rack }}</h2>
          <p class="occupancy-info">
            {{ rackData.occupied }}/{{ rackData.total }} ubicaciones ocupadas
            ({{ Math.round(rackData.occupancyRate * 100) }}%)
          </p>
        </div>
        <button class="close-btn" @click="close">✕</button>
      </div>
      
      <!-- Rack Grid -->
      <div class="rack-grid-container">
        <div 
          class="rack-grid"
          :style="gridStyle"
        >
          <div
            v-for="cell in gridCells"
            :key="cell.id"
            :class="[
              'grid-cell',
              cell.items.length > 0 ? 'occupied' : 'empty',
              { 
                'highlighted': isHighlighted(cell),
                'clickable': true 
              }
            ]"
            @click="handleCellClick(cell)"
          >
            <!-- Level label (left side) -->
            <div v-if="cell.posicion === 1" class="level-label">
              N{{ cell.nivel }}
            </div>
            
            <!-- Position label (top) -->
            <div v-if="cell.nivel === maxLevel" class="position-label">
              P{{ cell.posicion }}
            </div>
            
            <!-- Cell content -->
            <div class="cell-content">
              <!-- Items List -->
              <div v-if="cell.items.length > 0" class="items-list">
                <div 
                  v-for="item in cell.items" 
                  :key="item.id" 
                  class="item-entry clickable"
                  @click.stop="handleProductClick(item)"
                >
                  <button 
                    class="delete-icon"
                    @click.stop="handleRemoveSKU({ ...item.location, inventory_id: item.id })"
                    title="Eliminar"
                  >×</button>
                  <div class="item-info">
                    <div class="product-name" :title="item.product_name">
                      {{ item.product_name || 'SIN NOMBRE' }}
                    </div>
                    <div class="sku-code">SKU: {{ item.sku }}</div>
                  </div>
                </div>
                
                <!-- Add Button (Small) -->
                <button class="add-mini-btn" @click.stop="handleCellClick(cell)" title="Agregar otro producto">
                  +
                </button>
              </div>
              
              <!-- Empty State -->
              <div v-else class="empty-state">
                <span class="empty-text">VACÍO</span>
                <span class="add-hint">+</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer info -->
      <div class="elevation-footer">
        <div class="info-item">
          <span class="label">Zona:</span>
          <span class="value">{{ rackData.zona }}</span>
        </div>
        <div class="info-item">
          <span class="label">Pasillo:</span>
          <span class="value">{{ rackData.pasillo }}</span>
        </div>
        <div class="info-item">
          <span class="label">Rack:</span>
          <span class="value">{{ rackData.rack }}</span>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'RackElevation',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    rackData: {
      type: Object,
      default: () => ({
        zona: '',
        pasillo: '',
        rack: '',
        locations: [],
        occupied: 0,
        total: 0,
        occupancyRate: 0,
        searchedLocation: null
      })
    }
  },
  emits: ['close', 'cell-click', 'remove-sku', 'product-click'],
  setup(props, { emit }) {
    // Calculate grid dimensions
    const maxLevel = computed(() => {
      if (!props.rackData.locations.length) return 4
      return Math.max(...props.rackData.locations.map(loc => loc.nivel))
    })
    
    const maxPosition = computed(() => {
      if (!props.rackData.locations.length) return 3
      return Math.max(...props.rackData.locations.map(loc => loc.posicion))
    })
    
    // Create grid cells (organized by level and position)
    const gridCells = computed(() => {
      const cells = []
      
      // Create grid from top level to bottom (reversed for visual display)
      for (let nivel = maxLevel.value; nivel >= 1; nivel--) {
        for (let posicion = 1; posicion <= maxPosition.value; posicion++) {
          // Find ALL locations/items for this cell
          const cellLocations = props.rackData.locations.filter(
            loc => loc.nivel === nivel && loc.posicion === posicion
          )
          
          if (cellLocations.length > 0 && cellLocations.some(l => l.inventory_id)) {
            console.log(`RackElevation Debug - Cell ${nivel}-${posicion} locations:`, cellLocations)
          }

          const items = cellLocations
            .filter(loc => loc.inventory_id)
            .map(loc => {
              console.log(`Mapping item: ID=${loc.inventory_id}, Name="${loc.product_name}", SKU=${loc.sku}`)
              return {
                id: loc.inventory_id,
                product_name: loc.product_name,
                sku: loc.sku,
                arrival_date: loc.arrival_date,
                expiration_date: loc.expiration_date,
                invoice_number: loc.invoice_number,
                alert_status: loc.alert_status,
                alert_threshold_days: loc.alert_threshold_days,
                location: loc
              }
            })
            
          // Use the first location found as the base for the cell (coordinates etc)
          // If no location found (shouldn't happen if data is correct), use placeholder
          const baseLocation = cellLocations[0] || null
          
          cells.push({
            id: baseLocation?.id || `${nivel}-${posicion}`,
            nivel,
            posicion,
            items: items, // Array of items
            location: baseLocation
          })
        }
      }
      
      return cells
    })
    
    // Grid CSS style
    const gridStyle = computed(() => ({
      gridTemplateColumns: `repeat(${maxPosition.value}, 1fr)`,
      gridTemplateRows: `repeat(${maxLevel.value}, 1fr)`
    }))
    
    // Check if cell should be highlighted (from search)
    const isHighlighted = (cell) => {
      if (!props.rackData.searchedLocation) return false
      const searched = props.rackData.searchedLocation
      return cell.nivel === searched.nivel && cell.posicion === searched.posicion
    }
    
    // Handle cell click (add item)
    const handleCellClick = (cell) => {
      if (cell.location) {
        emit('cell-click', cell.location)
      }
    }
    
    // Handle product click
    const handleProductClick = (item) => {
      emit('product-click', {
        ...item,
        location: item.location
      })
    }

    // Handle remove SKU
    const handleRemoveSKU = (location) => {
      console.log('RackElevation Debug - Removing SKU:', location)
      emit('remove-sku', location)
    }
    
    // Close panel
    const close = () => {
      emit('close')
    }
    
    // Auto-scroll to highlighted cell when opened
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen && props.rackData.searchedLocation) {
        // Small delay to ensure DOM is rendered
        setTimeout(() => {
          const highlighted = document.querySelector('.grid-cell.highlighted')
          if (highlighted) {
            highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    })
    
    return {
      maxLevel,
      maxPosition,
      gridCells,
      gridStyle,
      isHighlighted,
      handleCellClick,
      handleCellClick,
      handleProductClick,
      handleRemoveSKU,
      close
    }
  }
}
</script>

<style scoped>
.elevation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.elevation-panel {
  background: #ffffff;
  border: 2px solid var(--primary);
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

/* Header */
.elevation-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.elevation-header h2 {
  color: var(--primary);
  font-size: 1.5rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.occupancy-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 1.5rem;
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

/* Grid Container */
.rack-grid-container {
  flex: 1;
  padding: 2rem;
  overflow: auto;
}

.rack-grid {
  display: grid;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

/* Grid Cell */
.grid-cell {
  position: relative;
  aspect-ratio: 1.2;
  background: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  min-height: 80px;
}

.grid-cell.empty {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.grid-cell.occupied {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}



.grid-cell.clickable:hover {
  border-color: var(--primary);
  background: var(--bg-hover);
  cursor: pointer;
  transform: scale(1.05);
}

.grid-cell.highlighted {
  border-color: var(--primary);
  border-width: 3px;
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(4, 157, 217, 0.5);
}

/* Labels */
.level-label {
  position: absolute;
  left: -35px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--primary);
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.position-label {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--primary);
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

/* Cell Content */
.cell-content {
  width: 100%;
  height: 100%;
  padding: 4px;
  overflow: hidden;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-right: 2px;
}

.item-entry {
  background: #ffffff;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  position: relative;
  transition: all 0.2s;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.item-entry:not(:last-child) {
  margin-bottom: 8px;
}

.item-entry.clickable:hover {
  background: #f8fafc;
  border-color: var(--primary);
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9rem;
  line-height: 1.2;
}

.sku-code {
  color: #64748b;
  font-size: 0.8rem;
  font-family: monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  align-self: flex-start;
}

.delete-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  padding: 0;
  background: rgba(220, 38, 38, 0.9);
  border: none;
  border-radius: 3px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: all 0.2s;
  z-index: 10;
}

.delete-icon:hover {
  opacity: 1;
  background: rgba(220, 38, 38, 1);
  transform: scale(1.1);
}

.add-mini-btn {
  width: 100%;
  padding: 2px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px dashed var(--text-secondary);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: auto;
}

.add-mini-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-secondary);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.grid-cell:hover .empty-state {
  opacity: 1;
  color: var(--primary);
}

.empty-text {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
}

.add-hint {
  font-size: 1.5rem;
  font-weight: 300;
  line-height: 1;
}

/* Footer */
.elevation-footer {
  padding: 1rem 2rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 2rem;
  background: var(--bg-dark);
  border-radius: 0 0 10px 10px;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.info-item .label {
  color: var(--text-secondary);
  font-weight: 600;
}

.info-item .value {
  color: var(--primary);
  font-weight: 700;
}

/* Responsive */
@media (max-width: 768px) {
  .elevation-panel {
    width: 95%;
    max-height: 95vh;
  }
  
  .rack-grid {
    gap: 8px;
  }
  
  .grid-cell {
    min-height: 60px;
  }
  
  .level-label,
  .position-label {
    font-size: 0.75rem;
  }
}
</style>
