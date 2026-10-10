interface StampProps {
  text: string
  ink: string
  /** Changing the key re-presses the stamp. */
  pressKey: string
  size?: 'lg' | 'md'
}

/** The verdict as a calm status badge; the key re-mounts it when filters change. */
export function Stamp({ text, ink, pressKey, size = 'lg' }: StampProps) {
  return (
    <div
      key={pressKey}
      className={`status-badge inline-flex w-fit items-center rounded-full font-semibold select-none ${
        size === 'lg' ? 'px-4 py-2 text-[clamp(1.35rem,3vw,1.8rem)]' : 'px-3 py-1.5 text-[1.1rem]'
      }`}
      style={{
        color: ink,
        backgroundColor: `color-mix(in srgb, ${ink} 10%, white)`,
        border: `1px solid color-mix(in srgb, ${ink} 28%, white)`,
      }}
    >
      {text}
    </div>
  )
}
