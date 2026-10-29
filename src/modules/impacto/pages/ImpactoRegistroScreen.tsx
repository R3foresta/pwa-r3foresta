import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, PageHeader } from '../../../components/ui'
import { ImpactoService } from '../api/impacto.api'
import ImpactoRegistroContent from '../components/ImpactoRegistroContent'
import ImpactoShare from '../components/ImpactoShare'
import { useImpactoPageTitle } from '../hooks/useImpactoPageTitle'
import { useImpactoPageFocus } from '../hooks/useImpactoPageFocus'
import type { ImpactoRegistro } from '../types'
import { impactoErrorMessage, impactoErrorStatus, safeCampaniaMapReturn, safeImpactoReturn } from '../utils/consulta'

export default function ImpactoRegistroScreen() {
  const { registroId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useImpactoPageFocus()
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: object; data: ImpactoRegistro | null; error: unknown } | null>(null)
  const invalidQuery = new URLSearchParams(location.search).size > 0
  const key = useMemo(() => ({ registroId, search: location.search, revision }), [registroId, location.search, revision])
  useEffect(() => {
    if (!registroId || invalidQuery) return
    const controller = new AbortController()
    ImpactoService.registro(registroId, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ key, data, error: null })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, data: null, error })
    })
    return () => controller.abort()
  }, [registroId, key, invalidQuery])
  const current = result?.key === key ? result : null
  const data = current?.data
  useImpactoPageTitle(data ? `Plantación en ${data.subcampania_nombre}` : 'Plantación pública')
  const backTo = safeImpactoReturn(location.state?.impactoReturnTo) ?? (data ? `/impacto/subcampanias/${data.subcampania_id}` : '/impacto')
  const returnSubcampaniaId = /^\/app\/planting\/subcampanias\/([1-9][0-9]*)\?pestana=mapa(?:&registro=[1-9][0-9]*)?$/.exec(backTo)?.[1]
  // Sólo transportar el destino canónico al mismo detalle. Antes de cargar el
  // registro, el detalle revalidará la campaña contra su propia lectura interna.
  const campaignReturn = returnSubcampaniaId && (!data || data.subcampania_id === returnSubcampaniaId)
    ? safeCampaniaMapReturn(location.state?.campaniaReturnTo, data?.campania_id, returnSubcampaniaId)
    : null
  const goBack = () => navigate(backTo, { state: campaignReturn ? { campaniaReturnTo: campaignReturn } : undefined })
  const publicPath = `/impacto/registros/${registroId ?? ''}`
  return <main ref={mainRef} className="mx-auto max-w-3xl space-y-4 px-4 pb-36 pt-6">
    <PageHeader title="Registro público" eyebrow="Impacto · Plantación" subtitle="Las plantas, las fotos y el equipo de esta plantación" onBack={goBack} />
    <nav aria-label="Consulta pública" className="flex flex-wrap gap-4 text-sm font-bold text-brand-700"><Link to="/impacto" className="inline-flex min-h-11 items-center underline underline-offset-4">Impacto global</Link><ImpactoShare key={publicPath} path={publicPath} title={data?.codigo_trazabilidad ?? 'Registro público de plantación'} /></nav>
    {invalidQuery ? <Card className="space-y-3"><p role="alert" className="text-sm text-danger-700">El detalle público no admite filtros en el enlace.</p><Link className="inline-flex min-h-11 items-center text-sm font-bold text-brand-700 underline" to={publicPath} state={{ impactoReturnTo: backTo, ...(campaignReturn ? { campaniaReturnTo: campaignReturn } : {}) }}>Abrir enlace sin filtros</Link></Card> : !registroId ? <Card><p role="alert" className="text-sm text-danger-700">El enlace no identifica un registro.</p></Card> : !current ? <Card><p role="status" className="text-sm text-neutral-600">Consultando registro público…</p></Card> : null}
    {current?.error ? <Card className="space-y-3"><h2 className="font-bold text-brand-800">{impactoErrorStatus(current.error) === 404 ? 'Registro público no disponible' : 'No se pudo consultar el registro'}</h2><p role="alert" className="text-sm text-danger-700">{impactoErrorStatus(current.error) === 404 ? 'El registro no existe o no está disponible para consulta pública.' : impactoErrorMessage(current.error)}</p><Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>Reintentar consulta</Button></Card> : null}
    {data && <ImpactoRegistroContent data={data} returnTo={publicPath} />}
  </main>
}
