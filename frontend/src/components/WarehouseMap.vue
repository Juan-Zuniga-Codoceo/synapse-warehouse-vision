<template>
  <div class="warehouse-map-container">
    <svg 
      :viewBox="viewBox"
      class="warehouse-svg"
      @click="handleBackgroundClick"
    >
      <!-- Grid background -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(45, 55, 72, 0.3)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grid)" />
      
      <!-- Zones Layer -->
      <g v-for="zone in zones" :key="zone.name">
        <!-- Zone label -->
        <text 
          :x="zone.x + zone.width / 2" 
          :y="zone.y - 10" 
          class="zone-label"
          text-anchor="middle"
        >
          {{ zone.name }}
        </text>
        
        <!-- Zone border -->
        <rect 
          :x="zone.x"
          :y="zone.y"
          :width="zone.width" 
          :height="zone.height"
          class="zone-border"
          fill="none"
        />
      </g>
        
      <!-- Racks Layer (Direct Render) -->
      <!-- Removing <g transform> to avoid potential SVG issues -->
      <g>
        <template v-for="rack in Object.values(rackGroups)" :key="rack.key">
          <rect
            :x="rack.x"
            :y="rack.y"
            :width="rackWidth"
            :height="rackHeight"
            :class="[
              'rack',
              getRackClass(rack),
              { 
                'rack-hovered': hoveredRack === rack.key,
                'rack-highlighted': highlightedRack === rack.key
              }
            ]"
            rx="2"
            @click.stop="handleRackClick(rack)"
            @mouseenter="hoveredRack = rack.key"
            @mouseleave="hoveredRack = null"
          />
          
          <!-- Rack label -->
          <text
            :x="rack.x + rackWidth / 2"
            :y="rack.y + rackHeight / 2"
            class="rack-label"
            text-anchor="middle"
            dominant-baseline="middle"
            pointer-events="none"
          >
            {{ rack.pasillo }}-{{ rack.rack }}
          </text>
          
          <!-- Occupancy indicator -->
          <circle
            v-if="rack.occupancyRate > 0"
            :cx="rack.x + rackWidth - 8"
            :cy="rack.y + 8"
            :r="5"
            :class="getOccupancyClass(rack.occupancyRate)"
            class="occupancy-indicator"
          />
        </template>
      </g>
    </svg>
    
    <!-- Legend -->
    <div class="map-legend">
      <div class="legend-item">
        <div class="legend-color occupied"></div>
        <span>Ocupado</span>
      </div>
      <div class="legend-item">
        <div class="legend-color empty"></div>
        <span>Disponible</span>
      </div>
      <div class="legend-item">
        <div class="legend-color highlight"></div>
        <span>Seleccionado</span>
      </div>
    </div>
    

  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'WarehouseMap',
  props: {
    locations: {
      type: Array,
      default: () => []
    },
    searchedSKU: {
      type: String,
      default: ''
    }
  },
  emits: ['rack-selected'],
  setup(props, { emit }) {
    const rackWidth = 60
    const rackHeight = 40
    const hoveredRack = ref(null)
    const highlightedRack = ref(null)
    const activeZone = ref(null)
    
    // Group locations by rack
    const rackGroups = computed(() => {
      const groups = {}
      
      props.locations.forEach(location => {
        // Create a unique key for the rack
        const key = `${location.zona}-${location.pasillo}-${location.rack}`
        
        if (!groups[key]) {
          groups[key] = {
            key,
            zona: location.zona,
            pasillo: location.pasillo,
            rack: location.rack,
            // Use coordinates from the first location in the rack
            // Backend generates x/y based on layout
            x: location.x || 0,
            y: location.y || 0,
            locations: [],
            occupied: 0,
            total: 0
          }
        }
        
        groups[key].locations.push(location)
        groups[key].total++
        if (location.inventory_id) groups[key].occupied++
      })
      
      // Calculate occupancy rate
      Object.values(groups).forEach(rack => {
        rack.occupancyRate = rack.total > 0 ? (rack.occupied / rack.total) : 0
      })
      
      return groups
    })
    
    // Dynamically compute zones and their dimensions based on racks
    const zones = computed(() => {
      const zoneMap = {}
      const racks = Object.values(rackGroups.value)
      
      if (racks.length === 0) return []
      
      racks.forEach(rack => {
        if (!zoneMap[rack.zona]) {
          zoneMap[rack.zona] = {
            name: rack.zona,
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
            racks: []
          }
        }
        
        const z = zoneMap[rack.zona]
        z.racks.push(rack)
        
        // Update bounds
        z.minX = Math.min(z.minX, rack.x)
        z.minY = Math.min(z.minY, rack.y)
        z.maxX = Math.max(z.maxX, rack.x + rackWidth)
        z.maxY = Math.max(z.maxY, rack.y + rackHeight)
      })
      
      // Format zones for rendering
      // Add padding around the racks
      const padding = 40
      
      return Object.values(zoneMap).map(z => ({
        name: z.name,
        x: z.minX - padding,
        y: z.minY - padding,
        width: (z.maxX - z.minX) + (padding * 2),
        height: (z.maxY - z.minY) + (padding * 2),
        racks: z.racks
      }))
    })
    
    // Calculate viewBox to fit all zones
    const viewBox = computed(() => {
      if (zones.value.length === 0) return '0 0 800 600'
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      
      zones.value.forEach(z => {
        minX = Math.min(minX, z.x)
        minY = Math.min(minY, z.y)
        maxX = Math.max(maxX, z.x + z.width)
        maxY = Math.max(maxY, z.y + z.height)
      })
      
      // Add global padding
      const padding = 50
      const width = (maxX - minX) + (padding * 2)
      const height = (maxY - minY) + (padding * 2)
      
      return `${minX - padding} ${minY - padding} ${width} ${height}`
    })
    
    // Get racks for a specific zone (now just returns the pre-calculated racks)
    const getRacksInZone = (zoneName) => {
      const zone = zones.value.find(z => z.name === zoneName)
      return zone ? zone.racks : []
    }
    
    // Get rack CSS class based on occupancy
    const getRackClass = (rack) => {
      if (rack.occupancyRate === 0) return 'empty'
      if (rack.occupancyRate === 1) return 'occupied'
      return 'partial'
    }
    
    // Get occupancy indicator class
    const getOccupancyClass = (rate) => {
      if (rate >= 0.8) return 'high-occupancy'
      if (rate >= 0.5) return 'medium-occupancy'
      return 'low-occupancy'
    }
    
    // Handle rack click
    const handleRackClick = (rack) => {
      highlightedRack.value = rack.key
      activeZone.value = rack.zona
      emit('rack-selected', rack)
    }
    
    // Handle background click
    const handleBackgroundClick = () => {
      highlightedRack.value = null
      activeZone.value = null
    }
    
    // Watch for searched SKU
    watch(() => props.searchedSKU, (sku) => {
      if (!sku) {
        highlightedRack.value = null
        return
      }
      
      // Find location with this SKU
      const location = props.locations.find(loc => loc.sku === sku) // Note: search might still need SKU from somewhere if we want to support it
      // Since we removed SKU from locations table, we rely on the join in the backend or passed data.
      // Assuming props.locations comes from an API that joins inventory_items to get SKU if needed, 
      // or we search by product name/inventory.
      
      // For now, let's assume the parent component handles the search logic and passes the SKU 
      // if it's available in the location object.
      
      if (location) {
        const rackKey = `${location.zona}-${location.pasillo}-${location.rack}`
        highlightedRack.value = rackKey
        activeZone.value = location.zona
        
        const rack = rackGroups.value[rackKey]
        if (rack) {
          emit('rack-selected', { ...rack, searchedLocation: location })
        }
      }
    })
    
    return {
      viewBox,
      rackWidth,
      rackHeight,
      zones,
      hoveredRack,
      highlightedRack,
      activeZone,
      rackGroups, // Exposed for debug
      getRacksInZone,
      getRackClass,
      getOccupancyClass,
      handleRackClick,
      handleBackgroundClick
    }
  }
}
</script>

