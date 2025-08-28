import { useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok: boolean, msg: string }

  const canSubmit = address.trim().length > 0 && !loading

  async function onSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      setLoading(true)
      setResult(null)
      const url = `${API_BASE}/api/check?address=${encodeURIComponent(address.trim())}`
      const res = await fetch(url)
      const data = await res.json()
      setResult(
        data?.exists
          ? { ok: true, msg: '✅ This address is on the whitelist.' }
          : { ok: false, msg: '❌ We couldn’t find this address on the whitelist.' }
      )
    } catch (err) {
      setResult({ ok: false, msg: '⚠️ There has been an error in the server.' })
    } finally {
      setLoading(false)
    }
  }

  const brand = useMemo(
    () => ({
      name: 'Bitcoin World',
      logo: '/brand.png',
    }),
    []
  )

  return (
    <div className="page">
      {/* Gradiente solo por encima del título */}
      <div className="top-gradient" aria-hidden="true" />

      <main className="container">
        {/* Marca */}
        <div className="brand-pill">
          <img className="brand-logo" src={brand.logo} alt={brand.name} />
          <span>{brand.name}</span>
        </div>

        {/* Hero */}
        <header className="hero">
          <h1 className="hero-title">Verify your whitelist status</h1>
          <p className="hero-subtitle">
            Enter your Bitcoin address to check if you’re on the mint whitelist.
          </p>
        </header>

        {/* GIF centrado y pegado encima de la card (fuera del formulario) + Card debajo */}
        <section className="hero-stack">
          <div className="media-holder" aria-hidden="true">
            <img className="gif-fox" src="/assets/fox.gif" alt="" />
          </div>

          <section className="card card-with-media">
            <div className="card-title">
              <LensIcon className="icon-16" />
              <h2>Address checker</h2>
            </div>

            <form onSubmit={onSubmit}>
              <label className="label">
                Dirección BTC <span className="muted">(SegWit/Legacy/Taproot)</span>
              </label>

              <div className="row">
                <input
                  className="input"
                  type="text"
                  autoComplete="off"
                  placeholder="bc1q…"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
                <button className="btn" type="submit" disabled={!canSubmit} aria-busy={loading}>
                  {loading ? (
                    <>
                      <Spinner />
                      <span>Consulting...</span>
                    </>
                  ) : (
                    <>
                      <LensIcon className="icon-14" />
                      <span>Check status</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {result && (
              <div className={`result ${result.ok ? 'ok' : 'no'}`}>
                {result.msg}
              </div>
            )}
          </section>
        </section>

        <footer className="footer">
          Powered by Bitcoin • Built for Bitcoin
        </footer>
      </main>
    </div>
  )
}

/* ---------------- Icons ---------------- */

function BitcoinIcon({ className = 'icon-16' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        d="M14.9 11.2c.8-.4 1.3-1.1 1.3-2.1 0-1.9-1.6-2.8-3.6-2.8H9.5v9.4h3.5c2.2 0 3.8-.9 3.8-3 0-1.2-.6-2-1.9-2.5Zm-3.2-2.8h1c.9 0 1.5.3 1.5 1.1s-.6 1.1-1.5 1.1h-1v-2.2Zm1.2 6.6h-1.2v-2.4h1.2c1.1 0 1.7.4 1.7 1.2s-.6 1.2-1.7 1.2Z"
        fill="#1a0d00"
      />
    </svg>
  )
}

function LensIcon({ className = 'icon-16' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}
