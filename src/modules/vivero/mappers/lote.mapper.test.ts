import { describe, expect, it } from 'vitest'
import { mapLoteToCardData, mapLoteToDetailView, mapTimelineEventToView, normalizeLoteIds } from './lote.mapper'
import { BIG_A, BIG_B, eventoFixture, loteFixture, m1LoteFixture } from '../t5.test-fixtures'
import { daysSinceViveroDate, formatViveroDate, origenLabel } from '../utils/presentation'

describe('lecturas T5 y continuidad M1', () => {
  it('preserva material y saldo nulos sin respaldo por cantidad inicial o stock legado', () => {
    const detail = mapLoteToDetailView(loteFixture({ saldo_vivo_actual: null, stock_vivo_actual: 210 }))
    expect(detail.cantidadInicialEnProceso).toBeNull()
    expect(detail.unidadMedidaInicial).toBeNull()
    expect(detail.recoleccionId).toBeNull()
    expect(detail.recoleccionCodigo).toBeNull()
    expect(detail.saldoVivoActual).toBeNull()
    expect(mapLoteToCardData(loteFixture({ saldo_vivo_actual: null, stock_vivo_actual: 210 })).cantidadActual).toBeNull()
  })
  it('mantiene IDs vecinos exactos y rechaza un Number que ya perdió precisión', () => {
    expect([BIG_A, BIG_B].map(id => mapLoteToCardData(loteFixture({ id })).id)).toEqual([BIG_A, BIG_B])
    expect(normalizeLoteIds(loteFixture({ id: 42 })).id).toBe('42')
    expect(() => normalizeLoteIds(loteFixture({ id: Number(BIG_B) }))).toThrow()
    expect(() => mapTimelineEventToView(eventoFixture('INCORPORACION', { id: Number(BIG_B) }))).toThrow()
    expect(() => mapTimelineEventToView(eventoFixture('INCORPORACION', { evidencias: [{ id: Number(BIG_B) }] }))).toThrow()
  })
  it('prioriza snapshots y conserva ausencias, sin catálogo ni nombre actual', () => {
    const detail = mapLoteToDetailView(loteFixture())
    expect([detail.especie, detail.variedad, detail.responsableNombre]).toEqual(['Nombre histórico', 'Variedad histórica', 'Responsable histórico'])
    const missing = mapLoteToDetailView(loteFixture({ nombre_comercial_snapshot: null, nombre_cientifico_snapshot: null, variedad_snapshot: null, nombre_responsable_snapshot: null }))
    expect(missing.especie).toBe('Especie no registrada')
    expect(missing.variedad).toBeNull()
    expect(missing.responsableNombre).toBe('Responsable inicial no registrado')
  })
  it('lee las cantidades reales de INICIO, EMBOLSADO, incorporación y devolución', () => {
    const inicio = mapTimelineEventToView(eventoFixture('INICIO', { payload: { cantidad_inicial: 5, unidad_medida: 'G' }, evidencias: [] }))
    expect(inicio.materialIngresado).toBe('5 G')
    expect(inicio.saldoDespues).toBeNull()
    expect(mapLoteToDetailView(m1LoteFixture()).plantasVivasIniciales).toBeNull()
    expect(mapTimelineEventToView(eventoFixture('EMBOLSADO', { payload: { plantas_vivas_iniciales: 22 } })).cantidad).toBe(22)
    expect(mapTimelineEventToView(eventoFixture()).cantidad).toBe(210)
    const devolucion = mapTimelineEventToView(eventoFixture('DEVOLUCION_PLANTACION', { payload: { cantidad_afectada: 5, saldo_vivo_antes: 0, saldo_vivo_despues: 5 } }))
    expect([devolucion.cantidad, devolucion.saldoAntes, devolucion.saldoDespues]).toEqual([5, 0, 5])
  })
  it('conserva tipos desconocidos y no infiere origen desde el código', () => {
    expect(mapTimelineEventToView(eventoFixture('EVENTO_FUTURO')).conocido).toBe(false)
    expect(mapLoteToDetailView(loteFixture({ origen: null })).origen).toBeNull()
    expect(origenLabel(loteFixture().origen ?? null)).toBe('Saldo inicial · Donación')
  })
  it('mantiene DATE sin desplazamiento y cuenta días en La Paz', () => {
    expect(formatViveroDate('2026-11-12')).toMatch(/^12/)
    expect(daysSinceViveroDate('2026-11-12', new Date('2026-11-13T02:00:00Z'))).toBe(0)
  })
  it('preserva firma y TTL y nunca usa public_url de un bucket privado', () => {
    const photo = mapTimelineEventToView(eventoFixture()).fotos![0]
    expect(photo.url).toContain('/signed/')
    expect(photo.expiraEn).toBeGreaterThan(Date.now() + 290000)
    expect(photo.tamanoBytes).toBeNull()
    expect(mapTimelineEventToView(eventoFixture('INCORPORACION', { evidencias: [{ id: '10', bucket: 'vivero_incorporaciones', public_url: 'https://example.test/no-usar' }] })).fotos![0].url).toBeNull()
  })
})
