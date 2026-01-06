<template>
  <aside class="side-panel">
    <!-- Search Section -->
    <div class="panel-section">
      <h2>🔍 Búsqueda</h2>
      <div class="input-group">
        <label>Buscar por SKU</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Ej: SKU-A-001"
          @keyup.enter="handleSearch"
        />
      </div>
      <button @click="handleSearch">Buscar y Enfocar</button>
    </div>
    
    <!-- Filter Section -->
    <div class="panel-section">
      <h2>🎯 Filtros</h2>
      <div class="input-group">
        <label>Zona</label>
        <select v-model="selectedZone" @change="handleFilter">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone" :value="zone">
            Zona {{ zone }}
          </option>
        </select>
      </div>
      
      <div class="input-group">
        <label>Estado</label>
        <select v-model="occupancyFilter" @change="handleFilter">
          <option value="">Todas</option>
          <option value="true">Ocupadas</option>
          <option value="false">Disponibles</option>
        </select>
      </div>
    </div>
    
    <!-- Stats Section -->
    <div class="panel-section">
      <h2>📊 Ocupación</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total || 0 }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.occupied || 0 }}</div>
          <div class="stat-label">Ocupadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.available || 0 }}</div>
          <div class="stat-label">Disponibles</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.occupancyRate || 0 }}%</div>
          <div class="stat-label">Tasa</div>
        </div>
      </div>
      
      <!-- Zone Breakdown -->
      <div v-if="stats.byZone && stats.byZone.length" style="margin-top: 1rem;">
        <div 
          v-for="zone in stats.byZone" 
          :key="zone.zona"
          style="display: flex; justify-content: space-between; padding: 0.5rem; background: var(--bg-dark); border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.85rem;"
        >
          <span>Zona {{ zone.zona }}</span>
          <span style="color: var(--primary);">{{ zone.occupied }}/{{ zone.total }}</span>
        </div>
      </div>
    </div>
    
    <!-- Activity Log -->
    <div class="panel-section">
      <h2>📝 Actividad Reciente</h2>
      <div class="activity-list">
        <div 
          v-for="item in activity" 
          :key="item.id"
          class="activity-item"
        >
          <div>
            <span class="sku">{{ item.sku }}</span>
            <span style="color: var(--text-secondary);"> - {{ item.action }}</span>
          </div>
          <div class="location">
            {{ item.zona }}-{{ item.pasillo }}-{{ item.rack }}-{{ item.nivel }}-{{ item.posicion }}
          </div>
          <div class="time">{{ formatTime(item.timestamp) }}</div>
        </div>
        
        <div v-if="!activity.length" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          Sin actividad reciente
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'SidePanel',
  props: {
    stats: {
      type: Object,
      default: () => ({})
    },
    activity: {
      type: Array,
      default: () => []
    },
    zones: {
      type: Array,
      default: () => []
    }
  },
  emits: ['search', 'filter'],
  setup(props, { emit }) {
    const searchQuery = ref('')
    const selectedZone = ref('')
    const occupancyFilter = ref('')
    
    const handleSearch = () => {
      if (searchQuery.value.trim()) {
        emit('search', searchQuery.value.trim())
      }
    }
    
    const handleFilter = () => {
      const filters = {}
      
      if (selectedZone.value) {
        filters.zona = selectedZone.value
      }
      
      if (occupancyFilter.value) {
        filters.occupied = occupancyFilter.value
      }
      
      emit('filter', filters)
    }
    
    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return 'Ahora'
      if (minutes < 60) return `Hace ${minutes}m`
      if (hours < 24) return `Hace ${hours}h`
      return `Hace ${days}d`
    }
    
    return {
      searchQuery,
      selectedZone,
      occupancyFilter,
      handleSearch,
      handleFilter,
      formatTime
    }
  }
}
</script>
