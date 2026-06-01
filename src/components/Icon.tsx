export type IconName =
  | 'bell'
  | 'dot'
  | 'home'
  | 'scan'
  | 'report'
  | 'user'
  | 'search'
  | 'leaf'
  | 'vivero'
  | 'cutting'
  | 'plus'
  | 'minus'
  | 'arrow-left'
  | 'pin'
  | 'chevron-down'
  | 'photo'
  | 'info'
  | 'balance'
  | 'package'
  | 'date'
  | 'qr'
  | 'trash'
  | 'check'
  | 'x'
  | 'planting'
  | 'map'
  | 'sunny'
  | 'truck'
  | 'trending-up'
  | 'chevron-right'
  | 'loss'
  | 'shield'
  | 'activity'
  | 'hash'
  | 'box'
  | 'sun'
  | 'flag'
  | 'arrow-down'
  | 'file'

type Props = {
  name: IconName
  className?: string
}

function Icon({ name, className }: Props) {
  const common = 'stroke-current'
  
  switch (name) {
    case 'bell':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-2.5 0-4.5 2-4.5 4.5v1.2c0 .5-.2 1-.5 1.4l-.9 1.1c-.6.8-.1 1.9.9 1.9h10c1 0 1.5-1.1.9-1.9l-.9-1.1c-.3-.4-.5-.9-.5-1.4V9c0-2.5-2-4.5-4.5-4.5Z" />
          <path strokeLinecap="round" d="M10 19c.3.6.9 1 1.6 1s1.3-.4 1.6-1" />
        </svg>
      )
    case 'dot':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
      )
    case 'home':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 7.2-6.4a1 1 0 0 1 1.4 0l7.4 6.6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 10.5v8.5a.5.5 0 0 0 .5.5h3.5v-5h3v5H17a.5.5 0 0 0 .5-.5v-8.5" />
        </svg>
      )
    case 'scan':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V6a2 2 0 0 1 2-2h3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 0 0 2 2h3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 4h1a2 2 0 0 1 2 2v3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h1a2 2 0 0 0 2-2v-3" />
          <rect x="8" y="9" width="8" height="6" rx="1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12h3" />
        </svg>
      )
    case 'report':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path strokeLinecap="round" d="M9 9.5h6" />
          <path strokeLinecap="round" d="M9 13h6" />
          <path strokeLinecap="round" d="M9 16.5h3" />
        </svg>
      )
    case 'user':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 19a5.5 5.5 0 0 1 11 0" />
        </svg>
      )
    case 'search':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <circle cx="11" cy="11" r="6.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 15.5 3 3" />
        </svg>
      )
    case 'leaf':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 5s-3 0-6 1.6C9 8 6 10.5 6 13c0 3 2.5 5 5.5 5 2.5 0 4.5-2 4.5-4.5C16 10 18 5 18 5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5 8 11" />
        </svg>
      )
    case 'vivero':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 19.5h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-6.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13Q9 13 9 9Q12 9 12 13Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5Q15 13.5 15 9.5Q12 9.5 12 13.5Z" />
        </svg>
      )
    case 'cutting':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="7" cy="17" r="2.2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 7 10-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 17 10 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 9-5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 9 5" />
        </svg>
      )
    case 'plus':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path strokeLinecap="round" d="M12 5v14" />
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      )
    case 'minus':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path strokeLinecap="round" d="M5 12h14" />
        </svg>
      )
    case 'arrow-left':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5 8 12l7 7" />
        </svg>
      )
    case 'pin':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      )
    case 'photo':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l2-3 3 5 2-3 2 3h4" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'info':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6" />
          <circle cx="12" cy="8" r="0.8" fill="currentColor" />
        </svg>
      )
    case 'balance':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9 4 15h8L10 9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 9 12 15h8l-2-6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V6" />
          <circle cx="12" cy="4.5" r="1.2" fill="currentColor" />
          <path strokeLinecap="round" d="M5 19h14" />
        </svg>
      )
    case 'package':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12 4 8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 12 8-4" />
        </svg>
      )
    case 'date':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4" />
        </svg>
      )
    case 'qr':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="15" y="15" width="3" height="3" rx="0.5" fill="currentColor" />
        </svg>
      )
    case 'trash':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
        </svg>
      )
    case 'check':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'x':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
        </svg>
      )
    case 'planting':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.5-10 1.5-14.5 0 0 1.5 1.5 1.5 5 0 0 4-1.5 4-5.5" />
          <path d="M10 13c-2.5-2.5-5-2-5-2s1.5 3 3 4" />
        </svg>
      )
    case 'map':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4L4 6v14l5-2m0-14l6 2m-6-2v14m6-14l5-2v14l-5 2m0-14v14" />
        </svg>
      )
    case 'sunny':
    case 'sun':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )
    case 'truck':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2" />
          <circle cx="7.5" cy="17.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      )
    case 'trending-up':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M23 6l-9.5 9.5-5-5L1 18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 6h6v6" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      )
    case 'loss':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M23 18l-9.5-9.5-5 5L1 6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 18h6v-6" />
        </svg>
      )
    case 'shield':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    case 'activity':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      )
    case 'hash':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
        </svg>
      )
    case 'box':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22.08V12" />
        </svg>
      )
    case 'flag':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 22v-7" />
        </svg>
      )
    case 'arrow-down':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      )
    case 'file':
      return (
        <svg className={`${common} ${className ?? ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 2v7h7" />
        </svg>
      )
    default:
      return null
  }
}

export default Icon