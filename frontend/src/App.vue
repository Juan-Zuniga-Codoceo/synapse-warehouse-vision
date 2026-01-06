<template>
  <div id="app">
    <header class="header">
      <div class="brand-container">
        <!-- <img src="./assets/logo_simple_1-removebg-preview.png" alt="Synapse Dev Logo" class="nav-logo" /> -->
        <h1>Synapse Warehouse Vision</h1>
      </div>
      <div class="header-info">
        <button class="setup-btn" @click="showSetup = true" title="Configurar Bodega">
          ⚙️ Configurar
        </button>
        <button class="help-btn" @click="showHelp = true" title="Ayuda y Atajos">
          ❓ Ayuda
        </button>
        <span>Bodega Principal</span>
        <span>|</span>
        <span>{{ stats.total || 0 }} Ubicaciones</span>
        <span v-if="alertCount > 0" class="alert-count">
          ⚠️ {{ alertCount }} Alertas
        </span>
      </div>
    </header>
    
    <div class="main-container">
      <WarehouseMap 
        :locations="locations"
        :searched-s-k-u="searchedSKU"
        @rack-selected="handleRackSelected"
      />
      
      <aside class="side-panel">
        <div class="panel-content">
          <!-- Alerts Panel -->
          <AlertsPanel 
            ref="alertsPanel"
            @alert-click="handleAlertClick"
          />
          
          <!-- Search Section -->
          <div class="panel-section">
            <h2>🔍 Búsqueda</h2>
            <div class="input-group">
              <label>Buscar por SKU o Producto</label>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Ej: LAC-001 o Leche"
                @keyup.enter="handleSearch"
              />
            </div>
            <button @click="handleSearch">Buscar y Enfocar</button>
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
          </div>
        </div>
        
        <!-- Credits Footer -->
        <div class="credits-footer">
          <div class="synapse-logo">🧠 Synapse Dev</div>
          <a href="https://www.synapsedev.cl" target="_blank" class="web-link">www.synapsedev.cl</a>
          <div class="dev-name">Desarrollador: Juan Alfredo Zúñiga Codoceo</div>
        </div>
      </aside>
    </div>
    
    <!-- Rack Elevation Modal -->
    <RackElevation
      :is-open="showRackElevation"
      :rack-data="selectedRack"
      @close="closeRackElevation"
      @cell-click="handleCellClick"
      @product-click="handleProductClick"
      @remove-sku="handleRemoveInventory"
    />
    
    <!-- Product Registration Modal -->
    <ProductRegistrationModal
      :is-open="showProductModal"
      :location="selectedLocation"
      @close="closeProductModal"
      @submit="handleProductSubmit"
    />
    
    <!-- Product Details Modal -->
    <ProductDetailsModal
      :is-open="showProductDetails"
      :product="selectedProduct"
      @close="closeProductDetails"
    />
    
    <!-- Warehouse Setup Modal -->
    <WarehouseSetup
      :is-open="showSetup"
      @close="showSetup = false"
      @success="handleSetupSuccess"
    />
    
    <!-- Help Modal -->
    <HelpModal
      :is-open="showHelp"
      @close="showHelp = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import WarehouseMap from './components/WarehouseMap.vue'
import RackElevation from './components/RackElevation.vue'
import ProductRegistrationModal from './components/ProductRegistrationModal.vue'
import ProductDetailsModal from './components/ProductDetailsModal.vue'
import AlertsPanel from './components/AlertsPanel.vue'
import WarehouseSetup from './components/WarehouseSetup.vue'
import HelpModal from './components/HelpModal.vue'

