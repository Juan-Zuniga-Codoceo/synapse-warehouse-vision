<template>
  <div class="alerts-panel-section panel-section">
    <div class="alerts-header" @click="togglePanel">
      <h2>
        <span class="alert-icon">⚠️</span>
        ALERTAS
        <span v-if="alertCount > 0" class="alert-badge">{{ alertCount }}</span>
      </h2>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>
    
    <div v-if="isExpanded" class="alerts-content">
      <div v-if="loading" class="loading-state">Cargando alertas...</div>
      
      <div v-else-if="alerts.length === 0" class="empty-state">
        <span>✅</span>
        <p>No hay productos por vencer</p>
      </div>
      
      <div v-else class="alerts-list">
        <div 
          v-for="alert in sortedAlerts" 
          :key="alert.id"
          :class="['alert-item', getAlertClass(alert)]"
          @click="handleAlertClick(alert)"
        >
          <div class="alert-icon-status">
            {{ getAlertIcon(alert.alert_status) }}
          </div>
          
          <div class="alert-content">
            <div class="alert-product">{{ alert.product_name }}</div>
            <div class="alert-sku">{{ alert.sku }}</div>
            <div class="alert-location">
              {{ alert.zona }}-{{ alert.pasillo }}-{{ alert.rack }}-{{ alert.nivel }}-{{ alert.posicion }}
            </div>
            <div class="alert-time">
              {{ formatDaysUntilExpiration(alert.days_until_expiration) }}
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="stats" class="alerts-stats">
        <div class="stat-item expired">
          <span class="stat-number">{{ stats.expired || 0 }}</span>
          <span class="stat-label">Vencidos</span>
        </div>
        <div class="stat-item expiring">
          <span class="stat-number">{{ stats.expiring_soon || 0 }}</span>
          <span class="stat-label">Por Vencer</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

export default {
  name: 'AlertsPanel',
  emits: ['alert-click'],
  setup(props, { emit }) {
    const isExpanded = ref(true)
    const loading = ref(false)
    const alerts = ref([])
    const stats = ref(null)
    
    const alertCount = computed(() => alerts.value.length)
    
    const sortedAlerts = computed(() => {
      return [...alerts.value].sort((a, b) => {
        // Expired first, then by days until expiration
        if (a.alert_status === 'EXPIRED' && b.alert_status !== 'EXPIRED') return -1
        if (a.alert_status !== 'EXPIRED' && b.alert_status === 'EXPIRED') return 1
        return a.days_until_expiration - b.days_until_expiration
      })
    })
    
    const togglePanel = () => {
      isExpanded.value = !isExpanded.value
      if (isExpanded.value && alerts.value.length === 0) {
        loadAlerts()
      }
    }
    
    const loadAlerts = async () => {
      loading.value = true
      try {
        const [alertsRes, statsRes] = await Promise.all([
          axios.get('/api/inventory/alerts'),
          axios.get('/api/inventory/stats')
        ])
        alerts.value = alertsRes.data.data
        stats.value = statsRes.data.data
      } catch (error) {
        console.error('Error loading alerts:', error)
      } finally {
        loading.value = false
      }
    }
    
    const getAlertClass = (alert) => {
      if (alert.alert_status === 'EXPIRED') return 'alert-expired'
      if (alert.days_until_expiration <= 7) return 'alert-critical'
      if (alert.days_until_expiration <= 30) return 'alert-warning'
      return 'alert-normal'
    }
    
    const getAlertIcon = (status) => {
      if (status === 'EXPIRED') return '🔴'
      return '🟠'
    }
    
    const formatDaysUntilExpiration = (days) => {
      if (days < 0) return 'Vencido'
      if (days === 0) return 'Vence hoy'
      if (days === 1) return 'Vence mañana'
      if (days <= 7) return `${Math.floor(days)} días`
      if (days <= 30) return `${Math.floor(days)} días`
      return `${Math.floor(days)} días`
    }
    
    const handleAlertClick = (alert) => {
      emit('alert-click', alert)
    }
    
    // Auto-load on mount
    onMounted(() => {
      loadAlerts()
    })
    
    // Expose refresh method
    const refresh = () => {
      loadAlerts()
    }
    
    return {
      isExpanded,
      loading,
      alerts,
      stats,
      alertCount,
      sortedAlerts,
      togglePanel,
      getAlertClass,
      getAlertIcon,
      formatDaysUntilExpiration,
      handleAlertClick,
      refresh
    }
  }
}
</script>

<style scoped>
.alerts-panel-section {
  border-bottom: 2px solid var(--border);
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.alerts-header:hover {
  background: var(--bg-hover);
}

.alerts-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alert-icon {
  font-size: 1rem;
}

.alert-badge {
  background: var(--danger);
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-weight: 700;
}

.toggle-icon {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.alerts-content {
  padding-top: 0.5rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.empty-state span {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.alerts-list {
  max-height: 400px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-dark);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.alert-item:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
}

.alert-item.alert-expired {
  border-left-color: var(--danger);
  background: rgba(245, 101, 101, 0.1);
}

.alert-item.alert-critical {
  border-left-color: #ed8936;
  background: rgba(237, 137, 54, 0.1);
}

.alert-item.alert-warning {
  border-left-color: #ecc94b;
}

.alert-icon-status {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-product {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-sku {
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alert-location {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.alert-time {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
}

.alert-item.alert-expired .alert-time {
  color: var(--danger);
}

.alert-item.alert-critical .alert-time {
  color: #ed8936;
}

.alerts-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: var(--bg-dark);
  border-radius: 4px;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-item.expired .stat-number {
  color: var(--danger);
}

.stat-item.expiring .stat-number {
  color: #ed8936;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
