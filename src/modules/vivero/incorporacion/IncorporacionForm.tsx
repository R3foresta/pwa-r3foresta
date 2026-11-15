import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui'
import PhotoUploader, { type Photo } from '../../../components/evidence/PhotoUploader'
import PlantSelector, { type PlantaSeleccionable } from '../../plantas/components/PlantSelector'
import { getPlantaNombre } from '../../../utils/plantaNombre'
import { getUbicacionDisplay } from '../../../utils/ubicacion'
import SectionCard from '../components/event/SectionCard'
import CantidadInputCard from '../components/event/CantidadInputCard'
import FechaCard from '../components/event/FechaCard'
import ObservacionesCard from '../components/event/ObservacionesCard'
import EventoCTABar from '../components/event/EventoCTABar'
import { errorFotoIncorporacion, rangoIncorporacion, validarBase, validarFechaOperativa, type IncorporacionBase } from './incorporacion.contract'
import { useIncorporacionCatalogos } from './useIncorporacionCatalogos'

type Props = { token: string; responsable: string; onPrepare: (base: IncorporacionBase, labels: { vivero: string; planta: string; responsable: string }, files: File[]) => void; disabled: boolean }
export default function IncorporacionForm({ token, responsable, onPrepare, disabled }: Props) {
  const catalogos = useIncorporacionCatalogos(token)
  const [viveroId, setViveroId] = useState('')
  const [planta, setPlanta] = useState<PlantaSeleccionable | null>(null)
  const [modalidad, setModalidad] = useState<IncorporacionBase['modalidad']>('RECEPCION')
  const [procedencia, setProcedencia] = useState<IncorporacionBase['procedencia']>('COMPRA')
  const [fecha, setFecha] = useState(() => rangoIncorporacion().max)
  const [cantidad, setCantidad] = useState('')
  const [tercero, setTercero] = useState('')
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const urls = useRef(new Set<string>())
  const [fileError, setFileError] = useState<string | null>(null)
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  const range = rangoIncorporacion()
  const vivero = catalogos.data?.viveros.find(item => item.id === viveroId)
  const cantidadValida = /^[1-9]\d*$/.test(cantidad) && BigInt(cantidad) <= 2147483647n
  const valid = !!vivero && !!planta && cantidadValida && validarFechaOperativa(fecha) && photos.length >= 1 && photos.length <= 5 && !photos.some(photo => errorFotoIncorporacion(photo.file)) && (procedencia !== 'DESCONOCIDA' || !!observaciones.trim())
  const addPhotos = (files: File[]) => {
    const error = files.map(errorFotoIncorporacion).find(Boolean)
    setFileError(error ?? null)
    if (error) return
    const added = files.slice(0, 5 - photos.length).map(file => { const previewUrl = URL.createObjectURL(file); urls.current.add(previewUrl); return { file, previewUrl } })
    setPhotos(previous => [...previous, ...added])
  }
  const removePhoto = (index: number) => { const photo = photos[index]; URL.revokeObjectURL(photo.previewUrl); urls.current.delete(photo.previewUrl); setPhotos(previous => previous.filter((_, offset) => offset !== index)) }
  const prepare = () => {
    if (!valid || !vivero || !planta || disabled) return
    onPrepare(validarBase({ vivero_id: viveroId, planta_id: planta.id, modalidad, procedencia, fecha_evento: fecha, cantidad: Number(cantidad), tercero_origen: tercero, referencia_documental: referencia, observaciones }), { vivero: vivero.nombre, planta: getPlantaNombre(planta), responsable }, photos.map(photo => photo.file))
  }
  const section = (index: number, done: boolean) => ({ index, total: 5, status: { done, active: !done } })
  return <div className="space-y-4 pb-36">
    <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-800">Registra plantas vivas recibidas o un conteo inicial. Cada ingreso crea un lote nuevo de una sola especie y procedencia.</p>
    {catalogos.loading && <p role="status">Cargando viveros y especies…</p>}
    {catalogos.error && <div role="alert" className="space-y-2 rounded-2xl bg-danger-50 p-4"><p>{catalogos.error}</p><Button variant="secondary" onClick={catalogos.retry}>Reintentar catálogos</Button></div>}
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
      <SectionCard {...section(1, !!vivero && !!planta)} icon="vivero" title="Vivero y especie">
        <div className="space-y-3">
          {vivero ? <div className="flex justify-between gap-2 rounded-2xl bg-brand-50 p-3"><div><p className="font-bold">{vivero.nombre}</p><p className="text-xs">{vivero.codigo}</p><p className="text-xs">{getUbicacionDisplay(vivero.ubicacion)}</p></div><Button variant="secondary" size="sm" onClick={() => setViveroId('')}>Cambiar vivero</Button></div> : <label className="block text-sm font-bold">Vivero físico<select value={viveroId} onChange={event => setViveroId(event.target.value)} className="mt-2 w-full rounded-2xl border border-brand-100 bg-white p-3"><option value="">Elige un vivero…</option>{catalogos.data?.viveros.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.codigo}</option>)}</select></label>}
          {planta ? <div className="flex justify-between gap-2 rounded-2xl bg-brand-50 p-3"><div><p className="font-bold">{getPlantaNombre(planta)}</p><p className="text-xs italic">{planta.nombre_cientifico}</p><p className="text-xs">{planta.variedad || 'Variedad no registrada'}</p></div><Button variant="secondary" size="sm" onClick={() => setPlanta(null)}>Cambiar especie</Button></div> : <PlantSelector plantas={catalogos.data?.plantas ?? []} loading={catalogos.loading} onSelect={setPlanta} />}
        </div>
      </SectionCard>
      <SectionCard {...section(2, true)} icon="leaf" title="Modalidad y procedencia">
        <div className="space-y-3">
          <label className="block text-sm font-bold">Modalidad<select value={modalidad} onChange={event => { const value = event.target.value as IncorporacionBase['modalidad']; setModalidad(value); if (value === 'RECEPCION' && !['COMPRA', 'DONACION'].includes(procedencia)) setProcedencia('COMPRA') }} className="mt-2 w-full rounded-2xl border border-brand-100 bg-white p-3"><option value="RECEPCION">Recepción</option><option value="SALDO_INICIAL">Saldo inicial</option></select></label>
          <label className="block text-sm font-bold">Procedencia declarada<select value={procedencia} onChange={event => setProcedencia(event.target.value as IncorporacionBase['procedencia'])} className="mt-2 w-full rounded-2xl border border-brand-100 bg-white p-3"><option value="COMPRA">Compra</option><option value="DONACION">Donación</option>{modalidad === 'SALDO_INICIAL' && <><option value="PRODUCCION_PROPIA">Producción propia</option><option value="DESCONOCIDA">Desconocida</option></>}</select></label>
          <p className="text-xs text-neutral-600">{modalidad === 'SALDO_INICIAL' ? 'Ingresa las plantas contadas hoy, aunque la compra sea antigua. Describe los antecedentes en observaciones; no registres compras ni pérdidas ficticias.' : 'Registra la cantidad recibida físicamente en esta entrega.'}</p>
          {procedencia === 'PRODUCCION_PROPIA' && <p className="text-xs text-neutral-600">Sólo inventario existente. La producción nueva mantiene el recorrido desde Recolección.</p>}
        </div>
      </SectionCard>
      <SectionCard {...section(3, cantidadValida && validarFechaOperativa(fecha))} icon="date" title="Cantidad y fecha física">
        <div className="space-y-3">
          <CantidadInputCard value={cantidad} onChange={setCantidad} unidadDisplay="UNIDAD" label="Plantas recibidas o contadas" hint="Entero entre 1 y 2.147.483.647. No se registra peso." />
          {cantidad && !cantidadValida && <p role="alert" className="text-xs text-danger-600">Ingresa una cantidad entera entre 1 y 2.147.483.647.</p>}
          <FechaCard value={fecha} onChange={setFecha} min={range.min} max={range.max} label="Fecha física de recepción o conteo" hint="Hoy o hasta diez días atrás · La Paz" showError={!validarFechaOperativa(fecha)} errorMessage="La fecha debe estar dentro del rango indicado, sin futuro." />
        </div>
      </SectionCard>
      <SectionCard {...section(4, procedencia !== 'DESCONOCIDA' || !!observaciones.trim())} icon="report" title="Antecedentes y observaciones">
        <div className="space-y-3">
          <label className="block text-sm font-bold">Tercero de origen (opcional)<input value={tercero} maxLength={200} onChange={event => setTercero(event.target.value)} className="mt-2 w-full rounded-2xl border border-brand-100 p-3" /></label>
          <label className="block text-sm font-bold">Referencia documental (opcional)<input value={referencia} maxLength={200} onChange={event => setReferencia(event.target.value)} className="mt-2 w-full rounded-2xl border border-brand-100 p-3" /></label>
          <ObservacionesCard value={observaciones} onChange={setObservaciones} maxLength={1000} required={procedencia === 'DESCONOCIDA'} placeholder="Antecedentes, límites del conteo o fecha de compra antigua…" showError={procedencia === 'DESCONOCIDA' && !observaciones.trim()} errorMessage="Describe los antecedentes o el límite de la procedencia desconocida." />
        </div>
      </SectionCard>
      <SectionCard {...section(5, photos.length > 0)} icon="photo" title="Fotos de la recepción o conteo" hint="De 1 a 5 fotos originales · hasta 15 MiB cada una">
        <PhotoUploader photos={photos} onAdd={addPhotos} onRemove={removePhoto} max={5} required disabled={disabled} />
        {fileError && <p role="alert" className="text-xs text-danger-600">{fileError}</p>}
        <p className="mt-2 text-xs text-neutral-500">Adjunta fotos de las plantas. No subas facturas ni documentos sensibles. Al preparar se conservarán la solicitud y las fotos en este dispositivo para recuperar una carga interrumpida.</p>
      </SectionCard>
    </fieldset>
    <EventoCTABar label="Preparar fotos y revisar ingreso" disabled={!valid || disabled} onClick={prepare} hint="La carga de fotos todavía no incorpora plantas al stock." />
  </div>
}