export default {
  name: 'App',
  components: {
    WarehouseMap,
    RackElevation,
    ProductRegistrationModal,
    ProductDetailsModal,
    AlertsPanel,
    WarehouseSetup,
    HelpModal
  },
  setup() {
    const locations = ref([])
    const stats = ref({})
    // const zones = ref(['A', 'B', 'C']) // Removed hardcoded zones
    
    // Compute unique aisles/zones for filter
    const filterOptions = computed(() => {
      if (!locations.value.length) return []
      // Get unique aisles (since user sees A, B, C as aisles now)
      const aisles = [...new Set(locations.value.map(l => l.pasillo))].sort()
      return aisles
    })
    const showProductModal = ref(false)
    const showProductDetails = ref(false)
    const showHelp = ref(false)
    const selectedProduct = ref(null)
    const showRackElevation = ref(false)
    const showSetup = ref(false)
    
    // Barcode Scanner Logic
    let barcodeBuffer = ''
    let lastKeyTime = 0
    const BARCODE_DELAY = 50 // Max ms between keystrokes for scanner

    const handleGlobalKeydown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const currentTime = Date.now()
      
      if (currentTime - lastKeyTime > BARCODE_DELAY) {
        barcodeBuffer = '' // Reset buffer if too slow (manual typing)
      }
      
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 2) { // Min length check
          console.log('Barcode detected:', barcodeBuffer)
          searchQuery.value = barcodeBuffer
          handleSearch()
          barcodeBuffer = ''
        }
      } else if (e.key.length === 1) { // Printable characters
        barcodeBuffer += e.key
      }
    }
    const selectedLocation = ref(null)
    const selectedRack = ref({
      zona: '',
      pasillo: '',
      rack: '',
      locations: [],
      occupied: 0,
      total: 0,
      occupancyRate: 0,
      searchedLocation: null
    })
    const searchQuery = ref('')
    const searchedSKU = ref('')
    const selectedZone = ref('')
    const occupancyFilter = ref('')
    const alertsPanel = ref(null)
    const alertCount = ref(0)
    const filterParams = ref({}) // New ref to hold filter parameters
    
    const loadLocations = async () => { // No longer takes filters as argument
      try {
        console.log('Frontend Debug - Loading locations with params:', filterParams.value)
        const response = await axios.get('/api/locations', { params: filterParams.value })
        console.log('Frontend Debug - API Response Sample:', response.data.data[0])
        const occupiedSample = response.data.data.find(l => l.inventory_id)
        if (occupiedSample) {
          console.log('Frontend Debug - Occupied Sample Keys:', Object.keys(occupiedSample))
          console.log('Frontend Debug - Occupied Sample Full:', JSON.parse(JSON.stringify(occupiedSample)))
        }
        locations.value = response.data.data
        
        // Update alert count
        const alertLocations = locations.value.filter(loc => 
          loc.alert_status === 'EXPIRED' || loc.alert_status === 'EXPIRING_SOON'
        )
        alertCount.value = alertLocations.length
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }
    
    const loadStats = async () => {
      try {
        const response = await axios.get('/api/locations/stats/occupancy')
        stats.value = response.data.data
      } catch (error) {
        console.error('Error loading stats:', error)
      }
    }
    
    const handleRackSelected = (rack) => {
      selectedRack.value = rack
      showRackElevation.value = true
    }
    
    const closeRackElevation = () => {
      showRackElevation.value = false
      searchedSKU.value = ''
    }
    
    const handleCellClick = (location) => {
      // Allow adding to occupied locations (multi-item support)
      selectedLocation.value = location
      showProductModal.value = true
    }
    
    const closeProductModal = () => {
      showProductModal.value = false
      selectedLocation.value = null
    }
    
    const handleProductClick = (product) => {
      console.log('App Debug - Product Clicked:', product)
      selectedProduct.value = product
      showProductDetails.value = true
      console.log('App Debug - Show Product Details set to true')
    }

    const closeProductDetails = () => {
      showProductDetails.value = false
      selectedProduct.value = null
    }
    
    const handleProductSubmit = async (data) => {
      try {
        // Capture location info before closing modal (which clears selectedLocation)
        const locationInfo = { ...selectedLocation.value }
        
        await axios.post('/api/inventory/items', data)
        
        closeProductModal()
        await loadLocations()
        await loadStats()
        
        // Refresh alerts panel
        if (alertsPanel.value) {
          alertsPanel.value.refresh()
        }
        
        // Refresh rack elevation if open
        if (showRackElevation.value && locationInfo) {
          const rackKey = `${locationInfo.zona}-${locationInfo.pasillo}-${locationInfo.rack}`
          const updatedLocations = locations.value.filter(loc => 
            `${loc.zona}-${loc.pasillo}-${loc.rack}` === rackKey
          )
          selectedRack.value = {
            ...selectedRack.value,
            locations: updatedLocations
          }
        }
      } catch (error) {
        console.error('Error creating inventory item:', error)
        alert('Error al registrar producto: ' + (error.response?.data?.error || error.message))
      }
    }
    
    const handleRemoveInventory = async (location) => {
      console.log('App Debug - Remove Inventory called with:', location)
      if (!location.inventory_id) {
        console.warn('App Debug - No inventory_id found in location')
        return
      }
      
      if (!confirm(`¿Remover "${location.product_name}" de esta ubicación?`)) return
      
      try {
        await axios.delete(`/api/inventory/items/${location.inventory_id}`)
        
        await loadLocations()
        await loadStats()
        
        // Refresh alerts panel
        if (alertsPanel.value) {
          alertsPanel.value.refresh()
        }
        
        // Refresh rack elevation
        const rackKey = `${location.zona}-${location.pasillo}-${location.rack}`
        const updatedLocations = locations.value.filter(loc => 
          `${loc.zona}-${loc.pasillo}-${loc.rack}` === rackKey
        )
        selectedRack.value = {
          ...selectedRack.value,
          locations: updatedLocations
        }
      } catch (error) {
        console.error('Error removing inventory:', error)
        alert('Error al remover producto')
      }
    }
    
    const handleSearch = () => {
      if (!searchQuery.value.trim()) return
      
      const query = searchQuery.value.trim().toLowerCase()
      
      // Search by SKU or product name
      const location = locations.value.find(loc => 
        loc.sku?.toLowerCase() === query || 
        loc.product_name?.toLowerCase().includes(query)
      )
      
      if (location && location.sku) {
        searchedSKU.value = location.sku
      } else {
        alert('Producto no encontrado')
        searchedSKU.value = ''
      }
    }
    
    const handleFilter = () => {
      // Client-side filtering to avoid reloading and potential map issues
      // We'll emit an event or pass a filtered prop to WarehouseMap?
      // Actually, WarehouseMap takes 'locations'. If we filter 'locations', the map updates.
      // But we need to keep the original full list to restore it.
      
      // Better approach: Reload from backend but with correct params?
      // The issue with backend filtering is that if we filter by 'zona=A', and 'A' is actually a 'pasillo', it returns empty.
      // Also, if we filter by pasillo, we get only that aisle.
      
      // Let's try client-side filtering first for responsiveness.
      // We need a separate ref for 'displayLocations' passed to map.
      // But 'locations' is used everywhere.
      
      // Let's stick to backend filtering but fix the param name.
      // If selectedZone matches a pasillo, send pasillo=X.
      
      const filters = {}
      
      if (selectedZone.value) {
        // Check if it looks like a zone or aisle. 
        // In our new setup, A, B, C are aisles (pasillo).
        // The actual "Zone" is "Bodega Principal".
        // So we should filter by pasillo.
        filters.pasillo = selectedZone.value
      }
      
      console.log('Frontend Debug - Applying filters:', filters)
      
      if (occupancyFilter.value) {
        filters.occupied = occupancyFilter.value
      }
      
      loadLocations(filters)
    }
    
    const handleAlertClick = (alert) => {
      // Find the rack containing this alert
      const rackKey = `${alert.zona}-${alert.pasillo}-${alert.rack}`
      const rackLocations = locations.value.filter(loc => 
        `${loc.zona}-${loc.pasillo}-${loc.rack}` === rackKey
      )
      
      if (rackLocations.length > 0) {
        // Highlight and open rack
        searchedSKU.value = alert.sku
        
        selectedRack.value = {
          zona: alert.zona,
          pasillo: alert.pasillo,
          rack: alert.rack,
          locations: rackLocations,
          searchedLocation: rackLocations.find(loc => loc.id === alert.location_id)
        }
        
        showRackElevation.value = true
      }
    }
    
    onMounted(() => {
      loadLocations()
      loadStats()
      window.addEventListener('keydown', handleGlobalKeydown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleGlobalKeydown)
    })
    
    const handleSetupSuccess = async () => {
      // Reload all data after warehouse setup
      await loadLocations()
      await loadStats()
      
      // Refresh alerts panel
      if (alertsPanel.value) {
        alertsPanel.value.refresh()
      }
    }
    
    return {
      locations,
      stats,
      filterOptions, // Expose computed property
      showProductModal,
      showProductDetails,
      showHelp,
      selectedProduct,
      showRackElevation,
      showSetup,
      selectedLocation,
      selectedRack,
      searchQuery,
      searchedSKU,
      selectedZone,
      occupancyFilter,
      alertsPanel,
      alertCount,
      handleRackSelected,
      closeRackElevation,
      handleCellClick,
      closeProductModal,
      handleProductClick,
      closeProductDetails,
      handleProductSubmit,
      handleRemoveInventory,
      handleSearch,
      handleFilter,
      handleAlertClick,
      handleSetupSuccess
    }
  }
}
</script>

<style>
.alert-count {
  background: var(--danger);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  animation: pulse 2s infinite;
}

.setup-btn {
  background: var(--bg-hover);
  border: 1px solid var(--primary);
  color: var(--primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.setup-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(4, 157, 217, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
