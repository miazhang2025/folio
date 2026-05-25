import Lottie from 'lottie-react'
import bookLoaderData from '../../assets/Book Loader.json'

interface LoaderProps {
  size?: number
  label?: string
}

/** Full-panel loading indicator using the Book Loader animation. */
export function Loader({ size = 80, label }: LoaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Lottie
        animationData={bookLoaderData}
        loop
        style={{ width: size, height: size }}
      />
      {label && (
        <p style={{
          margin: 0,
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-faint)',
          letterSpacing: '0.08em',
        }}>
          {label}
        </p>
      )}
    </div>
  )
}

/** Small inline loader for use inside buttons or tight spaces. */
export function InlineLoader({ size = 20 }: { size?: number }) {
  return (
    <Lottie
      animationData={bookLoaderData}
      loop
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}
