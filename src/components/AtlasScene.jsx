import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import gsap from 'gsap'

const BODY_URLS = ['https://cdn.jsdelivr.net/gh/Charleeh/ecorche@320805e06aee51e2e6f6b22533eb2a59d43f2d4d/model/ecorche.meshopt.glb']
const COLOR = { bones: '#EDE3CF', muscles: '#D9482F', vessels: '#3E5BD6', organs: '#E58B6B' }
const SHIFT = { bones: -.9, muscles: .9, organs: -.3, vessels: .3 }
const DELAY = { bones: 0, vessels: .04, organs: .09, muscles: .14 }
const ORDER = { bones: 0, muscles: 1, vessels: 2, organs: 3 }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const seeded = () => { let s = 987654321; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 }

function buildBody(rnd) {
  const mats = {}
  for (const k in COLOR) mats[k] = new THREE.MeshStandardMaterial({ color: COLOR[k], roughness: .55, metalness: .04, transparent: true })
  mats.vein = new THREE.MeshStandardMaterial({ color: '#7A4FB5', roughness: .5, transparent: true })
  const g = { sphere: new THREE.SphereGeometry(1, 12, 10), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 2, 8), cap: new THREE.CapsuleGeometry(1, 2, 4, 8), torus: new THREE.TorusGeometry(1, .12, 6, 16, Math.PI * 1.15) }
  const parts = []
  const add = (name, system, geo, mat, p, s, r = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...p); m.rotation.set(...r); m.scale.set(...s)
    m.userData = { name, system, mat, home: m.position.clone(), rot: [...r], scale: new THREE.Vector3(...s), size: Math.max(...s), off: new THREE.Vector3(SHIFT[system], (rnd() - .5) * .12, (rnd() - .5) * .1), cloud: new THREE.Vector3((rnd() - .5) * 3.2, (rnd() - .5) * 2.2 + .1, (rnd() - .5) * 1.4), grid: new THREE.Vector3(), gscale: 1, tumble: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5) }
    m.matrixAutoUpdate = false; m.updateMatrix(); parts.push(m)
  }
  add('cranium', 'bones', g.sphere, mats.bones, [0, 1.62, 0], [.11, .13, .1])
  add('mandible', 'bones', g.box, mats.bones, [0, 1.5, .03], [.1, .035, .075])
  for (let i = 0; i < 24; i++) add('vertebra ' + i, 'bones', g.cyl, mats.bones, [0, 1.45 - i * .045, .02 * Math.sin(i * .35)], [.032, .018, .032])
  add('sternum', 'bones', g.box, mats.bones, [0, 1.28, .12], [.05, .22, .03])
  for (let i = 0; i < 12; i++) for (const d of [-1, 1]) add('rib ' + i + ' ' + d, 'bones', g.torus, mats.bones, [d * .02, 1.36 - i * .055, 0], [.14 + i * .006, .14 + i * .006, .1], [0, d * Math.PI / 2, d * .25])
  for (const d of [-1, 1]) add('pelvis ' + d, 'bones', g.torus, mats.bones, [d * .085, .93, 0], [.1, .1, .07], [Math.PI / 2, 0, 0])
  for (const d of [-1, 1]) {
    add('humerus ' + d, 'bones', g.cap, mats.bones, [d * .24, 1.24, 0], [.028, .17, .028], [0, 0, d * .12])
    add('radius ' + d, 'bones', g.cap, mats.bones, [d * .3, .98, 0], [.02, .15, .02], [0, 0, d * .05])
    add('ulna ' + d, 'bones', g.cap, mats.bones, [d * .25, .98, 0], [.018, .15, .018], [0, 0, d * .05])
    add('femur ' + d, 'bones', g.cap, mats.bones, [d * .09, .63, 0], [.04, .23, .04], [0, 0, d * .05])
    add('tibia ' + d, 'bones', g.cap, mats.bones, [d * .1, .32, 0], [.03, .2, .03], [0, 0, d * .02])
    add('fibula ' + d, 'bones', g.cap, mats.bones, [d * .14, .32, 0], [.018, .2, .018], [0, 0, d * .02])
    for (let j = 0; j < 10; j++) add('phalanx ' + d + ' ' + j, 'bones', g.box, mats.bones, [d * (.33 + j * .008), .78 - j * .02, 0], [.012, .02, .012])
    for (let j = 0; j < 10; j++) add('toe ' + d + ' ' + j, 'bones', g.box, mats.bones, [d * (.1 + j * .008), .06, .05 + j * .01], [.012, .012, .02])
  }
  for (let i = 0; i < 120; i++) {
    const d = i % 2 ? 1 : -1, band = Math.floor(i / 2) % 10
    add('musculus ' + i, 'muscles', g.cap, mats.muscles, [d * (.05 + band * .02), 1.45 - band * .11, (rnd() - .5) * .13], [.022, .045 + rnd() * .02, .024], [0, 0, d * .2])
  }
  for (const [n, p, s] of [['lungs R', [-.1, 1.3, 0], [.075, .13, .06]], ['lungs L', [.1, 1.3, 0], [.075, .13, .06]], ['heart', [0, 1.25, .07], [.045, .055, .045]], ['hepar', [-.07, 1.03, .02], [.1, .05, .06]], ['stomach', [.09, 1.02, .02], [.06, .07, .05]], ['brain', [0, 1.66, 0], [.09, .08, .085]], ['ren - L', [.08, .95, 0], [.035, .05, .03]], ['ren - R', [-.08, .95, 0], [.035, .05, .03]]]) add(n, 'organs', g.sphere, mats.organs, p, s)
  const gut = []
  for (let i = 0; i < 24; i++) { const a = i * .55; gut.push(new THREE.Vector3(Math.cos(a) * .075 * (1 + i * .008), .86 + i * .002, Math.sin(a) * .05)) }
  add('intestinum', 'organs', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gut), 48, .014, 5, false), mats.organs, [0, 0, 0], [1, 1, 1])
  for (let i = 0; i < 40; i++) {
    const d = i % 2 ? 1 : -1, y = .4 + i * .028
    const pts = [new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(d * .05, 1.2, 0), new THREE.Vector3(d * .12, y, 0)]
    add('vas ' + i, 'vessels', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .006, 4, false), i % 3 ? mats.vessels : mats.vein, [0, 0, 0], [1, 1, 1])
  }
  return { parts, mats }
}

