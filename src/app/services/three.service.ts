import { Injectable, ElementRef, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Injectable({
  providedIn: 'root'
})
export class ThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private camera2d!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private textureLoader = new THREE.TextureLoader();
  private gltfLoader = new GLTFLoader();
  private cube2Mesh!: THREE.Mesh;
  private frameMesh!: THREE.Mesh;
  private cube4Mesh!: THREE.Mesh;
  public cube5Meshes: THREE.Mesh[] = [];
  private cube3Mesh!: THREE.Mesh;
  private backgroundMesh!: THREE.Mesh;
  private textureMaterial?: THREE.MeshStandardMaterial;
  private cubeMesh!: THREE.Mesh;
  private initialCameraPosition!: THREE.Vector3;
  private initialControlsTarget!: THREE.Vector3;
  
  // New properties for 2D zoom
  private zoomCamera!: THREE.OrthographicCamera;
  private mouseX = 0;
  private mouseY = 0;
  private isZooming = false;
  private readonly lensRadius = 100;
  private readonly zoomFactor = 4;

  private animationFrameId?: number;


  constructor() {}

  ngOnDestroy(): void {
    this.resetState();
  }
  
  private resetState(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.scene = new THREE.Scene();
    this.camera = null!;
    this.camera2d = null!;
    this.zoomCamera = null!;
    this.controls = null!;
  }

  public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    const canvasEl = canvas.nativeElement;

    canvasEl.classList.add('grab');

    canvasEl.addEventListener('mousedown', () => {
      canvasEl.classList.remove('grab');
      canvasEl.classList.add('grabbing');
    });

    canvasEl.addEventListener('mouseup', () => {
      canvasEl.classList.remove('grabbing');
      canvasEl.classList.add('grab');
    });

    canvasEl.addEventListener('mouseleave', () => {
      canvasEl.classList.remove('grabbing');
      canvasEl.classList.add('grab');
    });

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.initialCameraPosition = this.camera.position.clone();
    this.initialControlsTarget = this.controls.target.clone();

    this.controls.addEventListener('start', () => {
      canvasEl.classList.remove('grab');
      canvasEl.classList.add('grabbing');
    });

    this.controls.addEventListener('end', () => {
      canvasEl.classList.remove('grabbing');
      canvasEl.classList.add('grab');
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);
    
    this.animate();
  }

  public zoomIn(): void {
    if (this.controls) {
      const factor = 0.9; // <1 to zoom in
      const camera = this.controls.object;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  public zoomOut(): void {
    if (this.controls) {
      const factor = 1.1; // >1 to zoom out
      const camera = this.controls.object;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  public loadGltfModel(gltfUrl: string, type: string): void {
    this.gltfLoader.load(
      gltfUrl,
      (gltf) => {
        this.scene.add(gltf.scene);

        gltf.scene.traverse((child) => {
          if (type == 'rollerblinds') {
            const mesh = child as THREE.Mesh;
            if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
              this.cube5Meshes.push(mesh);
            }
          } else if (type == 'venetian') {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
                mesh.material = new THREE.MeshStandardMaterial({
                  color: 0xffffff,
                });
                (mesh.material as THREE.Material).needsUpdate = true;
              } else if (mesh.name.startsWith("Boolean")) {
                this.cube5Meshes.push(mesh);
              }
            }
          } else {
            if ((child as THREE.Mesh).isMesh) {
              const parent = child.parent;
              const grandParent = parent?.parent;
              if (parent && grandParent && grandParent.name === "Cube_5") {
                const index = parent.children.indexOf(child);

                if (index === 1) {
                  this.cube5Meshes.push(child as THREE.Mesh);
                } else {
                  if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                      color: 0x000000,
                    });
                    ((child as THREE.Mesh).material as THREE.Material).needsUpdate = true;
                  }
                }
              }
            }
            if ((child as THREE.Mesh).isMesh && child.name === 'Cube_4') {
              this.cube4Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube_3') {
              this.cube3Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube_2') {
              this.cube2Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube') {
              this.cubeMesh = child as THREE.Mesh;
            }
          }
        });

        if (this.textureMaterial && this.cube5Meshes.length > 0) {
          this.cube5Meshes.forEach((mesh) => {
            mesh.material = this.textureMaterial!;
            (mesh.material as THREE.Material).needsUpdate = true;
          });
        }
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );
  }

  public getCanvasDataURL(): string | undefined {
    if (!this.renderer) {
      return undefined;
    }
    this.render(); // Ensure the scene is rendered before capturing
    return this.renderer.domElement.toDataURL('image/png');
  }

  public initialize2d(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();

    this.camera2d = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    this.camera2d.position.z = 10;

    this.zoomCamera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
    this.zoomCamera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    this.animate();
  }

  public createObjects(frameUrl: string, backgroundUrl: string): void {
    // Load the frame first to determine the geometry for both planes
    this.textureLoader.load(frameUrl, (frameTexture) => {
      frameTexture.colorSpace = THREE.SRGBColorSpace;
      const { width, height } = this.getPlaneSize(frameTexture.image);

      // Create a single geometry instance to be shared by both meshes
      const geometry = new THREE.PlaneGeometry(width, height);

      // Create the frame mesh (foreground)
      const frameMaterial = new THREE.MeshBasicMaterial({
        map: frameTexture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
      });
      this.frameMesh = new THREE.Mesh(geometry, frameMaterial);
      this.frameMesh.position.z = 0; // Frame is in front
      this.scene.add(this.frameMesh);

      // Create the background mesh (background)
      const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: false });
      this.backgroundMesh = new THREE.Mesh(geometry, backgroundMaterial);
      this.backgroundMesh.position.z = -1; // Background is behind
      this.scene.add(this.backgroundMesh);

      // Now load the background texture and apply it
      if (backgroundUrl) {
        this.textureLoader.load(backgroundUrl, (backgroundTexture) => {
          backgroundTexture.colorSpace = THREE.SRGBColorSpace;
          (this.backgroundMesh.material as THREE.MeshBasicMaterial).map = backgroundTexture;
          (this.backgroundMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
          this.render();
        });
      }
      this.render();
    });
  }

  public updateTextures2d(frameUrl: string, backgroundUrl: string): void {
    // Update frame texture and resize geometry if needed
    if (this.frameMesh && frameUrl) {
      this.textureLoader.load(frameUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const { width, height } = this.getPlaneSize(texture.image);

        // A new geometry is needed for both if the frame's aspect ratio changes
        const newGeometry = new THREE.PlaneGeometry(width, height);

        // Dispose the old shared geometry and replace it on both meshes
        this.frameMesh.geometry.dispose();
        this.frameMesh.geometry = newGeometry;
        if(this.backgroundMesh) {
            this.backgroundMesh.geometry = newGeometry;
        }

        (this.frameMesh.material as THREE.MeshBasicMaterial).map = texture;
        (this.frameMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;

        this.render();
      });
    }

    // Update background texture only
    if (backgroundUrl) {
      this.textureLoader.load(backgroundUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        if (!this.backgroundMesh) {
          // This case handles if background is added for the first time after initial creation
          if (this.frameMesh) {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            this.backgroundMesh = new THREE.Mesh(this.frameMesh.geometry, material); // Use frame's geometry
            this.backgroundMesh.position.z = -1;
            this.scene.add(this.backgroundMesh);
          }
        } else {
            // Simply update the map on the existing material
            (this.backgroundMesh.material as THREE.MeshBasicMaterial).map = texture;
            (this.backgroundMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
        this.render();
      });
    }
  }

  public updateTextures(backgroundUrl: string): void {
    if (!backgroundUrl) return;

    this.textureLoader.load(backgroundUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      if (this.textureMaterial) {
        this.textureMaterial.dispose();
      }

      this.textureMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });

      if (this.cube5Meshes.length) {
        this.cube5Meshes.forEach((mesh) => {
          mesh.material = this.textureMaterial!;
          (mesh.material as THREE.Material).needsUpdate = true;
        });
      }
    });
  }

  private getPlaneSize(image: HTMLImageElement): { width: number; height: number } {
    const canvasWidth = this.renderer.domElement.clientWidth;
    const canvasHeight = this.renderer.domElement.clientHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    const imageAspect = image.width / image.height;

    let width: number, height: number;

    if (canvasAspect > imageAspect) {
      width = canvasWidth;
      height = canvasWidth / imageAspect;
    } else {
      height = canvasHeight;
      width = canvasHeight * imageAspect;
    }

    return { width, height };
  }

  public updateFrame(backgroundUrl: string): void {
    if (!backgroundUrl) return;

    const meshes = [this.cubeMesh, this.cube2Mesh, this.cube3Mesh];

    this.textureLoader.load(backgroundUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const newMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });

      meshes.forEach((mesh) => {
        if (mesh) {
          mesh.material = newMaterial;
          (mesh.material as THREE.Material).needsUpdate = true;
        }
      });
    });
  }

  public resetCamera(): void {
    if (this.camera && this.controls) {
      this.camera.position.copy(this.initialCameraPosition);
      this.controls.target.copy(this.initialControlsTarget);
      this.controls.update();
    }
  }

  public animate(): void {
    const loop = () => {
      if (this.controls) {
        this.controls.update();
      }
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }

    if (this.camera?.isPerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.camera2d?.isOrthographicCamera) {
      this.camera2d.left = width / -2;
      this.camera2d.right = width / 2;
      this.camera2d.top = height / 2;
      this.camera2d.bottom = height / -2;
      this.camera2d.updateProjectionMatrix();

      if (this.frameMesh && (this.frameMesh.material as THREE.MeshBasicMaterial).map) {
        const { width: planeWidth, height: planeHeight } = this.getPlaneSize(
          (this.frameMesh.material as THREE.MeshBasicMaterial).map!.image
        );
        this.frameMesh.geometry.dispose();
        this.frameMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      }
      if (this.backgroundMesh && (this.backgroundMesh.material as THREE.MeshBasicMaterial).map) {
        const { width: planeWidth, height: planeHeight } = this.getPlaneSize(
          (this.backgroundMesh.material as THREE.MeshBasicMaterial).map!.image
        );
        this.backgroundMesh.geometry.dispose();
        this.backgroundMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
      }
      this.render();
    }
  }


  public setZoom(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public enableZoom(enabled: boolean): void {
    this.isZooming = enabled;
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    // Traverse the scene and dispose of all objects
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        }
      });
      // Remove all children from the scene
      while(this.scene.children.length > 0){
        this.scene.remove(this.scene.children[0]);
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null!;
    }

    // Nullify other properties
    this.camera = null!;
    this.camera2d = null!;
    this.zoomCamera = null!;
    this.controls = null!;
    this.scene = null!;
  }
  private render(): void {
    if (!this.renderer || !this.scene) {
      return;
    }

    const activeCamera = this.camera2d || this.camera;
    if (!activeCamera) return;

    if (this.camera2d) { 
      const width = this.renderer.domElement.clientWidth;
      const height = this.renderer.domElement.clientHeight;

      this.renderer.clear();
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.setScissorTest(true);
      this.renderer.render(this.scene, this.camera2d);

      if (this.isZooming) {
        const lensX = this.mouseX;
        const lensY = this.mouseY;
        const lensRadius = this.lensRadius;

        const worldX = this.camera2d.left + (lensX / width) * (this.camera2d.right - this.camera2d.left);
        const worldY = this.camera2d.top - (lensY / height) * (this.camera2d.top - this.camera2d.bottom);

        const zoomSize = (this.camera2d.right - this.camera2d.left) / this.zoomFactor;

        this.zoomCamera.left = worldX - (zoomSize / 2);
        this.zoomCamera.right = worldX + (zoomSize / 2);
        this.zoomCamera.top = worldY + (zoomSize / 2);
        this.zoomCamera.bottom = worldY - (zoomSize / 2);
        this.zoomCamera.updateProjectionMatrix();

        this.renderer.setViewport(lensX - lensRadius, height - lensY - lensRadius, lensRadius * 2, lensRadius * 2);
        this.renderer.setScissor(lensX - lensRadius, height - lensY - lensRadius, lensRadius * 2, lensRadius * 2);
        this.renderer.setScissorTest(true);

        this.renderer.render(this.scene, this.zoomCamera);
      }
      this.renderer.setScissorTest(false);
    } else { 
      this.renderer.render(this.scene, this.camera);
    }
  }
}