<style scoped>
.warehouse-map-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-main);
}

.warehouse-svg {
  width: 100%;
  height: calc(100% - 60px);
  display: block;
}

/* Zone styles */
.zone-group {
  transition: opacity 0.3s;
}

.zone-group.zone-active {
  opacity: 1;
}

.zone-border {
  stroke: var(--border-dark);
  stroke-width: 1.5;
  stroke-dasharray: 5, 5;
  fill: none;
}

.zone-label {
  fill: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

/* Rack styles */
.rack {
  cursor: pointer;
  transition: all 0.2s;
  fill: #e0e7ff;
  stroke: #6366f1;
  stroke-width: 2;
}

.rack:hover {
  fill: #c7d2fe;
  stroke: var(--primary);
  stroke-width: 2.5;
}

.rack.rack-highlighted {
  fill: #dbeafe;
  stroke: var(--primary);
  stroke-width: 3;
}

.rack-label {
  fill: #1e293b;
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

/* Occupancy status colors */
.rack.empty {
  fill: #f1f5f9;
  stroke: #94a3b8;
}

.rack.low-occupancy {
  fill: #d1fae5;
  stroke: #10b981;
}

.rack.medium-occupancy {
  fill: #fed7aa;
  stroke: #f97316;
}

.rack.high-occupancy {
  fill: #fecaca;
  stroke: #ef4444;
}

/* Legend */
.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.legend-color {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid transparent;
}

.legend-color.empty {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.legend-color.occupied {
  background: #d1fae5;
  border-color: #10b981;
}

.legend-color.highlight {
  background: #dbeafe;
  border-color: var(--primary);
}
</style>
