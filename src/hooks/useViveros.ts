import { useEffect, useState } from 'react';
import { RecoleccionesV2Service } from '../services/recolecciones-v2.service';
import type { ViveroCatalogo as Vivero } from '../services/recolecciones-v2.service';

export function useViveros() {
  const [viveros, setViveros] = useState<Vivero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadViveros = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await RecoleccionesV2Service.getViveros();
        if (isMounted) {
          setViveros(response || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar viveros');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadViveros();

    return () => {
      isMounted = false;
    };
  }, []);

  return { viveros, loading, error };
}
