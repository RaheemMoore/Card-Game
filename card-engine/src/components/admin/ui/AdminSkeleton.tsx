export interface AdminSkeletonProps {
  className?: string;
  /** Number of stacked lines; omit for a single block. */
  lines?: number;
}

// Loading placeholder. Uses a subtle pulse; respects reduced-motion by
// falling back to a static tint (prefers-reduced-motion handled in index.css
// keyframes — the animate-pulse utility is disabled there when reduced).
export function AdminSkeleton({ className = '', lines }: AdminSkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded animate-pulse"
            style={{ background: 'rgba(255,255,255,0.07)', width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }
  return <div className={`rounded animate-pulse ${className}`} style={{ background: 'rgba(255,255,255,0.07)' }} aria-hidden />;
}
