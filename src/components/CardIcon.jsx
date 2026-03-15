export default function CardIcon({ className = 'w-16 h-16' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="8"
        y="4"
        width="48"
        height="56"
        rx="6"
        fill="#22c55e"
        fillOpacity="0.2"
        stroke="#22c55e"
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="8" fill="#22c55e" />
      <rect x="14" y="12" width="12" height="16" rx="2" fill="#22c55e" fillOpacity="0.5" />
      <rect x="38" y="36" width="12" height="16" rx="2" fill="#22c55e" fillOpacity="0.5" />
    </svg>
  );
}
