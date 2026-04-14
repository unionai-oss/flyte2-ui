/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

export const ErrorText = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <span className={`text-sm/6 text-[#F87171] ${className}`}>{children}</span>
  )
}
