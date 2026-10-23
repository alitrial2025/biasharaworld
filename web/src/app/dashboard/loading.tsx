export default function Loading() {
  return (
    <div className="workspace-loading" role="status">
      <div className="loading-shimmer" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="loading-shimmer" key={i} />
        ))}
      </div>
      <div className="loading-shimmer tall" />
      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}
