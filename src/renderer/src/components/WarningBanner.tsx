export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="banner">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  )
}
