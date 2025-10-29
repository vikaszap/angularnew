import { Injectable, ElementRef, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({ providedIn: 'root' })
export class ThreeService implements OnDestroy {
  // ---------- Common ----------
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private textureLoader = new THREE.TextureLoader();

  // ---------- 3D ----------
  private camera!: THREE.PerspectiveCamera; // main 3D camera (referred to as camera when 3D is active)
  private controls?: OrbitControls;
  private gltfLoader = new GLTFLoader();

  // Model parts (optional, populated when GLTF loaded)
  public cube5Meshes: THREE.Mesh[] = [];
  private cubeMesh?: THREE.Mesh;
  private cube2Mesh?: THREE.Mesh;
  private cube3Mesh?: THREE.Mesh;
  private cube4Mesh?: THREE.Mesh;

  private initialCameraPosition?: THREE.Vector3;
  private initialControlsTarget?: THREE.Vector3;

  private is3dInitialized = false;

  // ---------- 2D ----------
  private camera2d!: THREE.OrthographicCamera;
  private zoomCamera?: THREE.OrthographicCamera; // for lens view
  private frameMesh?: THREE.Mesh; // 2D frame plane
  private backgroundMesh?: THREE.Mesh; // 2D background plane
  private is2dInitialized = false;

  // ---------- 2D zoom lens ----------
  private isZooming = false;
  private mouseX = 0;
  private mouseY = 0;
  private zoomFactor = 8;
  private lensRadius = 75;

  constructor() {}

  ngOnDestroy(): void {
    try {
      this.disposeAll();
      this.renderer?.dispose();
    } catch (e) {
      // ignore
    }
  }

  // ------------------------------ Initialization ------------------------------
  /** Initialize 3D scene, camera, renderer & controls. */
  public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas.nativeElement, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = (THREE as any).SRGBColorSpace || THREE.sRGBEncoding as any;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 1, 1);
    this.scene.add(ambient, dir);

    this.initialCameraPosition = this.camera.position.clone();
    this.initialControlsTarget = this.controls.target.clone();

    this.is3dInitialized = true;
  }

  /** Initialize 2D orthographic scene & renderer. */
  public initialize2d(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.scene = new THREE.Scene();

    this.camera2d = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    this.camera2d.position.z = 10;

    this.zoomCamera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    this.zoomCamera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas.nativeElement, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height, false);
    this.renderer.autoClear = false;

    this.is2dInitialized = true;
  }

  // ------------------------------ Create Objects (2D) ------------------------------
  /** Create 2D background + frame planes. Safely disposes previous meshes & textures. */
  public createObjects(frameUrl: string, backgroundUrl: string): void {
    if (!this.renderer) return;

    const width = Math.max(1, this.renderer.domElement.clientWidth);
    const height = Math.max(1, this.renderer.domElement.clientHeight);

    // Dispose previous
    if (this.frameMesh) {
      this.disposeMesh(this.frameMesh);
      this.scene.remove(this.frameMesh);
      this.frameMesh = undefined;
    }
    if (this.backgroundMesh) {
      this.disposeMesh(this.backgroundMesh);
      this.scene.remove(this.backgroundMesh);
      this.backgroundMesh = undefined;
    }

    // Background
    const bgGeom = new THREE.PlaneGeometry(width, height);
    const bgTex = this.textureLoader.load(backgroundUrl, () => this.render());
    bgTex.colorSpace = (THREE as any).SRGBColorSpace || THREE.sRGBEncoding as any;
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, transparent: false });
    this.backgroundMesh = new THREE.Mesh(bgGeom, bgMat);
    this.backgroundMesh.position.z = -1;
    this.scene.add(this.backgroundMesh);

    // Frame (on top)
    const frameGeom = new THREE.PlaneGeometry(width, height);
    const frameTex = this.textureLoader.load(frameUrl, () => this.render());
    frameTex.colorSpace = (THREE as any).SRGBColorSpace || THREE.sRGBEncoding as any;
    const frameMat = new THREE.MeshBasicMaterial({ map: frameTex, transparent: true, alphaTest: 0.1, depthWrite: false });
    this.frameMesh = new THREE.Mesh(frameGeom, frameMat);
    this.frameMesh.position.z = 0;
    this.scene.add(this.frameMesh);

    // Start 2D loop (if desired) — simple continuous render for lens
    this.animate2d();
  }

  // ------------------------------ Update Textures ------------------------------
  /**
   * Update textures for 3D model parts.
   * - textureUrl: new texture url
   * - target: 'fabric' | 'frame' | 'all' — decides which meshes to update
   */
  public updateTextures(textureUrl: string, target: 'fabric' | 'frame' | 'all' = 'fabric'): void {
    if (!textureUrl) return;

    // Load new texture and apply where needed
    this.textureLoader.load(textureUrl, (texture) => {
      try {
        texture.colorSpace = (THREE as any).SRGBColorSpace || THREE.sRGBEncoding as any;
      } catch (e) {
        // ignore if colorSpace not available
      }

      // If target is fabric (or all), update cube5Meshes (roller / slats)
      if ((target === 'fabric' || target === 'all') && this.cube5Meshes.length) {
        const mat = new THREE.MeshStandardMaterial({ map: texture });
        this.cube5Meshes.forEach((m) => {
          this.safeReplaceMaterial(m, mat);
        });
      }

      // If target is frame (or all), update frame parts (cubeMesh, cube2Mesh, cube3Mesh)
      if (target === 'frame' || target === 'all') {
        const matFrame = new THREE.MeshStandardMaterial({ map: texture });
        [this.cubeMesh, this.cube2Mesh, this.cube3Mesh].forEach((m) => {
          if (m) this.safeReplaceMaterial(m, matFrame);
        });
      }

      // If there are generic MeshStandardMaterial meshes you want updated (venetian fallback)
      if (target === 'all') {
        this.scene.traverse((child: any) => {
          if (child.isMesh && child.material && (child.material as any).isMeshStandardMaterial) {
            this.safeReplaceMaterial(child as THREE.Mesh, new THREE.MeshStandardMaterial({ map: texture }));
          }
        });
      }
    });
  }

  /**
   * Update the frame - accepts color (hex number or hex string) OR a texture URL
   * - if frameArg is string and looks like URL (starts with http or contains '/'), treat as texture
   * - otherwise treat as color
   */
  public updateFrame(frameArg: string | number): void {
    if (!frameArg) return;

    // If string and looks like url -> treat as texture
    if (typeof frameArg === 'string' && (frameArg.includes('/') || frameArg.startsWith('http'))) {
      // load texture and apply to frame meshes
      this.textureLoader.load(frameArg, (texture) => {
        try { texture.colorSpace = (THREE as any).SRGBColorSpace || THREE.sRGBEncoding as any; } catch (e) {}
        const mat = new THREE.MeshStandardMaterial({ map: texture });
        [this.cubeMesh, this.cube2Mesh, this.cube3Mesh, this.cube4Mesh].forEach((m) => { if (m) this.safeReplaceMaterial(m, mat); });
      });
      return;
    }

    // Otherwise, treat as color
    const colorValue = typeof frameArg === 'number' ? frameArg : new THREE.Color(frameArg).getHex();
    const mat = new THREE.MeshStandardMaterial({ color: colorValue });

    [this.cubeMesh, this.cube2Mesh, this.cube3Mesh, this.cube4Mesh].forEach((m) => {
      if (m) this.safeReplaceMaterial(m, mat);
    });
  }

  // ------------------------------ Helpers ------------------------------
  private safeReplaceMaterial(mesh: THREE.Mesh, newMaterial: THREE.Material) {
    try {
      // dispose old material and textures if not reused
      const oldMat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (oldMat) this.disposeMaterial(oldMat);
    } catch (e) {}

    mesh.material = newMaterial as any;
    (mesh.material as THREE.Material).needsUpdate = true;
  }

  private disposeMaterial(mat: THREE.Material | THREE.Material[]) {
    if (Array.isArray(mat)) {
      mat.forEach(m => this.disposeMaterial(m));
      return;
    }
    const m = mat as THREE.Material;
    const anyMat = m as any;
    try {
      if (anyMat.map) { anyMat.map.dispose(); }
      if (anyMat.lightMap) { anyMat.lightMap.dispose(); }
      if (anyMat.bumpMap) { anyMat.bumpMap.dispose(); }
      if (anyMat.normalMap) { anyMat.normalMap.dispose(); }
      if (anyMat.roughnessMap) { anyMat.roughnessMap.dispose(); }
    } catch (e) {}

    try { m.dispose(); } catch (e) {}
  }

  private disposeMesh(mesh: THREE.Mesh) {
    try {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        this.disposeMaterial(mesh.material as any);
      }
    } catch (e) {}
  }

  private disposeAll() {
    try {
      if (this.frameMesh) { this.disposeMesh(this.frameMesh); this.frameMesh = undefined; }
      if (this.backgroundMesh) { this.disposeMesh(this.backgroundMesh); this.backgroundMesh = undefined; }
      this.cube5Meshes.forEach(m => this.disposeMesh(m));
      [this.cubeMesh, this.cube2Mesh, this.cube3Mesh, this.cube4Mesh].forEach(m => { if (m) this.disposeMesh(m); });
    } catch (e) {}
  }

  // ------------------------------ 2D Render / Lens ------------------------------
  private animate2d(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  private render(): void {
    if (!this.renderer) return;

    // If 3D initialized -> render 3D scene
    if (this.is3dInitialized && this.camera) {
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Else 2D
    if (this.is2dInitialized && this.camera2d) {
      const width = this.renderer.domElement.clientWidth;
      const height = this.renderer.domElement.clientHeight;

      this.renderer.clear();
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.setScissorTest(true);
      this.renderer.render(this.scene, this.camera2d);

      if (this.isZooming && this.zoomCamera) {
        const lensX = this.mouseX;
        const lensY = this.mouseY;
        const lensR = this.lensRadius;

        const worldX = this.camera2d.left + (lensX / width) * (this.camera2d.right - this.camera2d.left);
        const worldY = this.camera2d.top - (lensY / height) * (this.camera2d.top - this.camera2d.bottom);

        const zoomSize = (this.camera2d.right - this.camera2d.left) / this.zoomFactor;

        this.zoomCamera.left = worldX - zoomSize / 2;
        this.zoomCamera.right = worldX + zoomSize / 2;
        this.zoomCamera.top = worldY + zoomSize / 2;
        this.zoomCamera.bottom = worldY - zoomSize / 2;
        this.zoomCamera.updateProjectionMatrix();

        this.renderer.setViewport(lensX - lensR, height - lensY - lensR, lensR * 2, lensR * 2);
        this.renderer.setScissor(lensX - lensR, height - lensY - lensR, lensR * 2, lensR * 2);
        this.renderer.setScissorTest(true);
        this.renderer.render(this.scene, this.zoomCamera);
      }

      this.renderer.setScissorTest(false);
    }
  }

  public setZoom(x: number, y: number) { this.mouseX = x; this.mouseY = y; }
  public enableZoom(enabled: boolean) { this.isZooming = enabled; }

  // ------------------------------ 3D Controls helpers ------------------------------
  public zoomIn(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.multiplyScalar(0.9);
    this.controls.update();
  }

  public zoomOut(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.multiplyScalar(1.1);
    this.controls.update();
  }

  public resetCamera(): void {
    if (!this.camera || !this.controls || !this.initialCameraPosition || !this.initialControlsTarget) return;
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.update();
  }

  // ------------------------------ GLTF loader (3D) ------------------------------
  public loadGltfModel(gltfUrl: string, type: string): void {
    if (!this.is3dInitialized) return;

    this.gltfLoader.load(
      gltfUrl,
      (gltf) => {
        // cleanup previous model children if needed
        // (optional) - you can keep or clear previous models based on your app needs
        this.scene.add(gltf.scene);

        // traverse and store references to important meshes
        gltf.scene.traverse((child: any) => {
          if (!child.isMesh) return;
          const mesh = child as THREE.Mesh;

          // store commonly used parts for later texture/frame updates
          if (mesh.name.startsWith('Cube_5') || mesh.parent?.name === 'Cube_5') {
            this.cube5Meshes.push(mesh);
          }

          if (mesh.name === 'Cube') this.cubeMesh = mesh;
          if (mesh.name === 'Cube_2') this.cube2Mesh = mesh;
          if (mesh.name === 'Cube_3') this.cube3Mesh = mesh;
          if (mesh.name === 'Cube_4') this.cube4Mesh = mesh;

          // type-specific quick fixes
          if (type === 'venetian') {
            // ensure slats have MeshStandardMaterial to accept textures
            if (!(mesh.material && (mesh.material as any).isMeshStandardMaterial)) {
              mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            }
          }
        });

        // start 3D loop
        this.animate3d();
      },
      undefined,
      (err) => console.error('GLTF load error', err)
    );
  }

  private animate3d(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      this.controls?.update();
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  // ------------------------------ Resizing ------------------------------
  public onResize(container: HTMLElement): void {
    if (!this.renderer) return;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer.setSize(width, height, false);

    if (this.is3dInitialized && this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.is2dInitialized && this.camera2d) {
      this.camera2d.left = width / -2;
      this.camera2d.right = width / 2;
      this.camera2d.top = height / 2;
      this.camera2d.bottom = height / -2;
      this.camera2d.updateProjectionMatrix();

      // update 2D geometries to match
      if (this.frameMesh) {
        this.frameMesh.geometry.dispose();
        this.frameMesh.geometry = new THREE.PlaneGeometry(width, height);
      }
      if (this.backgroundMesh) {
        this.backgroundMesh.geometry.dispose();
        this.backgroundMesh.geometry = new THREE.PlaneGeometry(width, height);
      }
    }
  }

  // ------------------------------ Utility (capture) ------------------------------
  public getCanvasDataURL(): string | undefined {
    if (!this.renderer) return undefined;
    try {
      // render to ensure up-to-date
      if (this.is3dInitialized) this.renderer.render(this.scene, this.camera);
      if (this.is2dInitialized && this.camera2d) this.renderer.render(this.scene, this.camera2d);
      return this.renderer.domElement.toDataURL('image/png');
    } catch (e) {
      return undefined;
    }
  }
}
