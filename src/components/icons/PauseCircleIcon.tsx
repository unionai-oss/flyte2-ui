/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

export function PauseCircleIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path
        d="M6.25 6L6.25 10"
        stroke="var(--system-black)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.75 6L9.75 10"
        stroke="var(--system-black)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
