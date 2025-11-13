
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
    // Apply custom colors to robot parts
    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        const meshName = child.name.toLowerCase();
        
        // Apply Nepal crimson red to stomach/body/torso area
        if (meshName.includes('body') || meshName.includes('torso') || 
            meshName.includes('stomach') || meshName.includes('chest') ||
            meshName.includes('abdomen')) {
          child.material = child.material.clone();
          child.material.color.setHex(0xE8214A); // Nepal crimson red (#E8214A)
          child.material.emissive.setHex(0xDC143C); // Bright red glow
          child.material.emissiveIntensity = 0.3;
        }
        
        // Apply blue to tail/back/rear area for Nepal flag border context
        if (meshName.includes('tail') || meshName.includes('back') || 
            meshName.includes('rear') || meshName.includes('propeller') ||
            meshName.includes('wing')) {
          child.material = child.material.clone();
          child.material.color.setHex(0x003893); // Nepal flag blue (#003893)
          child.material.emissive.setHex(0x0066CC); // Bright blue glow
          child.material.emissiveIntensity = 0.3;
        }
        
        // Make all parts slightly brighter
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }, [gltf.scene]);
  
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
        {/* Ambient light - bright white base for visibility */}
        <ambientLight intensity={1.0} color="#ffffff" />
        {/* Main light - warm light to enhance red */}
        <directionalLight position={[5, 10, 7.5] as [number, number, number]} intensity={0.9} color="#ffffff" />
        {/* Accent light - cool light to enhance blue */}
        <directionalLight position={[-5, 5, 5] as [number, number, number]} intensity={0.7} color="#ffffff" />
        {/* Fill light - from below for depth */}
        <pointLight position={[0, -3, 5] as [number, number, number]} intensity={0.5} color="#ffffff" />
        {/* Additional spotlight for extra brightness and visibility */}
        <spotLight position={[0, 8, 8] as [number, number, number]} intensity={0.6} color="#ffffff" angle={0.5} />
        <RobotModel scale={3.2} />
        {/* No OrbitControls, no auto-rotate, just animation */}
      </Canvas>
    </div>
  );
}

// Required for GLTF loading
// @ts-ignore
if (useGLTF.preload) useGLTF.preload('/models/futuristic_flying_animated_robot_-_low_poly.glb');
