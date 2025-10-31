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
    this.splineApp = undefined;
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
    if (this.splineApp && this.textureLoader) {
      const obj = this.splineApp.findObjectByName(objectName);
      if (obj && (obj as any).material) {
        this.textureLoader.load(imageUrl, (texture) => {
          (obj as any).material.map = texture;
          (obj as any).material.needsUpdate = true;
        });
      }
    }
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
