import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { TreeState } from '../types';
import { Float, Instance, Instances, useTexture } from '@react-three/drei';

// --- Constants ---
const COUNT_NEEDLES = 5000;
const COUNT_ORNAMENTS = 150;
const COUNT_PHOTOS = 12;
const CHAOS_RADIUS = 25;
const TREE_HEIGHT = 12;
const TREE_RADIUS_BASE = 4;

// --- Helpers ---
const randomVector = (r: number) => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const getConePos = (ratio: number, angleOffset: number) => {
  // Ratio 0 = top, 1 = bottom
  const y = (1 - ratio) * TREE_HEIGHT - (TREE_HEIGHT / 2);
  const r = ratio * TREE_RADIUS_BASE;
  const angle = ratio * Math.PI * 10 + angleOffset;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  return new THREE.Vector3(x, y, z);
};

// --- Sub-components ---

// 1. Needles (Particles)
const Needles = () => {
  const { treeState } = useStore();
  const pointsRef = useRef<THREE.Points>(null);
  
  // Data prep
  const { positionsChaos, positionsTarget, colors } = useMemo(() => {
    const pChaos = new Float32Array(COUNT_NEEDLES * 3);
    const pTarget = new Float32Array(COUNT_NEEDLES * 3);
    const cols = new Float32Array(COUNT_NEEDLES * 3);
    
    const color1 = new THREE.Color('#023020'); // Deep Emerald
    const color2 = new THREE.Color('#0B4619'); // Lighter Emerald
    
    for (let i = 0; i < COUNT_NEEDLES; i++) {
      // Chaos
      const vChaos = randomVector(CHAOS_RADIUS);
      pChaos.set([vChaos.x, vChaos.y, vChaos.z], i * 3);
      
      // Target (Cone volume)
      const ratio = Math.pow(Math.random(), 0.8); // Bias towards bottom
      const angle = Math.random() * Math.PI * 2;
      const r = ratio * TREE_RADIUS_BASE;
      const y = (1 - ratio) * TREE_HEIGHT - (TREE_HEIGHT/2);
      // Add some jitter to target
      const x = Math.cos(angle) * r + (Math.random() - 0.5);
      const z = Math.sin(angle) * r + (Math.random() - 0.5);
      
      pTarget.set([x, y, z], i * 3);
      
      // Color
      const c = Math.random() > 0.5 ? color1 : color2;
      cols.set([c.r, c.g, c.b], i * 3);
    }
    return { positionsChaos: pChaos, positionsTarget: pTarget, colors: cols };
  }, []);

  // Animation buffer
  const currentPositions = useMemo(() => new Float32Array(positionsChaos), [positionsChaos]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const target = treeState === TreeState.FORMED ? 1 : 0;
    // We update the geometry attributes directly for performance on 5k particles
    // though ShaderMaterial would be more performant, CPU update is fine for 5k.
    
    const lerpFactor = THREE.MathUtils.damp(0, 1, 3, delta); // Use a standard lerp factor derived from logic if needed, but here we iterate
    
    // We need a persistent progress tracker ideally, but simple damp approach:
    // Actually, let's just lerp each point towards its destination based on state
    // To do this efficiently, we might need a custom shader.
    // Let's stick to a simpler approach: Uniform time transition in shader.
    
    // Changing approach: Pass "progress" to shader.
    (pointsRef.current.material as THREE.ShaderMaterial).uniforms.uProgress.value = THREE.MathUtils.lerp(
      (pointsRef.current.material as THREE.ShaderMaterial).uniforms.uProgress.value,
      target,
      delta * 2
    );
    
    (pointsRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
  });

  const shaderArgs = useMemo(() => ({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 6.0 * (window.devicePixelRatio || 1) }
    },
    vertexShader: `
      uniform float uProgress;
      uniform float uTime;
      uniform float uSize;
      attribute vec3 aPosTarget;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec3 pos = mix(position, aPosTarget, uProgress); // position attribute holds Chaos
        
        // Add subtle wind/breathing
        float breath = sin(uTime * 2.0 + pos.y) * 0.1;
        pos.x += breath * (1.0 - uProgress); 
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (10.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Circular particle
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        
        gl_FragColor = vec4(vColor, 1.0);
      }
    `
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positionsChaos.length / 3}
          array={positionsChaos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aPosTarget"
          count={positionsTarget.length / 3}
          array={positionsTarget}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial attach="material" args={[shaderArgs]} vertexColors blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
};

// 2. Ornaments (InstancedMesh)
const Ornaments = () => {
  const { treeState } = useStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    return new Array(COUNT_ORNAMENTS).fill(0).map((_, i) => {
      const chaos = randomVector(CHAOS_RADIUS * 1.2);
      const ratio = Math.random();
      const target = getConePos(ratio, i * 0.5); // Spiral distribution
      
      // Push target slightly out to sit on leaves
      target.x *= 1.1;
      target.z *= 1.1;

      return { chaos, target, scale: 0.2 + Math.random() * 0.3 };
    });
  }, []);
  
  // Initial Colors
  useEffect(() => {
    if (meshRef.current) {
        const gold = new THREE.Color('#D4AF37');
        const red = new THREE.Color('#8B0000');
        const silver = new THREE.Color('#CCCCCC');
        
        for (let i = 0; i < COUNT_ORNAMENTS; i++) {
            const rand = Math.random();
            const col = rand > 0.6 ? gold : (rand > 0.3 ? red : silver);
            meshRef.current.setColorAt(i, col);
        }
        meshRef.current.instanceColor!.needsUpdate = true;
    }
  }, []);

  const progressRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const target = treeState === TreeState.FORMED ? 1 : 0;
    progressRef.current = THREE.MathUtils.damp(progressRef.current, target, 2.5, delta);

    for (let i = 0; i < COUNT_ORNAMENTS; i++) {
      const { chaos, target, scale } = data[i];
      dummy.position.lerpVectors(chaos, target, progressRef.current);
      
      // Spin animation when in chaos
      dummy.rotation.x = state.clock.elapsedTime * (0.2 + i * 0.01) * (1 - progressRef.current);
      dummy.rotation.y = state.clock.elapsedTime * (0.3 + i * 0.01) * (1 - progressRef.current);
      
      // Scale pop effect
      dummy.scale.setScalar(scale * (0.8 + 0.2 * Math.sin(state.clock.elapsedTime * 2 + i)));
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT_ORNAMENTS]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        metalness={0.9} 
        roughness={0.1} 
        envMapIntensity={1.5}
        color="#ffffff"
      />
    </instancedMesh>
  );
};

