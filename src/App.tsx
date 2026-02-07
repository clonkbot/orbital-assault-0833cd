import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Float, Trail, MeshDistortMaterial, Html } from '@react-three/drei'
import { useRef, useState, useMemo, useCallback, Suspense } from 'react'
import * as THREE from 'three'

// Planet with atmospheric glow
function Planet() {
  const planetRef = useRef<THREE.Mesh>(null!)
  const atmosphereRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    planetRef.current.rotation.y += 0.001
    atmosphereRef.current.rotation.y -= 0.0005
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Core planet */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[8, 64, 64]} />
        <meshStandardMaterial
          color="#1a3a5c"
          emissive="#0a1525"
          emissiveIntensity={0.3}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[8.05, 64, 64]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Atmosphere */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[9, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Planetary rings */}
      <mesh rotation={[Math.PI / 2.5, 0, 0.2]}>
        <ringGeometry args={[12, 16, 128]} />
        <meshStandardMaterial
          color="#6b8cad"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          emissive="#2a4a6a"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  )
}

// Spaceship component with trail
function Spaceship({
  position,
  color,
  orbitRadius,
  orbitSpeed,
  orbitOffset,
  onExplosion,
  id
}: {
  position: [number, number, number]
  color: string
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
  onExplosion: (pos: THREE.Vector3) => void
  id: number
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const [isHit, setIsHit] = useState(false)
  const shipColor = isHit ? '#ff0000' : color

  useFrame((state) => {
    if (!isHit) {
      const t = state.clock.elapsedTime * orbitSpeed + orbitOffset
      groupRef.current.position.x = Math.cos(t) * orbitRadius
      groupRef.current.position.z = Math.sin(t) * orbitRadius
      groupRef.current.position.y = Math.sin(t * 2) * 3 + position[1]

      // Face direction of travel
      groupRef.current.rotation.y = -t + Math.PI / 2
      groupRef.current.rotation.z = Math.sin(t * 3) * 0.1
    }
  })

  const handleClick = useCallback(() => {
    if (!isHit) {
      setIsHit(true)
      const pos = groupRef.current.position.clone()
      onExplosion(pos)
      setTimeout(() => setIsHit(false), 2000)
    }
  }, [isHit, onExplosion])

  if (isHit) return null

  return (
    <group ref={groupRef} position={position}>
      <Trail
        width={2}
        length={8}
        color={color}
        attenuation={(t) => t * t}
      >
        <Float speed={5} rotationIntensity={0.2} floatIntensity={0.3}>
          <group scale={0.5} onClick={handleClick}>
            {/* Main hull */}
            <mesh castShadow>
              <coneGeometry args={[0.5, 2, 6]} />
              <meshStandardMaterial
                color={shipColor}
                metalness={0.9}
                roughness={0.1}
                emissive={shipColor}
                emissiveIntensity={0.3}
              />
            </mesh>

            {/* Wings */}
            <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[2, 0.1, 0.8]} />
              <meshStandardMaterial
                color={shipColor}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Engine glow */}
            <mesh position={[0, -1.2, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>

            {/* Cockpit */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.25, 16, 16]} />
              <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={0.5}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        </Float>
      </Trail>
    </group>
  )
}

// Asteroid with rotation
function Asteroid({
  position,
  size,
  rotationSpeed,
  orbitRadius,
  orbitSpeed,
  orbitOffset
}: {
  position: [number, number, number]
  size: number
  rotationSpeed: number
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
}) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    ref.current.rotation.x += rotationSpeed
    ref.current.rotation.y += rotationSpeed * 0.5

    const t = state.clock.elapsedTime * orbitSpeed + orbitOffset
    ref.current.position.x = Math.cos(t) * orbitRadius
    ref.current.position.z = Math.sin(t) * orbitRadius
    ref.current.position.y = position[1] + Math.sin(t * 1.5) * 2
  })

  return (
    <mesh ref={ref} position={position} castShadow>
      <icosahedronGeometry args={[size, 0]} />
      <MeshDistortMaterial
        color="#5a4d41"
        roughness={0.9}
        metalness={0.1}
        distort={0.3}
        speed={0.5}
      />
    </mesh>
  )
}

// Explosion particle system
function Explosion({ position, onComplete }: { position: THREE.Vector3; onComplete: () => void }) {
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < 30; i++) {
      temp.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
        size: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#ff6600' : '#ffff00'
      })
    }
    return temp
  }, [position])

  const groupRef = useRef<THREE.Group>(null!)
  const [opacity, setOpacity] = useState(1)

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const p = particles[i]
        child.position.add(p.velocity.clone().multiplyScalar(delta))
        p.velocity.multiplyScalar(0.98)
        child.scale.multiplyScalar(0.97)
      })

      setOpacity(prev => {
        const next = prev - delta * 0.8
        if (next <= 0) {
          onComplete()
          return 0
        }
        return next
      })
    }
  })

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
      {/* Core flash */}
      <pointLight position={position} color="#ff6600" intensity={50 * opacity} distance={20} />
    </group>
  )
}

