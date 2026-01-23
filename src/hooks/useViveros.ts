import { useEffect, useState } from 'react';
import { RecoleccionService } from '../services/recoleccion.service';
import type { Vivero } from '../services/recoleccion.service';

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
        const response = await RecoleccionService.getViveros();
        if (isMounted) {
          setViveros(response.data || []);
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