function gridify(parts) {
  const ordered = [...parts].sort((a, b) => ORDER[a.userData.system] - ORDER[b.userData.system] || b.userData.size - a.userData.size)
  const cols = Math.ceil(Math.sqrt(ordered.length * 1.8)), rows = Math.ceil(ordered.length / cols), cell = 2.4 / cols
  ordered.forEach((m, i) => {
    const u = m.userData
    u.grid.set((i % cols - (cols - 1) / 2) * cell * 2, ((rows - 1) / 2 - Math.floor(i / cols)) * cell * .55 + .12, .75)
    u.gscale = clamp(cell * .7 / (u.size * 2), .08, 1.8)
  })
}

function pose(parts, v) {
  for (const m of parts) {
    const u = m.userData, a = smooth(0, .3, v), d = DELAY[u.system]
    const b = smooth(.3 + d, .7, v), c = smooth(.7 + d * .5, 1, v), t = Math.sin(Math.PI * v) * b * .6
    m.position.copy(u.home).addScaledVector(u.off, a).lerp(u.cloud, b).lerp(u.grid, c)
    m.rotation.set(u.rot[0] * (1 - c) + u.tumble.x * t, u.rot[1] * (1 - c) + u.tumble.y * t, u.rot[2] * (1 - c) + u.tumble.z * t)
    m.scale.copy(u.scale).multiplyScalar(1 + (u.gscale - 1) * c)
    m.updateMatrix()
  }
}

