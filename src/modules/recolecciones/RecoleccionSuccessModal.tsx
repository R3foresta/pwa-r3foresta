// ============================================================================
// RecoleccionSuccessModal.tsx
// ============================================================================
// Modal de confirmación que se muestra después de crear exitosamente una recolección
// Ofrece opciones para ver el registro en blockchain o volver al menú principal
// ============================================================================

// ============================================================================
// RecoleccionSuccessModal.tsx
// ============================================================================
// Modal de confirmación que se muestra después de crear exitosamente una recolección
// Ofrece opciones para ver el registro en blockchain o volver al menú principal
// ============================================================================

/**
 * Props del modal de éxito
 */
type Props = {
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  summaryText?: string;
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

/**
 * Modal de confirmación de registro exitoso
 * Se muestra después de que la recolección se guarda correctamente en el backend
 * 
 * @param {Props} props - Handlers y texto resumen
 */
function RecoleccionSuccessModal({
  onPrimaryAction,
  onSecondaryAction,
  summaryText,
  title,
  description,
  primaryLabel,
  secondaryLabel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          <h2 className="text-center text-2xl font-extrabold text-neutral-800">
            {title ?? 'Operación completada'}
          </h2>

          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-success-100">
            <svg
              className="h-20 w-20 text-success-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="text-center">
            {description && (
              <p className="text-sm font-semibold text-neutral-600">
                {description}
              </p>
            )}
            <p className="mt-1 text-lg font-extrabold text-neutral-800">
              {summaryText ?? 'Registro actualizado'}
            </p>
          </div>

          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="w-full rounded-2xl bg-brand-500 py-4 text-center text-base font-extrabold text-white shadow-soft transition hover:bg-brand-600 active:scale-[0.99]"
            >
              {primaryLabel ?? 'Volver al listado'}
            </button>

            {onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="w-full rounded-2xl border-2 border-neutral-300 bg-white py-4 text-center text-base font-extrabold text-neutral-700 shadow-soft transition hover:bg-neutral-50 active:scale-[0.99]"
              >
                {secondaryLabel ?? 'Registrar otra recolección'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecoleccionSuccessModal;
