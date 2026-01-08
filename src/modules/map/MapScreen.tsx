import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'
import { RecoleccionService, type Recoleccion } from '../../services/recoleccion.service'

// Importar estilos de Leaflet
import 'leaflet/dist/leaflet.css'

// Icono de ubicación del usuario (punto pulsante moderno)
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative; width: 30px; height: 30px;">
      <div style="
        position: absolute;
        width: 30px;
        height: 30px;
        background: rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        animation: pulse 2s infinite;
      "></div>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      "></div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0; }
        }
      </style>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
})

// Icono alternativo azul para otros marcadores
const blueIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative;">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 30 12 30s12-21 12-30c0-6.627-5.373-12-12-12z" 
              fill="#3b82f6" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="#fff"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
})

// Icono café para recolección de semillas
const brownIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative;">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 30 12 30s12-21 12-30c0-6.627-5.373-12-12-12z" 
              fill="#92400e" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="#fff"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
})

// Icono celeste para vivero
const cyanIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative;">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 30 12 30s12-21 12-30c0-6.627-5.373-12-12-12z" 
              fill="#06b6d4" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="#fff"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
})

// Icono verde para plantación
const greenIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative;">
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C9.373 0 4 5.373 4 12c0 9 12 30 12 30s12-21 12-30c0-6.627-5.373-12-12-12z" 
              fill="#10b981" stroke="#fff" stroke-width="2"/>
        <circle cx="16" cy="12" r="4" fill="#fff"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
})

// Componente para centrar el mapa en la ubicación del usuario
function LocationMarker() {
  const [position, setPosition] = useState<LatLngExpression | null>(null)
  const map = useMap()

  useEffect(() => {
    map.locate().on('locationfound', (e) => {
      setPosition(e.latlng)
      map.flyTo(e.latlng, 13)
    })
  }, [map])

  return position === null ? null : (
    <Marker position={position} icon={customIcon}>
      <Popup>Tu ubicación actual</Popup>
    </Marker>
  )
}

// Componente de carrusel para el popup
function ImageCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div style={{ position: 'relative', width: '200px' }}>
      <img
        src={images[currentIndex]}
        alt={`Foto ${currentIndex + 1}`}
        style={{
          width: '100%',
          height: '150px',
          objectFit: 'cover',
          borderRadius: '8px',
          marginBottom: '8px',
        }}
      />
      
      {images.length > 1 && (
        <>
          {/* Botón anterior */}
          <button
            onClick={prevImage}
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ‹
          </button>
          
          {/* Botón siguiente */}
          <button
            onClick={nextImage}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#333',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ›
          </button>
          
          {/* Indicadores */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            {images.map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: index === currentIndex ? '#3b82f6' : 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MapScreen() {
  const [searchParams] = useSearchParams();
  // Coordenadas iniciales (centro de Bolivia como ejemplo)
  const defaultCenter: LatLngExpression = [-16.5, -68.15]
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null)
  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([])
  const [initialCenter, setInitialCenter] = useState<LatLngExpression>(defaultCenter)
  const [initialZoom, setInitialZoom] = useState<number>(13)

  useEffect(() => {
    // Obtener ubicación del usuario
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
        }
      )
    }

    // Check if there are focus parameters in the URL
    const focusLat = searchParams.get('focusLat');
    const focusLng = searchParams.get('focusLng');
    const focusId = searchParams.get('focusId');

    if (focusLat && focusLng) {
      // Set the initial center to the focused location
      setInitialCenter([parseFloat(focusLat), parseFloat(focusLng)]);
      setInitialZoom(16); // Higher zoom for focusing on a specific location
    }

    // Cargar recolecciones
    loadRecolecciones()
  }, [searchParams])

  const loadRecolecciones = async () => {
    try {
      const response = await RecoleccionService.list()
      setRecolecciones(response.data || [])
      console.log('✅ Recolecciones cargadas:', response.data?.length)
    } catch (error) {
      console.error('❌ Error cargando recolecciones:', error)
    }
  }

  const getIconForType = (tipoMaterial: string) => {
    switch (tipoMaterial) {
      case 'SEMILLA':
        return brownIcon // Café
      case 'PLANTULA':
        return greenIcon // Verde
      case 'ESTACA':
      case 'INJERTO':
        return cyanIcon // Celeste
      default:
        return blueIcon
    }
  }

  const getTipoLabel = (tipoMaterial: string) => {
    switch (tipoMaterial) {
      case 'SEMILLA':
        return 'Semillas'
      case 'PLANTULA':
        return 'Plántulas'
      case 'ESTACA':
        return 'Estacas'
      case 'INJERTO':
        return 'Injertos'
      default:
        return tipoMaterial
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Use the focused location if available, otherwise user location or default
  const center = userLocation || initialCenter

  return (
    <div className="fixed inset-0 z-0 bg-gray-100">
      {/* Contenedor responsive */}
      <div className="w-full h-screen bg-white flex flex-col">
        {/* Encabezado */}
        <div className="bg-white border-b px-4 py-3 shadow-sm">
          <h1 className="text-xl font-semibold text-center" style={{ color: '#164d2f' }}>Mapa R3foresta</h1>
        </div>

        {/* Contenedor del mapa - ocupa todo el espacio */}
        <div className="flex-1 relative pb-20">
          <MapContainer
            center={center}
            zoom={initialZoom}
            scrollWheelZoom={true}
            attributionControl={false}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <LocationMarker />
            
            {/* Marcadores de recolecciones */}
            {recolecciones.map((recoleccion) => {
              const position: LatLngExpression = [
                recoleccion.ubicacion.latitud,
                recoleccion.ubicacion.longitud,
              ]
              
              const fotosUrls = recoleccion.fotos.map((foto) => foto.url)
              
              return (
                <Marker
                  key={recoleccion.id}
                  position={position}
                  icon={getIconForType(recoleccion.tipo_material)}
                >
                  <Popup>
                    <div style={{ width: '200px' }}>
                      {fotosUrls.length > 0 && <ImageCarousel images={fotosUrls} />}
                      
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
                        {getTipoLabel(recoleccion.tipo_material)}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        <strong>Especie:</strong> {recoleccion.planta?.especie || recoleccion.nombre_cientifico || 'No especificada'}
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <strong>Cantidad:</strong> {recoleccion.cantidad} {recoleccion.unidad}
                      </div>
                      
                      {recoleccion.ubicacion.zona && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>Zona:</strong> {recoleccion.ubicacion.zona}
                        </div>
                      )}
                      
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <strong>Fecha:</strong> {formatDate(recoleccion.fecha)}
                      </div>
                      
                      {recoleccion.vivero && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <strong>Vivero:</strong> {recoleccion.vivero.nombre}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
           
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

export default MapScreen
