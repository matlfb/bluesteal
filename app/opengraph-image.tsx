import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BlueSTEAL — Trade Bluesky Profiles as Cards'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0d12',
          fontFamily: 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cyan glow backdrop */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-2px',
            display: 'flex',
            marginBottom: 16,
          }}
        >
          Blue<span style={{ color: '#00e5ff' }}>STEAL</span>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 80,
            height: 2,
            background: 'rgba(0,229,255,0.5)',
            marginBottom: 24,
            display: 'flex',
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '1px',
            display: 'flex',
          }}
        >
          Trade Bluesky profiles as collectible cards
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            fontSize: 20,
            color: 'rgba(0,229,255,0.6)',
            letterSpacing: '2px',
            display: 'flex',
          }}
        >
          bluesteal.app
        </div>
      </div>
    ),
    { ...size }
  )
}
