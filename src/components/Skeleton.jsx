export function ListSkeleton({ rows = 6 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton skeleton-circle" />
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line" style={{ width: `${52 + ((i * 13) % 30)}%` }} />
            <div className="skeleton skeleton-line" style={{ width: `${28 + ((i * 7) % 18)}%`, height: 9 }} />
          </div>
          <div className="skeleton skeleton-line" style={{ width: 54, height: 13 }} />
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ height = 150 }) {
  return <div className="skeleton" style={{ height, margin: '0 20px 10px', borderRadius: 'var(--r-sm)' }} aria-busy="true" />
}
