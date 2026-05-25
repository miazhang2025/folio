import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import bookLoaderData from '../../assets/Book Loader.json'

interface LoaderProps {
  size?: number
  label?: string
}

/** Full-panel loading indicator using the Book Loader animation. */
export function Loader({ size = 80, label }: LoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      animationData: bookLoaderData,
      renderer: 'svg',
      loop: true,
      autoplay: true,
    })
    return () => anim.destroy()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div ref={containerRef} style={{ width: size, height: size }} />
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      animationData: bookLoaderData,
      renderer: 'svg',
      loop: true,
      autoplay: true,
    })
    return () => anim.destroy()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}
