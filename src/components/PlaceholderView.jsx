import React from 'react'
import { ArrowRight } from 'lucide-react'

export default function PlaceholderView({ icon, title, subtitle, features, accent = 'var(--accent)' }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 68, height: 68, borderRadius: 18,
          background: `${accent}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: accent,
        }}>
          {icon}
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 10 }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 40 }}>{subtitle}</p>

        {/* Feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 36 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ color: accent, marginTop: 2, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 24,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 13,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, opacity: 0.7 }} />
          Coming soon
        </div>
      </div>
    </div>
  )
}
