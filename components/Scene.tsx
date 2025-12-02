import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, Sparkles, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { LuxuryTree } from './LuxuryTree';
import { useStore } from '../store';
import * as THREE from 'three';

const CameraRig = () => {
    const { gestureData, treeState } = useStore();
    const groupRef = useRef<THREE.Group>(null);
    const vec = new THREE.Vector3();

    useFrame((state) => {
        if (groupRef.current) {
            // Mouse/Gesture based rotation
            // Normalized X/Y (0-1). 0.5 is center.
            const targetAzimuth = (gestureData.x - 0.5) * Math.PI; 
            const targetPolar = (gestureData.y - 0.5) * Math.PI * 0.5;

            // Smoothly rotate the camera rig container
            // If chaos, rotate faster automatically
            if (treeState === 'CHAOS') {
                 groupRef.current.rotation.y += 0.005;
            }

            // Apply gesture control influence
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetAzimuth, 0.05);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetPolar * 0.5, 0.05);
            
            // Breathing motion
            state.camera.position.lerp(vec.set(0, 2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.5, 22), 0.05);
            state.camera.lookAt(0, 4, 0);
        }
    });

    return (
        <group ref={groupRef}>
            <PerspectiveCamera makeDefault position={[0, 4, 20]} fov={50} />
        </group>
    );
}

export const Scene = () => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
    >
      <CameraRig />
      
      {/* Lighting - Trump Style: Warm, Gold, Bright */}
      <ambientLight intensity={0.5} color="#ffffff" />
      <spotLight position={[10, 20, 10]} angle={0.3} penumbra={1} intensity={200} color="#F4DF8D" castShadow />
      <pointLight position={[-10, 5, -10]} intensity={50} color="#023020" />
      
      {/* Environment for reflections */}
      <Environment preset="lobby" background={false} />
      
      <LuxuryTree />
      
      {/* Floating dust for atmosphere */}
      <Sparkles count={200} scale={30} size={5} speed={0.4} opacity={0.5} color="#D4AF37" />

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.8} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6}
            levels={8}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
};