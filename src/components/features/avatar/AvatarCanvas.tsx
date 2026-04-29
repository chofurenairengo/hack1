'use client';

import { Canvas } from '@react-three/fiber';
import React from 'react';

interface AvatarCanvasProps {
  children?: React.ReactNode;
  className?: string;
}

export function AvatarCanvas({ children, className }: AvatarCanvasProps) {
  return (
    <div className={className}>
      <Canvas frameloop="demand" camera={{ position: [0, 1.2, 2.5], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} />
        {children}
      </Canvas>
    </div>
  );
}
