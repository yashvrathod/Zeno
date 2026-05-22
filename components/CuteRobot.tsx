'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

function BigEye({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const blink = Math.sin(state.clock.elapsedTime * 3) > 0.95 ? 0.1 : 1;
    ref.current.scale.y = blink;
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.02, 0.025, 0.05]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
    </group>
  );
}

function Whiskers() {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.05, -0.01, 0),
        new THREE.Vector3(0.15, -0.02, 0),
        new THREE.Vector3(0.25, -0.01, 0),
      ]),
    [],
  );

  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[0, 1, 2].map((i) => {
            const yOffset = -0.01 + i * 0.025;
            return (
              <mesh key={i} position={[side * 0.08, yOffset, 0.24]} rotation={[0, 0, side * 0.15]}>
                <tubeGeometry args={[curve, 12, 0.004, 6, false]} />
                <meshStandardMaterial color="#333" />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

function Smile() {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.1, 0, 0),
        new THREE.Vector3(-0.06, 0.04, 0),
        new THREE.Vector3(0, 0.055, 0),
        new THREE.Vector3(0.06, 0.04, 0),
        new THREE.Vector3(0.1, 0, 0),
      ]),
    [],
  );

  return (
    <mesh position={[0, -0.06, 0.24]}>
      <tubeGeometry args={[curve, 16, 0.012, 8, false]} />
      <meshStandardMaterial color="#cc3333" />
    </mesh>
  );
}

function Collar() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });

  return (
    <group position={[0, -0.05, 0]}>
      <mesh>
        <torusGeometry args={[0.22, 0.035, 12, 32]} />
        <meshStandardMaterial color="#ff3333" metalness={0.1} roughness={0.6} />
      </mesh>
      {/* Bell */}
      <group ref={ref} position={[0, -0.03, 0.22]}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.8]} />
          <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Bell slit */}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.015, 0.025, 0.005]} />
          <meshStandardMaterial color="#b8960c" />
        </mesh>
        {/* Bell dot */}
        <mesh position={[0, -0.04, 0.005]}>
          <sphereGeometry args={[0.008, 8, 8]} />
          <meshStandardMaterial color="#b8960c" />
        </mesh>
      </group>
    </group>
  );
}

function BellyPocket() {
  return (
    <group position={[0, -0.1, 0.22]}>
      <RoundedBox args={[0.28, 0.22, 0.04]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#f5f7fa" metalness={0.05} roughness={0.3} />
      </RoundedBox>

      <mesh position={[0, -0.05, 0.03]}>
        <boxGeometry args={[0.15, 0.005, 0.005]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>

      <mesh position={[0, -0.09, 0.03]}>
        <boxGeometry args={[0.15, 0.005, 0.005]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
    </group>
  );
}

function RoundArm({ side }: { side: 'left' | 'right' }) {
  const ref = useRef<THREE.Group>(null);
  const xSign = side === 'right' ? 1 : -1;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 2 + (side === 'right' ? 0.3 : -0.3)) * 0.2 + xSign * 0.15;
    ref.current.rotation.x = Math.sin(t * 2 + (side === 'right' ? 0 : Math.PI)) * 0.15;
  });

  return (
    <group ref={ref} position={[xSign * 0.3, 0, 0]}>
      <mesh position={[0, -0.1, 0]} rotation={[0, 0, xSign * 0.1]}>
        <capsuleGeometry args={[0.045, 0.14, 8, 12]} />
        <meshStandardMaterial color="#0099dd" metalness={0.05} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.2, 0]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshStandardMaterial color="#f5f7fa" metalness={0.05} roughness={0.3} />
      </mesh>
    </group>
  );
}

function RoundFoot({ side }: { side: 'left' | 'right' }) {
  const ref = useRef<THREE.Group>(null);
  const xSign = side === 'right' ? 1 : -1;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = Math.sin(t * 2.5 + (side === 'right' ? 0 : Math.PI)) * 0.1;
  });

  return (
    <group ref={ref} position={[xSign * 0.1, -0.28, 0]}>
      <mesh>
        <capsuleGeometry args={[0.04, 0.08, 8, 10]} />
        <meshStandardMaterial color="#f5f7fa" metalness={0.05} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.08, 0.02]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshStandardMaterial color="#f5f7fa" metalness={0.05} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Tail() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
  });

  return (
    <group ref={ref} position={[0, -0.1, -0.25]}>
      <mesh>
        <capsuleGeometry args={[0.015, 0.07, 6, 8]} />
        <meshStandardMaterial color="#ff3333" />
      </mesh>
    </group>
  );
}

function RobotModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.04;
  });

  const blueMat = (
    <meshPhysicalMaterial
      color="#0099dd"
      metalness={0.05}
      roughness={0.25}
      clearcoat={0.3}
      clearcoatRoughness={0.2}
    />
  );

  return (
    <group ref={groupRef} position={[0, 0.35, 0]}>
      {/* Tail */}
      <Tail />

      {/* Body */}
      <RoundedBox args={[0.42, 0.35, 0.38]} radius={0.12} smoothness={6} position={[0, -0.05, 0]}>
        {blueMat}
      </RoundedBox>

      {/* Belly */}
      <BellyPocket />

      {/* Neck */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.04, 12]} />
        <meshStandardMaterial color="#0077aa" metalness={0.05} roughness={0.3} />
      </mesh>

      {/* Collar */}
      <Collar />

      {/* Head */}
      <RoundedBox args={[0.48, 0.42, 0.48]} radius={0.15} smoothness={6} position={[0, 0.28, 0]}>
        {blueMat}
      </RoundedBox>

      {/* White face plate */}
      <RoundedBox args={[0.34, 0.3, 0.08]} radius={0.08} smoothness={4} position={[0, 0.27, 0.22]}>
        <meshStandardMaterial color="#f5f7fa" metalness={0.05} roughness={0.3} />
      </RoundedBox>

      {/* Eyes */}
      <BigEye position={[-0.09, 0.33, 0.28]} />
      <BigEye position={[0.09, 0.33, 0.28]} />

      {/* Nose */}
      <mesh position={[0, 0.27, 0.3]}>
        <sphereGeometry args={[0.025, 14, 14]} />
        <meshStandardMaterial color="#ff3333" emissive="#ff3333" emissiveIntensity={0.2} />
      </mesh>

      {/* Whiskers */}
      <Whiskers />

      {/* Smile */}
      <Smile />

      {/* Arms */}
      <RoundArm side="left" />
      <RoundArm side="right" />

      {/* Feet */}
      <RoundFoot side="left" />
      <RoundFoot side="right" />

      {/* Floating glow ring */}
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.2, 48]} />
        <meshStandardMaterial
          color="#00bbff"
          emissive="#00bbff"
          emissiveIntensity={0.35}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function CuteRobot() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.1, 2.5], fov: 40 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.45} color="#e0f2fe" />
        <directionalLight position={[4, 6, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-3, 3, -2]} intensity={0.4} color="#00ccff" />
        <pointLight position={[0, 2, 2.5]} intensity={0.3} color="#00ddff" distance={6} />

        <Float speed={1.2} rotationIntensity={0.03} floatIntensity={0.25}>
          <RobotModel />
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