function organShape(id) {
  const g = new THREE.Group(), mat = (c, r = .35) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: .5, transparent: true })
  if (id === 'lungs') {
    for (const d of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mat('#D97A72')); l.scale.set(.42, .7, .33); l.position.x = d * .42; g.add(l) }
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.1, 12), mat('#E8C8B8')); t.position.y = .85; g.add(t)
    for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.125, .02, 6, 16), mat('#E8C8B8')); r.rotation.x = Math.PI / 2; r.position.y = .4 + i * .16; g.add(r) }
    for (const d of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, .5, 10), mat('#B06B75')); b.position.set(d * .2, .35, 0); b.rotation.z = d * .5; g.add(b) }
  }
  if (id === 'heart') {
    const shape = new THREE.Shape()
    shape.moveTo(0, -.62); shape.bezierCurveTo(-.85, -.08, -.78, .62, -.36, .72); shape.bezierCurveTo(-.12, .78, 0, .55, 0, .4); shape.bezierCurveTo(.12, .78, .5, .76, .72, .48); shape.bezierCurveTo(1.02, .08, .55, -.34, 0, -.62)
    const muscle = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .38, bevelEnabled: true, bevelSegments: 5, bevelSize: .09, bevelThickness: .1, steps: 2 }), mat('#8F2630', .44))
    muscle.geometry.translate(0, 0, -.19); g.add(muscle)
    const tube = (points, radius, color) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 10, false), mat(color, .3)))
    tube([[.2, .35, .38], [.22, .72, .38], [.12, 1, .38], [-.08, 1.08, .38], [-.26, .95, .38], [-.28, .58, .38]], .095, '#C98B96')
    tube([[-.12, .28, .4], [-.18, .66, .4], [-.26, .89, .4], [-.42, 1, .4]], .075, '#5C63C8')
    tube([[.35, .75, .4], [.48, 1.02, .4], [.62, 1.1, .4]], .07, '#7A4FB5')
    tube([[-.36, .05, .4], [-.2, .25, .42], [-.02, .36, .42], [.16, .3, .42], [.28, .1, .4]], .012, '#6F2637')
    tube([[.12, .12, .42], [.25, -.02, .39], [.38, -.2, .36]], .01, '#6F2637')
  }
  if (id === 'brain') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat('#D9A0A8')); b.scale.set(.8, .65, .72); g.add(b)
    for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.7, .035, 6, 24, Math.PI), mat('#C98B96')); r.rotation.set(Math.PI / 2, i / 12 * Math.PI, i * .2); r.position.y = .1 + i * .005; g.add(r) }
  }
  g.userData.id = id; return g
}

const fit = g => { const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); g.scale.setScalar(2 / Math.max(s.x, s.y, s.z)); const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()); g.position.sub(c) }

