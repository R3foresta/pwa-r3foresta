import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../../../components/ui'
import { imagenPublicaUrl } from '../api/impacto.api'
import type { ImpactoRegistro } from '../types'
import { formatImpactoDate, formatImpactoNumber } from '../utils/consulta'

export function PublicPhoto({ id, cover = false, decorative = false }: { id: string; cover?: boolean; decorative?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return <figure className="min-w-0 space-y-2">
    <div className={`relative overflow-hidden bg-neutral-50 ${cover ? 'h-32' : 'h-64 rounded-2xl sm:h-80'}`}>
      {failed ? <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
        <p role="status" className="text-xs text-neutral-600">No se pudo cargar esta foto pública.</p>
        <Button tabIndex={decorative ? -1 : undefined} className="min-h-11" size="sm" variant="secondary" onClick={() => { setLoaded(false); setFailed(false) }}>Reintentar foto</Button>
      </div> : <>
        {!loaded && <p role={decorative ? undefined : 'status'} className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">Cargando foto…</p>}
        <img src={imagenPublicaUrl(id)} alt={`Foto pública del registro, evidencia ${id}`} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={`relative h-full w-full ${cover ? 'object-cover' : 'object-contain'}`} />
      </>}
    </div>
    {!cover && <figcaption className="text-xs text-neutral-500">Foto pública {id}</figcaption>}
  </figure>
}

export default function ImpactoRegistroContent({ data, returnTo }: { data: ImpactoRegistro; returnTo: string }) {
  const follow = data.seguimiento
  return <>
    <Card as="section" className="space-y-3">
      <h2 className="break-words text-xl font-bold text-brand-800">Plantación en {data.subcampania_nombre}</h2>
      <p className="text-sm text-neutral-600">Registro {data.id} · {formatImpactoDate(data.fecha_plantacion)}</p>
      <p className="break-words text-sm text-neutral-600">Trazabilidad: <span>{data.codigo_trazabilidad}</span></p>
      <p className="text-3xl font-extrabold text-brand-800">{formatImpactoNumber(data.cantidad_total_plantada)} <span className="text-base font-semibold">plantas {data.es_reposicion ? 'de reposición' : 'de plantación inicial'}</span></p>
      <p className="text-sm text-neutral-600">Cantidad del registro grupal, sin reparto individual por persona u organización.</p>
      <div className="flex flex-wrap gap-3 text-sm font-bold text-brand-700"><Link to={`/impacto/campanias/${data.campania_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center break-words underline underline-offset-4">{data.campania_nombre}</Link><Link to={`/impacto/subcampanias/${data.subcampania_id}`} state={{ impactoReturnTo: returnTo }} className="inline-flex min-h-11 items-center break-words underline underline-offset-4">{data.subcampania_nombre}</Link></div>
      {data.registro_plantacion_origen_id && <Link className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline underline-offset-4" to={`/impacto/registros/${data.registro_plantacion_origen_id}`} state={{ impactoReturnTo: returnTo }}>Consultar registro de origen {data.registro_plantacion_origen_id}</Link>}
    </Card>
    <Card as="section" className="space-y-3"><h2 className="font-bold text-brand-800">Fotos públicas</h2>{data.fotos.length ? <div className="grid gap-4 sm:grid-cols-2">{data.fotos.map((photo) => <PublicPhoto key={photo.id} id={photo.id} />)}</div> : <p className="text-sm text-neutral-600">Todavía no hay fotos disponibles para mostrar en este registro.</p>}</Card>
    <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Especies registradas</h2><ul className="space-y-2">{data.especies.map((species) => <li key={species.planta_id} className="flex justify-between gap-3 text-sm text-neutral-700"><span className="min-w-0 break-words">{species.nombre ?? 'Nombre histórico no disponible'}</span><strong className="shrink-0">{formatImpactoNumber(species.cantidad)} plantas</strong></li>)}</ul></Card>
    <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Ubicación del registro</h2><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4" to={`/impacto/subcampanias/${data.subcampania_id}?seleccion=r%3A${data.id}`} state={{ impactoReturnTo: returnTo }}>Ver esta plantación en el mapa</Link><p className="break-words text-xs text-neutral-500">GPS: {data.latitud}, {data.longitud}</p><p className="text-sm text-neutral-600">{data.gps_dentro_poligono ? 'Dentro del polígono de trabajo.' : 'Ubicación exterior al polígono registrada.'}</p></Card>
    <Card as="section" className="space-y-3"><h2 className="font-bold text-brand-800">Personas y afiliación al plantar</h2><p className="text-xs text-neutral-500">Información histórica conservada en este registro.</p><ul className="divide-y divide-neutral-100">{data.personas.map((person, index) => <li key={index} className="space-y-1 py-3 text-sm"><p className="font-bold text-brand-800">{person.nombre ?? 'Nombre histórico no disponible'} · {person.es_responsable ? 'Responsable' : 'Participante'}</p><p className="text-neutral-600">{person.afiliacion.estado === 'NO_DECLARADA' ? 'Afiliación no declarada' : person.afiliacion.estado === 'HISTORICA_NO_DISPONIBLE' ? 'Afiliación histórica no disponible' : person.afiliacion.nombre ?? 'Nombre de afiliación histórica no disponible'}</p></li>)}</ul></Card>
    <Card as="section" className="space-y-2"><h2 className="font-bold text-brand-800">Organizaciones de la campaña</h2>{data.organizaciones_campania.length ? <ul className="space-y-1 text-sm text-neutral-700">{data.organizaciones_campania.map((organization) => <li key={organization.id}>{organization.nombre}</li>)}</ul> : <p className="text-sm text-neutral-600">Sin organizaciones de campaña informadas.</p>}<p className="text-xs text-neutral-500">Contexto de la campaña; no sustituye afiliaciones históricas ni atribuye el total a cada organización.</p></Card>
    <Card as="section"><details><summary className="min-h-11 cursor-pointer py-3 font-bold text-brand-800">Seguimiento del registro: bajas y reposiciones</summary><div className="mt-4 space-y-4 text-sm text-neutral-700"><p>Historial auditable de hechos registrados.</p><p>Bajas reportadas: <strong>{formatImpactoNumber(follow.bajas_reportadas)}</strong> · Reposiciones registradas: <strong>{formatImpactoNumber(follow.reposiciones_registradas)}</strong></p><section className="space-y-2"><h3 className="font-bold text-brand-800">Bajas reportadas</h3>{follow.bajas.length ? <ul className="space-y-2">{follow.bajas.map((event) => <li key={event.evento_id}>{formatImpactoDate(event.fecha)} · {formatImpactoNumber(event.cantidad)} plantas · Evento {event.evento_id}</li>)}</ul> : <p>{follow.bajas_reportadas ? 'El acumulado está disponible; no se conservan fechas de sus eventos históricos.' : 'Sin bajas reportadas.'}</p>}</section><section className="space-y-2"><h3 className="font-bold text-brand-800">Reposiciones vinculadas</h3>{follow.reposiciones.length ? <ul className="space-y-2">{follow.reposiciones.map((record) => <li key={record.registro_id}>{formatImpactoDate(record.fecha)} · {formatImpactoNumber(record.cantidad)} plantas · <Link className="font-bold text-brand-700 underline underline-offset-4" to={`/impacto/registros/${record.registro_id}`} state={{ impactoReturnTo: returnTo }}>Registro {record.registro_id}</Link></li>)}</ul> : <p>{follow.reposiciones_registradas ? 'El acumulado está disponible; no se conservan fechas de sus registros históricos.' : 'Sin reposiciones vinculadas.'}</p>}</section><p className="text-xs text-neutral-500">Estos indicadores se presentan por separado de la plantación inicial; no acreditan supervivencia comprobada.</p></div></details></Card>
  </>
}
