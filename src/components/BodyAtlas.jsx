import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import AtlasScene from './AtlasScene'
import AtlasUI from './AtlasUI'

const C = { blue: '#4F7CFF', pink: '#F5A9D0', orange: '#FFA83A', green: '#5AD6A0', white: '#FFFFFF', purple: '#B07CFF' }
const h = (u, v, title, text, color) => ({ u, v, title, text, color })
const ORGANS = {
  lungs: {
    title: 'Lungs', latin: 'Pulmones', re: /lung|pulmo/i,
    hotspots: [
      h(.5, .97, 'Trachea', 'Carries air down from the throat', C.blue),
      h(.5, .62, 'Bronchi', 'Branch into each lung', C.purple),
      h(.2, .35, 'Right lung', 'Three lobes', C.white),
      h(.82, .45, 'Left lung', 'Two lobes, with a notch for the heart', C.orange),
      h(.3, .08, 'Base', 'Rests on the diaphragm', C.green)
    ]
  },
  brain: {
    title: 'Brain', latin: 'Cerebrum', re: /brain|cerebr/i,
    hotspots: [
      h(.5, .9, 'Cerebrum', 'Thinking, memory and movement', C.blue),
      h(.5, .4, 'Cerebellum', 'Balance and coordination', C.orange),
      h(.5, .1, 'Brainstem', 'Controls breathing and heartbeat', C.green)
    ]
  },
  heart: {
    title: 'Heart', latin: 'Cor', re: /heart|cardiac/i,
    hotspots: [
      h(.62, .95, 'Aorta', 'The main artery leaving the heart', C.white),
      h(.45, .88, 'Pulmonary trunk', 'Carries blood to the lungs', C.blue),
      h(.7, .3, 'Left ventricle', 'Pumps blood to the body', C.orange),
      h(.2, .55, 'Right atrium', 'Receives blood from the body', C.blue)
    ]
  }
}
const REGIONS = ['Head & neck', 'Chest', 'Abdomen', 'Pelvis', 'Upper limb', 'Lower limb']
const SYSTEM_INFO = {
  muscles: 'Skeletal muscles move the body and stabilise its joints.',
  bones: 'The skeleton supports soft tissue and protects the organs.',
  vessels: 'Arteries and veins carry blood through every part of the body.',
  organs: 'Internal organs carry out the body’s vital functions.'
}
const CREDITS = {
  ccf: 'Human Reference Atlas 3D Reference Object Library, CC BY 4.0',
  body: 'Écorché, CC BY-SA 4.0; BodyParts3D, © DBCLS, CC BY 4.0; Z-Anatomy, CC BY-SA 4.0'
}
const FONT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,wght@0,500;1,400&display=swap');`

export default function BodyAtlas() {
  const scene = useRef(null)
  const spreadMotion = useRef({ value: 0 })
  const spreadTo = useRef(null)
  const wrap = useRef(null)
  const previous = useRef('body')
  const cb = useRef({})
  const current = useRef({ screen: 'body', sex: 'male' })
  const [screen, setScreen] = useState('body')
  const [spread, setSpread] = useState(0)
  const [view, setViewState] = useState('front')
  const [sex, setSex] = useState('male')
  const [organId, setOrganId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [activeHotspot, setActiveHotspot] = useState(0)
  const [hotspots, setHotspots] = useState([])
  const [labels, setLabels] = useState([])
  const [progress, setProgress] = useState(0)
  const [count, setCount] = useState(0)
  const [source, setSource] = useState('')
  const [thumbs, setThumbs] = useState({})
  const [schematic, setSchematic] = useState(true)
  const [noWebGL, setNoWebGL] = useState(false)
  useLayoutEffect(() => {
    current.current = { screen, sex }
    cb.current = {
      onParts: n => setCount(n),
      onSpread: v => { spreadMotion.current.value = v; setSpread(v) },
      onSelect: p => { setSelected(p); setScreen('focus') },
      onHotspots: list => setHotspots(list),
      onLabels: list => setLabels(list),
      onProgress: p => setProgress(p),
      onSource: s => { setSource(s); setSchematic(!s || /schematic/i.test(s)) },
      onReady: () => { const t = scene.current?.thumbnails(); if (t) setThumbs(t) },
      onNoWebGL: () => setNoWebGL(true)
    }
  })
  useEffect(() => {
    const target = spreadMotion.current
    spreadTo.current = gsap.quickTo(target, 'value', {
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .2, ease: 'power2.out',
      onUpdate: () => scene.current?.setSpread(spreadMotion.current.value)
    })
    return () => { gsap.killTweensOf(target); spreadTo.current = null }
  }, [])
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fade = fn => gsap.to(wrap.current, {
    opacity: 0, duration: reduce ? 0 : .3,
    onComplete: () => { fn(); gsap.to(wrap.current, { opacity: 1, duration: reduce ? 0 : .3 }) }
  })
  const changeView = v => { setViewState(v); scene.current?.setView(v) }
  const changeSpread = v => { setSpread(v); spreadTo.current ? spreadTo.current(v) : scene.current?.setSpread(v) }
  const openOrgan = id => {
    previous.current = current.current.screen
    scene.current?.showOrgan(id, current.current.sex)
    fade(() => { setOrganId(id); setActiveHotspot(0); setSelected(null); setScreen('organ') })
  }
  const back = () => {
    if (current.current.screen === 'organ') {
      scene.current?.showBody()
      fade(() => { setScreen(previous.current); setOrganId(null); setActiveHotspot(0) })
    } else {
      scene.current?.clearFocus()
      setSelected(null)
      setScreen('body')
    }
  }
  useEffect(() => () => gsap.killTweensOf(wrap.current), [])
  return (
    <div style={{ position: 'relative', width: '100%', height: '100svh', minHeight: 560, overflow: 'hidden', color: '#E8EAF0', fontFamily: 'Inter, sans-serif', background: 'radial-gradient(circle at 50% 42%, #1B2130 0%, #0F1218 62%)' }}>
      <style>{FONT + '*{box-sizing:border-box}button,input{font:inherit}'}</style>
      <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
        <AtlasScene ref={scene} handlers={cb} organs={ORGANS} />
      </div>
      <AtlasUI
        screen={screen} spread={spread} view={view} sex={sex} organId={organId}
        selected={selected} activeHotspot={activeHotspot} hotspots={hotspots}
        labels={labels} progress={progress}
        count={count} source={source} thumbs={thumbs} schematic={schematic} noWebGL={noWebGL}
        organs={ORGANS} regions={REGIONS} info={SYSTEM_INFO} credits={CREDITS}
        onSpread={changeSpread} onView={changeView}
        onSex={v => { setSex(v); scene.current?.setSex(v) }}
        onOrgan={openOrgan} onBack={back} onHotspot={setActiveHotspot}
        onReassemble={() => scene.current?.animateSpread(0, reduce ? 0 : 1.3)}
        onNudge={d => scene.current?.nudge(d)} onResetView={() => scene.current?.setView('front')}
      />
    </div>
  )
}
