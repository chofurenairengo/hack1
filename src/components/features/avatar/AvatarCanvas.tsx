'use client';

import { Canvas } from '@react-three/fiber';
import React from 'react';

interface CameraConfig {
  position?: [number, number, number];
  fov?: number;
}

interface AvatarCanvasProps {
  children?: React.ReactNode;
  className?: string;
  camera?: CameraConfig;
  transparent?: boolean;
}

export function AvatarCanvas({ children, className, camera, transparent }: AvatarCanvasProps) {
  const cameraConfig = {
    position: camera?.position ?? ([0, 1.2, 2.5] as [number, number, number]),
    fov: camera?.fov ?? 50,
  };
  return (
    <div className={className}>
      <Canvas
        frameloop="demand"
        camera={cameraConfig}
        dpr={[1, 2]}
        gl={transparent ? { alpha: true } : undefined}
        onCreated={transparent ? ({ gl }) => gl.setClearColor(0x000000, 0) : undefined}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={0.8} />
        {children}
      </Canvas>
    </div>
  );
}
