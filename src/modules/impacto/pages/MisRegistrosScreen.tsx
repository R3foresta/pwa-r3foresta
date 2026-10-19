import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import { useAuth } from '../../../contexts/AuthContext'
import { ImpactoService } from '../api/impacto.api'
import type { MisRegistro } from '../types'

type Reading = { records: MisRegistro[]; cursor: string | null; loading: boolean; error: string | null; recoverSession: boolean; loaded: boolean; retryCursor?: string }
const EMPTY: Reading = { records: [], cursor: null, loading: true, error: null, recoverSession: false, loaded: false }

export default function MisRegistrosScreen() {
  const { user, isAuthenticated } = useAuth()
  const token = localStorage.getItem('authToken')
  const identity = `${user?.auth_id ?? ''}:${user?.id ?? ''}:${token ?? ''}`
  return <AccountMisRegistros key={identity} enabled={Boolean(user && isAuthenticated && token)} />
}

function AccountMisRegistros({ enabled }: { enabled: boolean }) {
  const { login } = useAuth()
  const [reading, setReading] = useState<Reading>(EMPTY)
  const activeRequest = useRef<AbortController | null>(null)
  const cursors = useRef(new Set<string>())
  const load = useCallback(async (cursor?: string) => {
    if (!enabled || activeRequest.current) return
    const controller = new AbortController()
    activeRequest.current = controller
    setReading(previous => ({ ...previous, loading: true, error: null, recoverSession: false }))
    try {
      const response = await ImpactoService.misRegistros({ limite: 20, ...(cursor ? { cursor } : {}) }, controller.signal)
      if (controller.signal.aborted) return
      if (cursor && response.data.siguiente_cursor && (response.data.siguiente_cursor === cursor || cursors.current.has(response.data.siguiente_cursor))) throw new Error('La lista cambió durante la consulta. Actualiza tus registros para continuar.')
      if (cursor) cursors.current.add(cursor)
      else cursors.current.clear()
      setReading(previous => {
        const records = new Map((cursor ? previous.records : []).map(record => [record.id, record]))
        for (const record of response.data.registros) {
          const existing = records.get(record.id)
          records.set(record.id, existing ? { ...record, relaciones: [...new Set([...existing.relaciones, ...record.relaciones])] } : record)
        }
        return { records: [...records.values()], cursor: response.data.siguiente_cursor, loading: false, error: null, recoverSession: false, loaded: true }
      })
    } catch (error) {
      if (controller.signal.aborted) return
      const recoverSession = error instanceof Error && 'status' in error && (error.status === 401 || error.status === 403)
      setReading(previous => ({ ...previous, ...(recoverSession ? { records: [], loaded: false, cursor: null } : {}), loading: false, error: error instanceof Error ? error.message : 'No pudimos consultar tus registros.', recoverSession, retryCursor: cursor }))
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null
    }
  }, [enabled])
  useEffect(() => {
    void load()
    return () => { activeRequest.current?.abort(); activeRequest.current = null }
  }, [load])
  const returnState = { impactoReturnTo: '/app/participacion/mis-registros' }
  return <main className="mx-auto max-w-3xl space-y-5 px-5 pb-28 pt-6">
    <PageHeader title="Mis registros" eyebrow="Mi participación" backTo="/impacto" />
    <p className="text-sm leading-6 text-neutral-600">Plantaciones que registraste o en las que figuras como participante histórico. La cantidad pertenece al grupo completo; no representa crédito individual.</p>
    <Link to="/impacto" className="inline-flex text-sm font-semibold text-brand-700 underline">Consultar impacto global</Link>
    {!enabled ? <Card className="space-y-3"><p className="text-sm">Necesitas una sesión verificada para consultar tus registros.</p><Button onClick={() => { void login().catch(() => undefined) }}>Recuperar sesión</Button></Card> : <>
      {reading.loading && <p role="status" className="text-sm text-neutral-600">Consultando tus registros…</p>}
      {reading.error && <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">{reading.error}</p><Button variant="secondary" onClick={() => { if (reading.recoverSession) void login().then(() => load()).catch(() => undefined); else void load(reading.retryCursor) }}>{reading.recoverSession ? 'Recuperar sesión' : 'Reintentar consulta'}</Button></Card>}
      {reading.loaded && !reading.records.length && !reading.loading && !reading.error && <Card><p className="text-sm leading-6">Todavía no hay registros donde figures como autor o participante. Tu habilitación para registrar se consulta por separado.</p></Card>}
      {reading.records.length > 0 && <ul className="space-y-4">{reading.records.map(record => {
        const author = record.relaciones.includes('AUTOR')
        const destination = author || !record.url_publica ? `/app/participacion/registros/${record.id}` : `/impacto/registros/${record.id}`
        return <li key={record.id}><Card as="article" className="space-y-3">
          <div className="flex flex-wrap gap-2">{author && <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">Registré</span>}{record.relaciones.includes('PARTICIPANTE') && <span className="rounded-full bg-info-50 px-3 py-1 text-xs font-semibold text-info-700">Participé</span>}</div>
          <h2 className="break-words font-bold text-brand-800">{record.codigo_trazabilidad}</h2>
          <p className="text-sm text-neutral-700">{record.fecha_plantacion} · {record.cantidad_total_plantada} plantas del grupo · {record.es_reposicion ? 'Reposición' : 'Plantación inicial'}</p>
          <p className="text-xs text-neutral-500">Subcampaña {record.subcampania_id}. La relación histórica se conserva aunque se retire la habilitación operativa.</p>
          <div className="flex flex-wrap gap-4"><Link to={destination} state={returnState} className="inline-flex text-sm font-semibold text-brand-700 underline">{author ? 'Ver mi registro guardado' : record.url_publica ? 'Ver registro público' : 'Ver registro histórico permitido'}</Link>{author && record.url_publica && <Link to={`/impacto/registros/${record.id}`} state={returnState} className="inline-flex text-sm font-semibold text-brand-700 underline">Ver registro público</Link>}</div>
        </Card></li>
      })}</ul>}
      {reading.loaded && !reading.recoverSession && <div className="flex flex-wrap gap-3">{reading.cursor && <Button disabled={reading.loading} onClick={() => { void load(reading.cursor ?? undefined) }}>Cargar más registros</Button>}<Button variant="secondary" disabled={reading.loading} onClick={() => { void load() }}>Actualizar mis registros</Button></div>}
    </>}
  </main>
}
