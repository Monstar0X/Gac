import * as THREE from 'three';
import { PixelRenderer } from './pixel';

export interface StageContent {
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Called every frame before rendering. */
  update?: (t: number, dt: number) => void;
  /** Called on resize so the content can update its camera projection. */
  onResize?: (aspect: number) => void;
}

/**
 * Single owner of the WebGL context and the render loop. Screens swap the
 * active `StageContent` instead of creating competing renderers, which keeps
 * one context per canvas (browsers cap how many you may create).
 */
export class Stage {
  readonly pixel: PixelRenderer;
  private current: StageContent | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private running = false;
  private frameSkip = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.pixel = new PixelRenderer(canvas);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.pixel.resize();
    if (this.current) {
      this.current.onResize?.(this.pixel.aspect);
      const cam = this.current.camera as THREE.PerspectiveCamera;
      if (cam.isPerspectiveCamera) {
        cam.aspect = this.pixel.aspect;
        cam.updateProjectionMatrix();
      }
    }
  };

  setPixelScale(scale: number) {
    this.pixel.setPixelScale(scale);
    this.onResize();
  }

  /** Swap the rendered content. The previous content is not disposed. */
  show(content: StageContent | null) {
    this.current = content;
    this.pixel.resize();
    if (content) {
      const cam = content.camera as THREE.PerspectiveCamera;
      if (cam.isPerspectiveCamera) {
        cam.aspect = this.pixel.aspect;
        cam.updateProjectionMatrix();
      }
      content.onResize?.(this.pixel.aspect);
    }
    if (content && !this.running) this.start();
    if (!content) this.stop();
  }

  private start() {
    this.running = true;
    this.clock.getDelta();
    this.loop();
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.elapsed += dt;
    if (!this.current) return;
    this.current.update?.(this.elapsed, dt);
    this.pixel.render(this.current.scene, this.current.camera);
  };

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.pixel.dispose();
  }
}
