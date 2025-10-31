import { Injectable, OnDestroy } from '@angular/core';
import { Application } from '@splinetool/runtime';
import { TextureLoader } from 'three';

@Injectable({
  providedIn: 'root'
})
export class SplineService implements OnDestroy {
  private splineApp: Application | undefined;
  private textureLoader: TextureLoader | undefined;
  private zoom = 1;

  constructor() {
    this.initTextureLoader();
  }

  private async initTextureLoader() {
    const three = await import('three');
    this.textureLoader = new three.TextureLoader();
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  public dispose(): void {
    if (this.splineApp) {
      this.splineApp.dispose();
      this.splineApp = undefined;
    }
  }

  public initialize(canvas: HTMLCanvasElement, sceneUrl: string): void {
    this.splineApp = new Application(canvas);
    this.splineApp.load(sceneUrl);
  }

  public playAnimation(animationName = 'Timeline 1'): void {
    if (this.splineApp) {
      this.splineApp.emitEvent('play' as any, animationName);
    }
  }

  public stopAnimation(animationName = 'Timeline 1'): void {
    if (this.splineApp) {
      this.splineApp.emitEvent('stop' as any, animationName);
    }
  }

  public updateTextures(imageUrl: string, objectName = 'BlindMaterial'): void {
    if (!this.splineApp || !this.textureLoader) {
      console.warn('Spline app or texture loader not initialized.');
      return;
    }

    const obj = this.splineApp.findObjectByName(objectName);

    if (!obj) {
      console.warn(`Spline object with name "${objectName}" not found.`);
      return;
    }

    const mesh = obj as any; // Assuming obj is a mesh-like object
    if (!mesh.material) {
      console.warn(`Object "${objectName}" does not have a material.`);
      return;
    }

    this.textureLoader.load(imageUrl, (texture) => {
      // Ensure correct color space for the new texture
      // Cast to `any` to bypass faulty type definitions in the Spline runtime library
      const three = (this.splineApp as any)?.findApp('three');
      if (three) {
        texture.colorSpace = (three as any).SRGBColorSpace;
      }

      // Dispose of the old texture if it exists to free up memory
      if (mesh.material.map) {
        mesh.material.map.dispose();
      }

      // Clone the material, apply the new texture, and reassign it
      const newMaterial = mesh.material.clone();
      newMaterial.map = texture;
      newMaterial.needsUpdate = true;
      mesh.material = newMaterial;
    });
  }

  public zoomIn(): void {
    if (this.splineApp) {
      this.zoom *= 1.1;
      this.splineApp.setZoom(this.zoom);
    }
  }

  public zoomOut(): void {
    if (this.splineApp) {
      this.zoom *= 0.9;
      this.splineApp.setZoom(this.zoom);
    }
  }

  public resetCamera(): void {
    if (this.splineApp) {
      this.zoom = 1;
      this.splineApp.setZoom(this.zoom);
    }
  }

  public onResize(container: HTMLElement): void {
    if (this.splineApp) {
      this.splineApp.setSize(container.clientWidth, container.clientHeight);
    }
  }

  public getCanvasDataURL(): string | undefined {
    if (this.splineApp) {
      const canvas = this.splineApp.canvas;
      return canvas.toDataURL('image/png');
    }
    return undefined;
  }

  public loadGltfModel(gltfUrl: string, type: string): void {
    console.warn('SplineService: loadGltfModel() is not applicable. Load a spline scene via initialize().');
  }

  public updateFrame(backgroundUrl: string, objectName = 'FrameMaterial'): void {
    if (this.splineApp && this.textureLoader) {
      const obj = this.splineApp.findObjectByName(objectName);
      if (obj && (obj as any).material) {
        this.textureLoader.load(backgroundUrl, (texture) => {
          (obj as any).material.map = texture;
          (obj as any).material.needsUpdate = true;
        });
      }
    }
  }
}
