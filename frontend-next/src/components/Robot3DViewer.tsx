
"use client";
import React, { Suspense, useEffect } from 'react';
import styles from './Robot3DViewer.module.css';
// @jsxImportSource react
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

function RobotModel({ scale = 3.2 }: { scale?: number }) {
  const gltf = useGLTF('/models/futuristic_flying_animated_robot_-_low_poly.glb');
  const { actions, names } = useAnimations(gltf.animations, gltf.scene);
  useEffect(() => {
    if (names && names.length > 0 && actions && actions[names[0]]) {
      actions[names[0]]?.reset?.();
      actions[names[0]]?.play?.();
    }
    return () => {
      if (names && names.length > 0 && actions && actions[names[0]]) {
        actions[names[0]]?.stop?.();
      }
    };
  }, [actions, names]);
  return <primitive object={gltf.scene} scale={scale} />;
}

export default function Robot3DViewer({ width = 80, height = 80 }) {
  return (
    <div className={styles.robot3dViewer}>
      <Canvas camera={{ position: [-0.8, -4.2, 7], fov: 30 }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 7.5] as [number, number, number]} intensity={0.7} />
        <RobotModel scale={3.2} />
        {/* No OrbitControls, no auto-rotate, just animation */}
      </Canvas>
    </div>
  );
}

// Required for GLTF loading
// @ts-ignore
if (useGLTF.preload) useGLTF.preload('/models/futuristic_flying_animated_robot_-_low_poly.glb');