// 3. Polaroids
const Polaroid = ({ url, position, rotation, index }: { url: string, position: THREE.Vector3, rotation: THREE.Euler, index: number }) => {
    const { treeState } = useStore();
    const meshRef = useRef<THREE.Group>(null);
    const texture = useTexture(url);
    const chaosPos = useMemo(() => randomVector(15), []);
    const progressRef = useRef(0);
    const randomRot = useMemo(() => new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, 0), []);

    useFrame((state, delta) => {
        if(!meshRef.current) return;
        const target = treeState === TreeState.FORMED ? 1 : 0;
        progressRef.current = THREE.MathUtils.damp(progressRef.current, target, 2, delta);

        meshRef.current.position.lerpVectors(chaosPos, position, progressRef.current);
        
        // Quaternion slerp manually or just lerp Euler loosely
        meshRef.current.rotation.x = THREE.MathUtils.lerp(randomRot.x, rotation.x, progressRef.current);
        meshRef.current.rotation.y = THREE.MathUtils.lerp(randomRot.y, rotation.y + Math.sin(state.clock.elapsedTime + index)*0.1, progressRef.current);
        meshRef.current.rotation.z = THREE.MathUtils.lerp(randomRot.z, rotation.z, progressRef.current);
    });

    return (
        <group ref={meshRef}>
            {/* Frame */}
            <mesh position={[0, 0, -0.01]}>
                <boxGeometry args={[1.2, 1.5, 0.05]} />
                <meshStandardMaterial color="#fffff0" roughness={0.8} />
            </mesh>
            {/* Photo */}
            <mesh position={[0, 0.1, 0.02]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial map={texture} />
            </mesh>
        </group>
    )
}

const PhotoGallery = () => {
    // Generate static photo positions on the tree
    const photos = useMemo(() => {
        return new Array(COUNT_PHOTOS).fill(0).map((_, i) => {
            const ratio = 0.2 + (i / COUNT_PHOTOS) * 0.6; // Keep in middle band
            const pos = getConePos(ratio, i * (Math.PI / 1.5));
            pos.multiplyScalar(1.2); // Float outside tree
            
            const rot = new THREE.Euler(0, -Math.atan2(pos.z, pos.x) + Math.PI / 2, (Math.random()-0.5)*0.2);
            
            // Use Picsum with specific IDs for consistency or random
            const id = 10 + i;
            return {
                url: `https://picsum.photos/id/${id}/200/200`,
                position: pos,
                rotation: rot,
                id: i
            };
        });
    }, []);

    return (
        <group>
            {photos.map((p) => (
                <Polaroid key={p.id} index={p.id} url={p.url} position={p.position} rotation={p.rotation} />
            ))}
        </group>
    );
};

export const LuxuryTree = () => {
  return (
    <group position={[0, -2, 0]}>
      <Needles />
      <Ornaments />
      <React.Suspense fallback={null}>
         <PhotoGallery />
      </React.Suspense>
    </group>
  );
};