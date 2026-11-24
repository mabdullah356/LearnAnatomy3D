import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const glass = { background: 'rgba(24,28,38,.72)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, backdropFilter: 'blur(16px)' }
const ghost = { background: 'none', border: 0, color: 'inherit', cursor: 'pointer', minHeight: 44 }
const muted = { color: '#8B93A5' }
const shade = { boxShadow: '0 14px 40px rgba(0,0,0,.4)' }
const pad = { ...ghost, width: 28, height: 28, minHeight: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)', color: '#8B93A5', fontSize: 10 }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const Pic = ({ id, size, thumbs, organs }) => thumbs[id]
  ? <img src={thumbs[id]} crossOrigin="anonymous" alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
  : <span style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(79,124,255,.16)', color: '#8FA9FF', display: 'grid', placeItems: 'center', fontSize: size * .34 }}>{organs[id].title[0]}</span>

export default function AtlasUI({ screen, spread, view, sex, organId, selected, activeHotspot, hotspots, labels, progress, count, source, thumbs, schematic, noWebGL, organs, regions, info, credits, onSpread, onView, onSex, onOrgan, onBack, onHotspot, onReassemble, onNudge, onResetView }) {
  const [tab, setTab] = useState('regions')
  const [query, setQuery] = useState('')
  const [compact, setCompact] = useState(() => window.innerWidth < 900)
  const [fallback, setFallback] = useState('')
  useEffect(() => {
    const resize = () => setCompact(window.innerWidth < 900)
    addEventListener('resize', resize)
    return () => removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    if (!noWebGL) return
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=human+anatomy+front+view&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*'
    fetch(url).then(r => r.json()).then(d => setFallback(Object.values(d.query?.pages || {})[0]?.imageinfo?.[0]?.thumburl || '')).catch(() => { })
  }, [noWebGL])
  const organ = organId ? organs[organId] : null
  const tipPoint = organ && hotspots[activeHotspot]
  const tip = tipPoint ? { ...organs[organId].hotspots[activeHotspot], ...tipPoint, flip: tipPoint.x > innerWidth - 220 } : null
  const slide = e => {
    if (noWebGL) return
    const r = e.currentTarget.getBoundingClientRect()
    onSpread(clamp((e.clientX - r.left) / r.width, 0, 1))
  }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      <div style={{ position: 'absolute', top: 20, left: 22, display: 'grid', gap: 6, maxWidth: 320 }}>
        {organ ? <>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em' }}>Human Body Atlas</div>
          <div style={{ fontSize: 11, ...muted }}>Biology · Simulation</div>
          <button onClick={onBack} style={{ ...glass, ...ghost, ...muted, padding: '6px 12px', minHeight: 36, borderRadius: 20, fontSize: 12, width: 'max-content', pointerEvents: 'auto' }}>← Back to the body</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <Pic id={organId} size={36} thumbs={thumbs} organs={organs} />
            <motion.div key={organId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, lineHeight: 1.1 }}>{organ.title}</div>
              <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 13, ...muted }}>{organ.latin}</div>
            </motion.div>
          </div>
        </> : <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, ...muted }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F7CFF' }} />Visible structures: {count.toLocaleString()}
        </div>}
      </div>

      <AnimatePresence>
        {!organ && <motion.div key="panel" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: .35 }} style={{ position: 'absolute', right: compact ? 12 : 24, top: compact ? 'auto' : 96, bottom: compact ? 210 : 24, width: compact ? 'calc(100% - 24px)' : 280, maxHeight: compact ? '40vh' : undefined, overflowY: 'auto', padding: 16, ...glass, ...shade, pointerEvents: 'auto' }}>
          {selected ? <>
            <button onClick={onBack} style={{ ...ghost, color: '#4F7CFF', fontSize: 12, padding: 0 }}>← Back to browsing</button>
            <div style={{ fontSize: 15, fontWeight: 600, margin: '12px 0 10px' }}>{selected.name}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, fontSize: 10, background: 'rgba(255,255,255,.06)' }}>
              <i style={{ width: 6, height: 6, borderRadius: '50%', background: selected.system === 'muscles' ? '#D9482F' : selected.system === 'bones' ? '#EDE3CF' : selected.system === 'vessels' ? '#3E5BD6' : '#E58B6B' }} />{selected.system}
            </span>
            <div style={{ fontSize: 11, marginTop: 14, ...muted }}>{selected.taxonomy}</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Individual structure: 1</div>
            <div style={{ fontSize: 10, letterSpacing: '.12em', marginTop: 18, ...muted }}>ABOUT THIS SYSTEM</div>
            <p style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>{info[selected.system]}</p>
          </> : <>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Browse</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 12, background: 'rgba(255,255,255,.05)' }}>
              <span style={{ fontSize: 14, ...muted }}>⌕</span>
              <input name="structure" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a structure…" style={{ background: 'none', border: 0, outline: 0, color: '#E8EAF0', fontSize: 12, flex: 1, minWidth: 0 }} />
            </div>
            <div style={{ fontSize: 10, letterSpacing: '.14em', margin: '18px 0 10px', ...muted }}>ORGANS IN 3D</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              {Object.keys(organs).map(id => <button key={id} onClick={() => onOrgan(id)} style={{ ...ghost, display: 'grid', justifyItems: 'center', gap: 6, padding: 0, fontSize: 11 }}>
                <Pic id={id} size={48} thumbs={thumbs} organs={organs} />{organs[id].title}
              </button>)}
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, margin: '18px 0 12px', borderRadius: 12, background: 'rgba(255,255,255,.05)' }}>
              {['systems', 'regions'].map(t => <button key={t} onClick={() => setTab(t)} style={{ flex: 1, minHeight: 36, border: 0, borderRadius: 9, background: tab === t ? 'rgba(255,255,255,.12)' : 'none', color: tab === t ? '#E8EAF0' : '#8B93A5', fontSize: 11, textTransform: 'capitalize', cursor: 'pointer' }}>{t}</button>)}
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.4, ...muted }}>Choose a body region to explore its anatomical structures</p>
            <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
              {(tab === 'systems' ? Object.keys(info) : regions).filter(r => r.toLowerCase().includes(query.toLowerCase())).map(r => <button key={r} style={{ ...ghost, display: 'flex', gap: 10, alignItems: 'center', borderRadius: 10, fontSize: 12, textAlign: 'left' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(79,124,255,.15)', color: '#8FA9FF', display: 'grid', placeItems: 'center', fontSize: 11 }}>{r[0].toUpperCase()}</span>{r[0].toUpperCase() + r.slice(1)}
              </button>)}
            </div>
          </>}
        </motion.div>}
      </AnimatePresence>

      {!organ && <div style={{ position: 'absolute', left: compact ? 12 : 24, top: '42%', display: 'grid', gridTemplateColumns: 'repeat(3,28px)', gap: 2, pointerEvents: 'auto' }}>
        <span /><button onClick={() => onNudge('up')} style={pad}>▲</button><span />
        <button onClick={() => onNudge('left')} style={pad}>◀</button><button onClick={onResetView} style={pad}>↺</button><button onClick={() => onNudge('right')} style={pad}>▶</button>
        <span /><button onClick={() => onNudge('down')} style={pad}>▼</button><span />
      </div>}

      <AnimatePresence>
        {!organ && <motion.div key="card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: .35 }} style={{ position: 'absolute', left: compact ? 12 : 'calc(50% - min(310px, 26%))', bottom: compact ? 12 : 24, width: compact ? 'calc(100% - 24px)' : 'min(620px, 52%)', minWidth: compact ? 0 : 420, padding: '14px 16px', ...glass, ...shade, pointerEvents: 'auto', opacity: noWebGL ? .5 : 1 }}>
          {screen === 'focus' && <button onClick={onBack} style={{ ...ghost, color: '#4F7CFF', fontSize: 12, padding: 0, minHeight: 36 }}>↺ Back to whole body</button>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 12, background: 'rgba(255,255,255,.05)' }}>
              {['front', 'back', 'side', 'perspective'].map(t => <button key={t} onClick={() => onView(t)} style={{ position: 'relative', border: 0, background: 'none', color: view === t ? '#E8EAF0' : '#8B93A5', padding: '8px 10px', minHeight: 44, fontSize: 11, cursor: 'pointer' }}>
                {view === t && <motion.span layoutId="viewPill" style={{ position: 'absolute', inset: 0, borderRadius: 9, background: 'rgba(255,255,255,.12)', zIndex: -1 }} />}
                {t[0].toUpperCase() + t.slice(1)}
              </button>)}
            </div>
            <div style={{ display: 'flex' }}>
              {['male', 'female'].map(s => <button key={s} onClick={() => onSex(s)} style={{ ...ghost, padding: '8px 10px', fontSize: 11, color: sex === s ? '#4F7CFF' : '#8B93A5' }}>{s[0].toUpperCase() + s.slice(1)}</button>)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
            <button onClick={onReassemble} style={{ ...ghost, fontSize: 12 }}>↺ Reassemble</button>
            <span style={{ fontSize: 11, color: '#4F7CFF', background: 'rgba(79,124,255,.12)', padding: '6px 10px', borderRadius: 20 }}>{Math.round(spread * 100)}%</span>
          </div>
          <div style={{ fontSize: 11, marginBottom: 6 }}>Spread structures apart</div>
          <div onPointerDown={e => { slide(e); e.currentTarget.setPointerCapture(e.pointerId) }} onPointerMove={e => { if (e.buttons) slide(e) }} style={{ height: 28, position: 'relative', touchAction: 'none', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.1)' }} />
            <div style={{ position: 'absolute', top: 11, left: 0, height: 6, borderRadius: 3, background: '#4F7CFF', width: `${spread * 100}%` }} />
            <div style={{ position: 'absolute', top: 14, left: `${spread * 100}%`, transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: '50%', background: '#E8EAF0', color: '#0F1218', display: 'grid', placeItems: 'center', fontSize: 10 }}>◂▸</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, ...muted }}><span>Assembled</span><span>Every piece</span></div>
        </motion.div>}
      </AnimatePresence>

      {screen === 'focus' && !organ && <button onClick={onResetView} style={{ position: 'absolute', right: compact ? 12 : 24, top: 24, width: 44, height: 44, borderRadius: '50%', ...glass, ...ghost, pointerEvents: 'auto' }}>↺</button>}
      {screen === 'focus' && !organ && <div style={{ position: 'absolute', left: '36%', top: '34%', pointerEvents: 'none' }}>
        <div style={{ width: 'max-content', padding: '5px 9px', borderRadius: 8, background: 'rgba(16,18,24,.88)', border: '1px solid rgba(245,169,208,.35)', fontSize: 10, color: '#F5A9D0' }}>{selected.name}</div>
        <div style={{ position: 'absolute', left: '100%', top: '50%', width: 74, height: 1, background: 'rgba(245,169,208,.7)', transform: 'rotate(28deg)', transformOrigin: 'left center' }} />
      </div>}

      <AnimatePresence>
        {!organ && labels.map(l => <motion.div key={l.name} initial={{ opacity: 0 }} animate={{ opacity: 1, x: clamp(l.x, 20, innerWidth - 110), y: clamp(l.y, 70, innerHeight - 220) }} exit={{ opacity: 0, transition: { duration: .8 } }} transition={{ duration: .2 }} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', padding: '4px 8px', borderRadius: 7, background: 'rgba(14,17,23,.86)', border: '1px solid rgba(255,255,255,.1)', fontSize: 10, whiteSpace: 'nowrap' }}>{l.name}</motion.div>)}
      </AnimatePresence>

      {progress > 0 && progress < 1 && <div style={{ position: 'absolute', left: 22, right: 22, top: 0, height: 2, background: 'rgba(255,255,255,.08)' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} style={{ height: 2, background: '#4F7CFF' }} />
      </div>}

      {organ && hotspots.map(p => {
        const d = organs[organId].hotspots[p.i]
        return <button key={p.i} onClick={() => onHotspot(p.i)} aria-label={d.title} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', background: d.color, opacity: p.visible ? 1 : 0, pointerEvents: p.visible ? 'auto' : 'none', cursor: 'pointer', boxShadow: '0 0 0 4px rgba(255,255,255,.12)' }} />
      })}
      <AnimatePresence>
        {tip && tip.visible && <motion.div key="tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: .2 }} style={{ position: 'absolute', left: tip.flip ? tip.x - 218 : tip.x + 18, top: tip.y + 16, width: 200, padding: '10px 12px', ...glass }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{tip.title}</div>
          <div style={{ fontSize: 11, lineHeight: 1.4, marginTop: 4, ...muted }}>{tip.text}</div>
        </motion.div>}
      </AnimatePresence>

      <div style={{ position: 'absolute', left: 22, bottom: 12, fontSize: 10, lineHeight: 1.5, ...muted }}>
        <div>Educational use only</div>
        {source && <div>{source === 'Human Reference Atlas 3D Reference Object Library, CC BY 4.0' ? credits.ccf : source === 'Schematic model' ? '' : credits.body}</div>}
        {schematic && <div>Schematic model</div>}
      </div>

      {noWebGL && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0F1218', pointerEvents: 'auto' }}>
        {fallback ? <img src={fallback} crossOrigin="anonymous" alt="Human anatomy" style={{ maxHeight: '72%', maxWidth: '80%', objectFit: 'contain' }} /> : <div style={{ fontSize: 13, ...muted }}>Anatomy view unavailable</div>}
      </div>}
    </div>
  )
}
