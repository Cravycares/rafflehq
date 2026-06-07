export function LogoMark({ size = 32 }: { size?: number }) {
  const s = size
  const cx = s / 2
  const points = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 90)
      return `${cx + r * Math.cos(angle)},${cx / (s / 2) * (s / 2) + r * Math.sin(angle) * (s / size)}`
    }).join(" ")

  const outerR = s * 0.46
  const innerR = s * 0.3
  const dotR = s * 0.055

  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2
      return `${cx + r * Math.cos(a)},${cx + r * Math.sin(a)}`
    }).join(" ")

  const dots = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return { x: cx + outerR * Math.cos(a), y: cx + outerR * Math.sin(a) }
  })

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <polygon points={hex(outerR)} fill="#0e0514" stroke="#7c3aed" strokeWidth={s * 0.028}/>
      <polygon points={hex(innerR)} fill="#7c3aed" fillOpacity="0.18" stroke="#8b5cf6" strokeWidth={s * 0.012}/>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={dotR} fill="#a78bfa"/>
      ))}
      <text
        x={cx} y={cx + s * 0.13}
        fontSize={s * 0.38} fontWeight="700"
        fill="#c4b5fd" textAnchor="middle"
        fontFamily="sans-serif"
      >R</text>
    </svg>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.25 }}>
      <LogoMark size={size} />
      <span style={{
        fontSize: size * 0.56,
        fontWeight: 700,
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}>
        <span style={{ color: "#ffffff" }}>Raffle</span>
        <span style={{ color: "#8b5cf6" }}>HQ</span>
      </span>
    </div>
  )
}