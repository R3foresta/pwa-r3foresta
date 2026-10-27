type NombrePlanta = {
  nombre_comun_principal?: string | null
  nombre_cientifico?: string | null
}

/** Nombre operativo del catálogo vivo; los históricos conservan sus snapshots. */
export function getPlantaNombre(planta: NombrePlanta, fallback = 'Planta sin nombre'): string {
  return planta.nombre_comun_principal?.trim() || planta.nombre_cientifico?.trim() || fallback
}