const AtlasScene = forwardRef(function AtlasScene({ handlers, organs }, ref) {
  const host = useRef(null), engine = useRef(null)
  useEffect(() => {
    const el = host.current, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, rnd = seeded(), ctx = gsap.context(() => {})
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) { handlers.current.onNoWebGL(); return () => ctx.revert() }
    let renderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) } catch { handlers.current.onNoWebGL(); return () => ctx.revert() }
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .01, 100)
    camera.position.set(0, .2, 5)
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose()
    const key = new THREE.DirectionalLight(0xffffff, 2.2), rim = new THREE.DirectionalLight(0x6f8cff, 1.4)
    key.position.set(2, 3, 4); rim.position.set(-3, 1, -2); scene.add(key, rim, new THREE.AmbientLight(0xffffff, .35))
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.dampingFactor = .09; controls.minDistance = .15; controls.maxDistance = 6
    controls.target.set(0, .1, 0)
    const body = new THREE.Group(); body.scale.set(1.1, .72, .85); scene.add(body)
    const { parts, mats } = buildBody(rnd); gridify(parts); parts.forEach(p => body.add(p))
    const organGroup = new THREE.Group(); organGroup.visible = false; scene.add(organGroup)
    const models = {}
    for (const id in organs) { const g = organShape(id); fit(g); g.visible = false; organGroup.add(g); models[id] = g }
    const state = { spread: 0, last: 0, screen: 'body', organ: null, points: [], visible: true, down: null, recent: '', sex: 'male' }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v = new THREE.Vector3(), q = new THREE.Vector3()
    const partMaterials = () => [...new Set(parts.flatMap(p => Array.isArray(p.userData.mat) ? p.userData.mat : [p.userData.mat]))]
    const setSpread = x => { const back = x < state.last; state.last = x; state.spread = x; pose(parts, x); handlers.current.onSpread(x); if (!back || x <= .05 || x >= .6) return x === 0 && handlers.current.onLabels([]); handlers.current.onLabels(parts.filter((_, i) => i % 97 === 0).slice(0, 3).map(p => { p.getWorldPosition(v); v.project(camera); return { name: p.userData.name, x: (v.x * .5 + .5) * el.clientWidth, y: (-v.y * .5 + .5) * el.clientHeight } })) }
    const animateSpread = (to, dur) => ctx.add(() => gsap.to(state, { spread: to, duration: dur, ease: 'power3.inOut', onUpdate: () => setSpread(state.spread) }))
    const orbitTo = (az, el) => {
      const r = camera.position.distanceTo(controls.target), t = controls.target
      ctx.add(() => gsap.to(camera.position, { x: t.x + r * Math.cos(el) * Math.sin(az), y: t.y + r * Math.sin(el), z: t.z + r * Math.cos(el) * Math.cos(az), duration: reduce ? 0 : .8, ease: 'power2.inOut', onUpdate: () => controls.update() }))
    }
    const presets = { front: [0, 0], back: [Math.PI, 0], side: [Math.PI / 2, 0], perspective: [Math.PI / 4, .26] }
    const setView = n => orbitTo(...(presets[n] || presets.front))
    const nudge = d => {
      const t = controls.target, x = camera.position.x - t.x, y = camera.position.y - t.y, z = camera.position.z - t.z, r = Math.hypot(x, y, z)
      const a = Math.atan2(x, z) + (d === 'left' ? -.26 : d === 'right' ? .26 : 0)
      const e = clamp(Math.asin(y / r) + (d === 'up' ? .26 : d === 'down' ? -.26 : 0), -1.3, 1.3)
      orbitTo(a, e)
    }
    const clearFocus = () => {
      parts.forEach(p => { if (p.material !== p.userData.mat) { p.material.dispose(); p.material = p.userData.mat } })
      ctx.add(() => {
        gsap.to(partMaterials(), { opacity: 1, duration: reduce ? 0 : .5 })
        gsap.to(camera.position, { x: 0, y: .2, z: 5, duration: reduce ? 0 : .9, ease: 'power3.inOut', onUpdate: () => controls.update() })
        gsap.to(controls.target, { x: 0, y: .1, z: 0, duration: reduce ? 0 : .9, ease: 'power3.inOut' })
      })
    }
    const focusPart = id => {
      const m = parts.find(p => p.userData.name === id); if (!m) return
      setSpread(0)
      parts.forEach(p => { p.material = p.userData.mat })
      m.material = new THREE.MeshPhysicalMaterial({ color: '#F5A9D0', emissive: '#F5A9D0', emissiveIntensity: .6, roughness: .3, clearcoat: .5 })
      ctx.add(() => gsap.to(partMaterials(), { opacity: .18, duration: reduce ? 0 : .5 }))
      m.getWorldPosition(v)
      const dir = camera.position.clone().sub(controls.target).normalize()
      ctx.add(() => {
        gsap.to(camera.position, { x: v.x + dir.x * .75, y: v.y + dir.y * .75 + .1, z: v.z + dir.z * .75, duration: reduce ? 0 : .9, ease: 'power3.inOut', onUpdate: () => controls.update() })
        gsap.to(controls.target, { x: v.x, y: v.y, z: v.z, duration: reduce ? 0 : .9, ease: 'power3.inOut' })
      })
      handlers.current.onSelect({ name: m.userData.name, system: m.userData.system, taxonomy: 'Terminologia Anatomica' })
    }
    const snap = () => {
      const o = models[state.organ]; if (!o) return
      state.points = organs[state.organ].hotspots.map((h, i) => {
        ray.set(new THREE.Vector3((h.u - .5) * 2, (h.v - .5) * 2, 5), new THREE.Vector3(0, 0, -1))
        const hit = ray.intersectObject(o, true)[0]
        return { i, point: hit ? hit.point.clone() : new THREE.Vector3((h.u - .5) * 2, (h.v - .5) * 2, 0), normal: hit && hit.face ? hit.face.normal.clone().transformDirection(o.matrixWorld) : new THREE.Vector3(0, 0, 1) }
      })
    }
    const loader = new GLTFLoader(), draco = new DRACOLoader(); draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@' + THREE.REVISION + '/examples/jsm/libs/draco/'); loader.setDRACOLoader(draco); loader.setMeshoptDecoder(MeshoptDecoder)
    const loadGLB = url => Promise.race([new Promise((res, rej) => loader.load(url, res, e => handlers.current.onProgress(e.lengthComputable && e.total ? Math.max(.02, e.loaded / e.total) : .02), rej)), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))])
    const organFile = async (id, sex) => {
      let list
      try { list = JSON.parse(sessionStorage.getItem('ccf-models') || 'null') } catch { list = null }
      if (!list) { const r = await fetch('https://api.github.com/repos/hubmapconsortium/ccf-releases/contents/v1.2/models'); if (!r.ok) throw new Error('listing'); list = await r.json(); sessionStorage.setItem('ccf-models', JSON.stringify(list)) }
      const re = organs[id].re
      const sexOk = n => sex === 'male' ? /male/i.test(n) && !/female/i.test(n) || /_m(\W|$)|vh_m/i.test(n) : /female/i.test(n) || /_f(\W|$)|vh_f/i.test(n)
      return (list.find(f => re.test(f.name) && sexOk(f.name)) || list.find(f => re.test(f.name)))?.download_url || null
    }
    const loadOrgan = async (id, sex) => {
      try {
        const url = await organFile(id, sex); if (!url || state.organ !== id) return
        const gltf = await loadGLB(url), copy = gltf.scene.clone(true), target = models[id]
        fit(copy); target.clear(); target.add(copy)
        const mm = []
        copy.traverse(o => {
          if (!o.isMesh) return
          const names = (o.name + ' ' + (o.material?.name || '')).toLowerCase()
          o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
            const clone = m.clone()
            clone.transparent = true; clone.opacity = 0
            if ('roughness' in clone) { clone.roughness = .4; clone.clearcoat = .35 }
            if (id === 'heart') clone.color.set(/valve/.test(names) ? '#D8A7A2' : /papillary|septum/.test(names) ? '#762C36' : '#A8323B')
            mm.push(clone); return clone
          })
          if (o.material.length === 1) o.material = o.material[0]
        })
        if (id === 'heart') for (const [name, points, radius, color] of [
          ['aorta', [[.16, .3, .56], [.18, .72, .56], [.1, 1, .56], [-.08, 1.08, .56], [-.27, .92, .56], [-.28, .62, .56]], .075, '#B84C59'],
          ['pulmonary trunk', [[-.08, .25, .58], [-.16, .58, .58], [-.28, .88, .58], [-.43, .98, .58]], .065, '#5866C7']
        ]) {
          const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
          const material = new THREE.MeshPhysicalMaterial({ color, roughness: .32, clearcoat: .4, transparent: true, opacity: 0 })
          const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 12, false), material)
          mesh.name = name; target.add(mesh); mm.push(material)
        }
        ctx.add(() => gsap.to(mm, { opacity: 1, duration: reduce ? 0 : .5 }))
        handlers.current.onSource('Human Reference Atlas 3D Reference Object Library, CC BY 4.0')
        snap(); handlers.current.onProgress(1); handlers.current.onReady()
      } catch { handlers.current.onProgress(1); return }
    }
    const showOrgan = (id, sex) => {
      state.screen = 'organ'; state.organ = id; state.sex = sex; body.visible = false; organGroup.visible = true
      for (const k in models) models[k].visible = k === id
      camera.position.set(0, 0, 5.8); controls.target.set(0, 0, 0); scene.updateMatrixWorld(true); snap(); handlers.current.onProgress(.02); loadOrgan(id, sex)
    }
    const showBody = () => {
      state.screen = 'body'; state.organ = null; organGroup.visible = false; body.visible = true
      handlers.current.onHotspots([]); camera.position.set(0, .2, 5); controls.target.set(0, .1, 0)
    }
    const thumbnails = () => {
      const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }), s = new THREE.Scene(), out = {}
      r.setSize(96, 96); s.add(new THREE.AmbientLight(0xffffff, 1.4))
      const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(2, 3, 4); s.add(l)
      const c = new THREE.PerspectiveCamera(35, 1, .01, 100); c.position.set(0, 0, 3)
      for (const id in models) { const g = models[id].clone(true); g.visible = true; s.add(g); r.render(s, c); out[id] = r.domElement.toDataURL('image/png'); s.remove(g) }
      r.dispose(); return out
    }
    const tick = () => {
      if (!state.visible) return
      controls.update()
      if (state.organ) {
        const rect = el.getBoundingClientRect()
        const list = state.points.map(p => { q.copy(p.point).project(camera); return { i: p.i, x: (q.x * .5 + .5) * rect.width, y: (-q.y * .5 + .5) * rect.height, visible: p.normal.dot(camera.position.clone().sub(p.point)) > 0 && q.z < 1 } })
        const key = JSON.stringify(list); if (key !== state.recent) { state.recent = key; handlers.current.onHotspots(list) }
      }
      renderer.render(scene, camera)
    }
    const down = e => { state.down = [e.clientX, e.clientY] }
    const up = e => {
      if (!state.down || state.screen === 'organ') return
      const dx = e.clientX - state.down[0], dy = e.clientY - state.down[1]; state.down = null
      if (Math.hypot(dx, dy) > 6) return
      const rect = el.getBoundingClientRect()
      ndc.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObjects(parts, false)[0]; if (hit) focusPart(hit.object.userData.name)
    }
    const resize = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
    const ro = new ResizeObserver(resize), io = new IntersectionObserver(([e]) => { state.visible = e.isIntersecting })
    ro.observe(el); io.observe(el); resize()
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); gsap.ticker.add(tick)
    handlers.current.onParts(parts.length); handlers.current.onSource('Schematic model')
    engine.current = { setSpread, animateSpread, setView, nudge, focusPart, clearFocus, showOrgan, showBody, thumbnails, setSex: x => { state.sex = x; if (state.organ) loadOrgan(state.organ, x) } }
    handlers.current.onReady()
    for (const url of BODY_URLS) {
      loadGLB(url).then(gltf => {
        const fresh = []
        gltf.scene.updateMatrixWorld(true)
        gltf.scene.traverse(o => {
          if (!o.isMesh) return
          const layer = (o.userData.layer || '').toLowerCase(), name = o.userData.name || o.name || 'structure'
          const system = /muscle/.test(layer) ? 'muscles' : /skeleton|bone|cartilage|tooth/.test(layer + ' ' + name.toLowerCase()) ? 'bones' : 'organs'
          const vertexColors = Boolean(o.geometry.getAttribute('color')), source = Array.isArray(o.material) ? o.material : [o.material]
          const mats = source.map(m => { const n = m.clone(); n.color.set(vertexColors ? '#FFFFFF' : COLOR[system]); n.vertexColors = vertexColors; n.transparent = true; n.opacity = 0; return n })
          const material = Array.isArray(o.material) ? mats : mats[0], scale = o.getWorldScale(new THREE.Vector3())
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
          const size = Math.max(...o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(scale).toArray()) / 2
          const m = new THREE.Mesh(o.geometry, material); m.position.copy(o.getWorldPosition(new THREE.Vector3())); m.quaternion.copy(o.getWorldQuaternion(new THREE.Quaternion())); m.scale.copy(scale)
          m.userData = { name, system, mat: material, home: m.position.clone(), rot: [m.rotation.x, m.rotation.y, m.rotation.z], scale: scale.clone(), size, off: new THREE.Vector3(SHIFT[system], 0, 0), cloud: new THREE.Vector3((rnd() - .5) * 3.2, (rnd() - .5) * 2.2, (rnd() - .5) * 1.4), grid: new THREE.Vector3(), gscale: 1, tumble: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5) }
          m.matrixAutoUpdate = false; m.updateMatrix(); fresh.push(m)
        })
        if (!fresh.length) throw new Error('Empty body model')
        const fallback = parts.filter(p => p.userData.system === 'organs' || p.userData.system === 'vessels')
        const replaced = parts.filter(p => !fallback.includes(p))
        const oldMaterials = [...new Set(replaced.flatMap(p => Array.isArray(p.material) ? p.material : [p.material]))]
        parts.splice(0, parts.length, ...fresh, ...fallback); fresh.forEach(p => body.add(p)); gridify(parts); setSpread(state.spread)
        const newMaterials = [...new Set(fresh.flatMap(p => Array.isArray(p.material) ? p.material : [p.material]))]
        ctx.add(() => {
          gsap.to(newMaterials, { opacity: 1, duration: reduce ? 0 : .5 })
          gsap.to(oldMaterials, { opacity: 0, duration: reduce ? 0 : .5, onComplete: () => replaced.forEach(p => { p.visible = false }) })
        })
        handlers.current.onParts(parts.length); handlers.current.onSource('Écorché, CC BY-SA 4.0')
        handlers.current.onProgress(1)
      }).catch(() => { handlers.current.onProgress(1); handlers.current.onSource('Schematic model') })
    }
    return () => {
      ctx.revert(); gsap.ticker.remove(tick); ro.disconnect(); io.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up)
      controls.dispose(); draco.dispose(); engine.current = null
      const geos = new Set(), ms = new Set()
      scene.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => ms.add(m)) })
      Object.values(mats).forEach(m => ms.add(m))
      parts.forEach(p => (Array.isArray(p.userData.mat) ? p.userData.mat : [p.userData.mat]).forEach(m => ms.add(m)))
      geos.forEach(x => x.dispose()); ms.forEach(m => { for (const k in m) if (m[k]?.isTexture) m[k].dispose(); m.dispose() })
      renderer.dispose(); renderer.domElement.remove(); scene.environment?.dispose()
    }
  }, [handlers, organs])
  useImperativeHandle(ref, () => ({
    setSpread: x => engine.current?.setSpread(x), animateSpread: (x, d) => engine.current?.animateSpread(x, d),
    setView: x => engine.current?.setView(x), nudge: x => engine.current?.nudge(x),
    focusPart: x => engine.current?.focusPart(x), clearFocus: () => engine.current?.clearFocus(),
    showOrgan: (x, s) => engine.current?.showOrgan(x, s), showBody: () => engine.current?.showBody(),
    thumbnails: () => engine.current?.thumbnails() || {}, setSex: x => engine.current?.setSex(x)
  }), [])
  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />
})

export default AtlasScene
