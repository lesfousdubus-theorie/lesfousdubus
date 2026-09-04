import type * as React from "react";
import type * as THREE from "three";

declare module "@react-three/fiber" {
  export interface RootState {
    gl: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.Camera;
    raycaster: THREE.Raycaster;
    size: { width: number; height: number; top: number; left: number };
    viewport: { width: number; height: number; factor: number; distance: number; aspect: number };
    clock: THREE.Clock;
    pointer: THREE.Vector2;
    [key: string]: any;
  }

  export type RenderCallback = (state: RootState, delta: number, xrFrame?: any) => void;

  export function useFrame(callback: RenderCallback, renderPriority?: number): void;
  export function useThree<T = RootState>(selector?: (state: RootState) => T, equalityFn?: (a: T, b: T) => boolean): T;
  export const Canvas: React.ForwardRefExoticComponent<any>;
  export interface ThreeElements {
    [elemName: string]: any;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        [elemName: string]: any;
      }
    }
  }
}

export {};
