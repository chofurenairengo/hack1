'use client';

import { useState, useEffect, useCallback } from 'react';

export type CameraPermissionState = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UseCameraPermissionResult {
  readonly permissionState: CameraPermissionState;
  readonly requestPermission: () => Promise<void>;
}

export function useCameraPermission(): UseCameraPermissionResult {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return 'unsupported';
    }
    return 'checking';
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    let active = true;
    let permStatus: PermissionStatus | null = null;
    let changeHandler: (() => void) | null = null;

    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (!active) return;
        permStatus = status;
        setPermissionState(status.state as CameraPermissionState);

        changeHandler = () => {
          if (active) setPermissionState(status.state as CameraPermissionState);
        };
        status.addEventListener('change', changeHandler);
      })
      .catch(() => {
        if (active) setPermissionState('unsupported');
      });

    return () => {
      active = false;
      if (permStatus && changeHandler) {
        permStatus.removeEventListener('change', changeHandler);
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionState('granted');
    } catch {
      setPermissionState('denied');
    }
  }, []);

  return { permissionState, requestPermission };
}
