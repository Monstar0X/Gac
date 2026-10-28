import * as THREE from 'three';

/**
 * Pixel-art render pipeline.
 *
 * The scene renders into a small offscreen target (e.g. 320x180) with
 * nearest-neighbour filtering, then a fullscreen pass upscales it with
 * `NEAREST` sampling and applies a light colour-quantise + ordered dither.
 * That gives crisp chunky pixels regardless of the display resolution.
 */
export class PixelRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private target: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private width = 320;
  private height = 180;
  private canvasW = 1;
  private canvasH = 1;

  /** Base vertical resolution. Lower = chunkier pixels. */
  pixelHeight = 180;
  /** 0 = off, 1 = subtle, 2 = strong. */
  ditherAmount = 1;
  colorLevels = 24;
  /**
   * Whether the low-res target holds linear light (3D scenes) or already-encoded
   * sRGB (2D pixel canvases). The upscale pass applies the sRGB encode only for
   * linear input, so a hand-drawn pixel canvas is not washed out twice.
   */
  linearEncode = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.target = this.createTarget(this.width, this.height);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uTexel: { value: new THREE.Vector2(1 / this.width, 1 / this.height) },
        uLevels: { value: this.colorLevels },
        uDither: { value: 1 },
        uVignette: { value: 0.28 },
        uScanline: { value: 0.0 },
        uLinear: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 uTexel;
        uniform float uLevels;
        uniform float uDither;
        uniform float uVignette;
        uniform float uScanline;
        uniform float uLinear;

        // 4x4 Bayer matrix for ordered dithering.
        float bayer(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int i = x + y * 4;
          float m[16];
          m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
          m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
          m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
          m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
          for (int k = 0; k < 16; k++) {
            if (k == i) return m[k] / 16.0 - 0.5;
          }
          return 0.0;
        }

        void main() {
          vec2 uv = vUv;
          // Snap to the low-res grid so the upscale stays blocky.
          vec2 snapped = (floor(uv / uTexel) + 0.5) * uTexel;
          vec3 lin = texture2D(tDiffuse, snapped).rgb;

          // 3D scenes render in linear light and need the sRGB encode; a 2D
          // pixel canvas is authored in display space and must be left alone.
          vec3 col = mix(lin, pow(max(lin, 0.0), vec3(1.0 / 2.2)), uLinear);

          // Quantise in display space with ordered dithering.
          float levels = max(uLevels, 2.0);
          float d = bayer(uv / uTexel) * uDither / levels;
          col = floor(col * levels + 0.5 + d) / levels;

          // Warm pixel-CRT touches.
          vec2 c = uv - 0.5;
          float vig = 1.0 - dot(c, c) * uVignette * 2.0;
          col *= clamp(vig, 0.0, 1.0);

          if (uScanline > 0.0) {
            float s = 0.5 + 0.5 * cos(uv.y / uTexel.y * 3.14159);
            col *= mix(1.0, 0.86 + 0.14 * s, uScanline);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.resize();
  }

  private createTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const t = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    // Keep the intermediate buffer linear. The upscale shader performs the
    // single sRGB encode, which keeps the pipeline explicit and avoids the
    // renderer silently applying (or skipping) an encode of its own.
    t.texture.colorSpace = THREE.NoColorSpace;
    return t;
  }

  /** Recompute the internal resolution from the canvas size. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.floor(rect.width || window.innerWidth));
    const ch = Math.max(1, Math.floor(rect.height || window.innerHeight));
    this.canvasW = cw;
    this.canvasH = ch;

    this.renderer.setSize(cw, ch, false);

    const aspect = cw / ch;
    const h = Math.max(64, Math.round(this.pixelHeight));
    const w = Math.max(64, Math.round(h * aspect));
    if (w !== this.width || h !== this.height) {
      this.width = w;
      this.height = h;
      this.target.setSize(w, h);
      this.material.uniforms.uTexel.value.set(1 / w, 1 / h);
    }
  }

  get aspect(): number {
    return this.canvasW / Math.max(1, this.canvasH);
  }

  /** Low-res buffer width in pixels — the exact size 2D content should render at. */
  get targetWidth(): number {
    return this.width;
  }

  /** Low-res buffer height in pixels. */
  get targetHeight(): number {
    return this.height;
  }

  setPixelScale(scale: number): void {
    // scale 1 = sharp-ish, 4 = very chunky.
    this.pixelHeight = Math.round(720 / Math.max(1, scale));
    this.resize();
  }

  /**
   * Choose how the low-res buffer is interpreted. `true` for 3D scenes (linear
   * light), `false` for hand-drawn 2D pixel canvases (already display-space).
   */
  setLinearEncode(linear: boolean): void {
    this.linearEncode = linear;
    this.material.uniforms.uLinear.value = linear ? 1 : 0;
  }

  /** Vignette strength, 0..1. The 2D overworld wants a lighter touch. */
  setVignette(v: number): void {
    this.material.uniforms.uVignette.value = v;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    (this.quad.geometry as THREE.BufferGeometry).dispose();
    this.renderer.dispose();
  }
}
