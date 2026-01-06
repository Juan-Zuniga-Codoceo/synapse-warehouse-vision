<template>
  <div class="canvas-container" ref="container">
    <div v-if="loading" class="loading">Cargando bodega 3D...</div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default {
  name: 'Warehouse3D',
  props: {
    locations: {
      type: Array,
      default: () => []
    }
  },
  emits: ['location-click', 'search-complete'],
  setup(props, { emit }) {
    const container = ref(null)
    const loading = ref(true)
    
    let scene, camera, renderer, controls
    let raycaster, mouse
    let locationMeshes = []
    let hoveredMesh = null
    let animationId = null
    
    const initScene = () => {
      // Scene
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0e1a)
      scene.fog = new THREE.Fog(0x0a0e1a, 50, 200)
      
      // Camera
      camera = new THREE.PerspectiveCamera(
        60,
        container.value.clientWidth / container.value.clientHeight,
        0.1,
        1000
      )
      camera.position.set(30, 25, 40)
      
      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.value.clientWidth, container.value.clientHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      container.value.appendChild(renderer.domElement)
      
      // Controls
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.maxPolarAngle = Math.PI / 2
      
      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(20, 40, 20)
      directionalLight.castShadow = true
      directionalLight.shadow.camera.left = -50
      directionalLight.shadow.camera.right = 50
      directionalLight.shadow.camera.top = 50
      directionalLight.shadow.camera.bottom = -50
      scene.add(directionalLight)
      
      // Accent light (primary color)
      const accentLight = new THREE.PointLight(0x049DD9, 0.5, 100)
      accentLight.position.set(0, 20, 0)
      scene.add(accentLight)
      
      // Ground
      const groundGeometry = new THREE.PlaneGeometry(200, 200)
      const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x141824,
        roughness: 0.8,
        metalness: 0.2
      })
      const ground = new THREE.Mesh(groundGeometry, groundMaterial)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)
      
      // Grid
      const gridHelper = new THREE.GridHelper(200, 50, 0x049DD9, 0x2d3748)
      gridHelper.material.opacity = 0.3
      gridHelper.material.transparent = true
      scene.add(gridHelper)
      
      // Raycaster for mouse interaction
      raycaster = new THREE.Raycaster()
      mouse = new THREE.Vector2()
      
      // Event listeners
      window.addEventListener('resize', onWindowResize)
      renderer.domElement.addEventListener('mousemove', onMouseMove)
      renderer.domElement.addEventListener('click', onClick)
      
      loading.value = false
    }
    
    const createLocationMeshes = () => {
      // Clear existing meshes
      locationMeshes.forEach(mesh => scene.remove(mesh))
      locationMeshes = []
      
      if (!props.locations.length) return
      
      // Group locations by rack for InstancedMesh optimization
      const rackGroups = {}
      
      props.locations.forEach(location => {
        const key = `${location.zona}-${location.pasillo}-${location.rack}`
        if (!rackGroups[key]) {
          rackGroups[key] = { occupied: [], empty: [] }
        }
        
        if (location.sku) {
          rackGroups[key].occupied.push(location)
        } else {
          rackGroups[key].empty.push(location)
        }
      })
      
      // Create instanced meshes for each rack
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
      
      Object.entries(rackGroups).forEach(([rackKey, { occupied, empty }]) => {
        // Occupied locations (green)
        if (occupied.length > 0) {
          const occupiedMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x48bb78,
            roughness: 0.5,
            metalness: 0.3
          })
          const occupiedMesh = new THREE.InstancedMesh(
            boxGeometry,
            occupiedMaterial,
            occupied.length
          )
          occupiedMesh.castShadow = true
          occupiedMesh.receiveShadow = true
          
          occupied.forEach((location, i) => {
            const matrix = new THREE.Matrix4()
            matrix.setPosition(location.x, location.y + 0.5, location.z)
            occupiedMesh.setMatrixAt(i, matrix)
            occupiedMesh.setColorAt(i, new THREE.Color(0x48bb78))
          })
          
          occupiedMesh.userData.locations = occupied
          occupiedMesh.userData.type = 'occupied'
          scene.add(occupiedMesh)
          locationMeshes.push(occupiedMesh)
        }
        
        // Empty locations (gray)
        if (empty.length > 0) {
          const emptyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d3748,
            roughness: 0.7,
            metalness: 0.1
          })
          const emptyMesh = new THREE.InstancedMesh(
            boxGeometry,
            emptyMaterial,
            empty.length
          )
          emptyMesh.castShadow = true
          emptyMesh.receiveShadow = true
          
          empty.forEach((location, i) => {
            const matrix = new THREE.Matrix4()
            matrix.setPosition(location.x, location.y + 0.5, location.z)
            emptyMesh.setMatrixAt(i, matrix)
            emptyMesh.setColorAt(i, new THREE.Color(0x2d3748))
          })
          
          emptyMesh.userData.locations = empty
          emptyMesh.userData.type = 'empty'
          scene.add(emptyMesh)
          locationMeshes.push(emptyMesh)
        }
      })
    }
    
    const onWindowResize = () => {
      if (!container.value) return
      
      camera.aspect = container.value.clientWidth / container.value.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.value.clientWidth, container.value.clientHeight)
    }
    
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Raycast for hover effect
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(locationMeshes)
      
      // Reset previous hover
      if (hoveredMesh) {
        const instanceId = hoveredMesh.instanceId
        const mesh = hoveredMesh.mesh
        const originalColor = mesh.userData.type === 'occupied' ? 0x48bb78 : 0x2d3748
        mesh.setColorAt(instanceId, new THREE.Color(originalColor))
        mesh.instanceColor.needsUpdate = true
        hoveredMesh = null
        renderer.domElement.style.cursor = 'default'
      }
      
      // Apply new hover
      if (intersects.length > 0) {
        const intersection = intersects[0]
        const mesh = intersection.object
        const instanceId = intersection.instanceId
        
        if (mesh.userData.type === 'empty') {
          mesh.setColorAt(instanceId, new THREE.Color(0xed8936)) // Orange hover
          mesh.instanceColor.needsUpdate = true
          hoveredMesh = { mesh, instanceId }
          renderer.domElement.style.cursor = 'pointer'
        }
      }
    }
    
    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(locationMeshes)
      
      if (intersects.length > 0) {
        const intersection = intersects[0]
        const mesh = intersection.object
        const instanceId = intersection.instanceId
        const location = mesh.userData.locations[instanceId]
        
        if (location) {
          emit('location-click', location)
        }
      }
    }
    
    const searchAndZoom = (sku) => {
      const location = props.locations.find(loc => loc.sku === sku)
      
      if (location) {
        // Animate camera to location
        const targetPosition = new THREE.Vector3(
          location.x + 5,
          location.y + 5,
          location.z + 5
        )
        
        animateCameraTo(targetPosition, new THREE.Vector3(location.x, location.y, location.z))
        emit('search-complete', true)
      } else {
        emit('search-complete', false)
      }
    }
    
    const animateCameraTo = (position, target) => {
      const startPosition = camera.position.clone()
      const startTarget = controls.target.clone()
      const duration = 1500
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeInOutCubic(progress)
        
        camera.position.lerpVectors(startPosition, position, eased)
        controls.target.lerpVectors(startTarget, target, eased)
        controls.update()
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    }
    
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }
    
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    
    // Expose search method
    const search = (sku) => {
      searchAndZoom(sku)
    }
    
    onMounted(() => {
      initScene()
      animate()
    })
    
    onUnmounted(() => {
      if (animationId) cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onWindowResize)
      if (renderer) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove)
        renderer.domElement.removeEventListener('click', onClick)
        renderer.dispose()
      }
    })
    
    watch(() => props.locations, () => {
      createLocationMeshes()
    }, { deep: true })
    
    return {
      container,
      loading,
      search
    }
  }
}
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--primary);
  font-size: 1.2rem;
  font-weight: 600;
}
</style>