// Laser beam
function LaserBeam({ start, end, color }: { start: THREE.Vector3; end: THREE.Vector3; color: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  const [active, setActive] = useState(true)

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.scale.x *= 0.95
      if (ref.current.scale.x < 0.01) setActive(false)
    }
  })

  if (!active) return null

  const direction = end.clone().sub(start)
  const length = direction.length()
  const center = start.clone().add(direction.multiplyScalar(0.5))

  return (
    <mesh ref={ref} position={center}>
      <cylinderGeometry args={[0.05, 0.05, length, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  )
}

// Battle scene with all elements
function BattleScene({ score, setScore }: { score: number; setScore: (s: number) => void }) {
  const [explosions, setExplosions] = useState<{ id: number; position: THREE.Vector3 }[]>([])
  const explosionId = useRef(0)

  const handleExplosion = useCallback((pos: THREE.Vector3) => {
    const id = explosionId.current++
    setExplosions(prev => [...prev, { id, position: pos }])
    setScore(score + 100)
  }, [score, setScore])

  const removeExplosion = useCallback((id: number) => {
    setExplosions(prev => prev.filter(e => e.id !== id))
  }, [])

  // Generate ships
  const ships = useMemo(() => {
    const colors = ['#ff3366', '#33ff99', '#3366ff', '#ffcc00', '#ff6633', '#cc33ff']
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      orbitRadius: 15 + Math.random() * 10,
      orbitSpeed: 0.3 + Math.random() * 0.3,
      orbitOffset: (i / 12) * Math.PI * 2,
      y: (Math.random() - 0.5) * 10
    }))
  }, [])

  // Generate asteroids
  const asteroids = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      size: 0.5 + Math.random() * 1.5,
      rotationSpeed: 0.005 + Math.random() * 0.01,
      orbitRadius: 20 + Math.random() * 15,
      orbitSpeed: 0.1 + Math.random() * 0.2,
      orbitOffset: Math.random() * Math.PI * 2,
      y: (Math.random() - 0.5) * 15
    })), [])

  return (
    <>
      {/* Dramatic lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={2}
        color="#fff5e6"
        castShadow
      />
      <pointLight position={[0, 0, 0]} intensity={5} color="#4da6ff" distance={50} />
      <pointLight position={[-30, 10, 20]} intensity={3} color="#ff3366" distance={60} />
      <pointLight position={[30, -10, -20]} intensity={3} color="#33ff99" distance={60} />

      {/* Starfield */}
      <Stars radius={200} depth={100} count={8000} factor={6} saturation={0.5} fade speed={0.5} />

      {/* Planet */}
      <Planet />

      {/* Spaceships */}
      {ships.map(ship => (
        <Spaceship
          key={ship.id}
          id={ship.id}
          position={[0, ship.y, 0]}
          color={ship.color}
          orbitRadius={ship.orbitRadius}
          orbitSpeed={ship.orbitSpeed}
          orbitOffset={ship.orbitOffset}
          onExplosion={handleExplosion}
        />
      ))}

      {/* Asteroids */}
      {asteroids.map(asteroid => (
        <Asteroid
          key={asteroid.id}
          position={[0, asteroid.y, 0]}
          size={asteroid.size}
          rotationSpeed={asteroid.rotationSpeed}
          orbitRadius={asteroid.orbitRadius}
          orbitSpeed={asteroid.orbitSpeed}
          orbitOffset={asteroid.orbitOffset}
        />
      ))}

      {/* Explosions */}
      {explosions.map(exp => (
        <Explosion
          key={exp.id}
          position={exp.position}
          onComplete={() => removeExplosion(exp.id)}
        />
      ))}

      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={15}
        maxDistance={80}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}

// HUD Overlay
function HUD({ score }: { score: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6">
        <div className="flex justify-between items-start">
          {/* Title */}
          <div className="flex flex-col">
            <h1
              className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter"
              style={{
                fontFamily: '"Orbitron", sans-serif',
                color: '#00ffff',
                textShadow: '0 0 20px #00ffff, 0 0 40px #0088ff, 0 0 60px #0044aa'
              }}
            >
              ORBITAL ASSAULT
            </h1>
            <span
              className="text-xs md:text-sm tracking-[0.3em] text-cyan-400/60 mt-1"
              style={{ fontFamily: '"Rajdhani", sans-serif' }}
            >
              CLICK SHIPS TO DESTROY
            </span>
          </div>

          {/* Score */}
          <div
            className="flex flex-col items-end"
            style={{ fontFamily: '"Orbitron", sans-serif' }}
          >
            <span className="text-xs text-cyan-500/70 tracking-widest">SCORE</span>
            <span
              className="text-3xl md:text-5xl font-black"
              style={{
                color: '#ffcc00',
                textShadow: '0 0 15px #ffcc00, 0 0 30px #ff8800'
              }}
            >
              {score.toString().padStart(6, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/30" />
      <div className="absolute bottom-16 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/30" />
      <div className="absolute bottom-16 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/30" />

      {/* Scanning lines effect */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.5) 2px, rgba(0, 255, 255, 0.5) 4px)'
        }}
      />

      {/* Side indicators */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-6 md:h-8"
            style={{
              backgroundColor: i < 3 ? '#00ffff' : '#004455',
              boxShadow: i < 3 ? '0 0 10px #00ffff' : 'none',
              opacity: 0.7
            }}
          />
        ))}
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 h-6 md:h-8"
            style={{
              backgroundColor: i < 4 ? '#ff3366' : '#440022',
              boxShadow: i < 4 ? '0 0 10px #ff3366' : 'none',
              opacity: 0.7
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [score, setScore] = useState(0)

  return (
    <div
      className="w-screen h-screen relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a12 50%, #000000 100%)'
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 15, 35], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Suspense fallback={null}>
          <BattleScene score={score} setScore={setScore} />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <HUD score={score} />

      {/* Footer */}
      <footer
        className="absolute bottom-0 left-0 right-0 py-3 px-4 text-center"
        style={{
          fontFamily: '"Rajdhani", sans-serif',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)'
        }}
      >
        <span className="text-[10px] md:text-xs text-cyan-700/50 tracking-wider">
          Requested by <span className="text-cyan-500/60">@0xPaulius</span> · Built by <span className="text-cyan-500/60">@clonkbot</span>
        </span>
      </footer>
    </div>
  )
}
