import * as THREE from 'three';

export interface InputState {
  forward: number;
  right: number;
  /** Touch joystick vector, already normalised. */
  joyX: number;
  joyY: number;
  run: boolean;
}

/**
 * Collects keyboard, pointer and touch input. Pointer drag orbits the camera;
 * the on-screen joystick (rendered by the UI layer) drives movement on touch.
 */
export class InputController {
  readonly keys = new Set<string>();
  private dragActive = false;
  private lastX = 0;
  private lastY = 0;
  /** Accumulated camera yaw/pitch deltas since last read. */
  camYawDelta = 0;
  camPitchDelta = 0;
  joy = { x: 0, y: 0, active: false };
  run = false;
  interactPressed = false;

  private handlers: { target: EventTarget; type: string; fn: EventListener }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.on(window, 'keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.repeat) return;
      const k = ke.key.toLowerCase();
      this.keys.add(k);
      if (k === 'e' || k === 'enter') this.interactPressed = true;
      if (k === 'shift') this.run = true;
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        ke.preventDefault();
      }
    });
    this.on(window, 'keyup', (e) => {
      const ke = e as KeyboardEvent;
      const k = ke.key.toLowerCase();
      this.keys.delete(k);
      if (k === 'shift') this.run = false;
    });
    this.on(window, 'blur', () => {
      this.keys.clear();
      this.run = false;
      this.dragActive = false;
    });

    this.on(canvas, 'pointerdown', (e) => {
      const pe = e as PointerEvent;
      if (pe.pointerType === 'touch' && pe.clientX < window.innerWidth * 0.45 && pe.clientY > window.innerHeight * 0.5) {
        // Let the joystick element handle this.
        return;
      }
      this.dragActive = true;
      this.lastX = pe.clientX;
      this.lastY = pe.clientY;
      canvas.setPointerCapture?.(pe.pointerId);
    });
    this.on(window, 'pointermove', (e) => {
      const pe = e as PointerEvent;
      if (!this.dragActive) return;
      const dx = pe.clientX - this.lastX;
      const dy = pe.clientY - this.lastY;
      this.lastX = pe.clientX;
      this.lastY = pe.clientY;
      this.camYawDelta -= dx * 0.005;
      this.camPitchDelta -= dy * 0.004;
    });
    this.on(window, 'pointerup', () => {
      this.dragActive = false;
    });
    this.on(window, 'pointercancel', () => {
      this.dragActive = false;
    });
    this.on(
      canvas,
      'wheel',
      (e) => {
        const we = e as WheelEvent;
        we.preventDefault();
        this.zoomDelta += we.deltaY * 0.004;
      },
      { passive: false } as AddEventListenerOptions,
    );
  }

  zoomDelta = 0;

  private on(
    target: EventTarget,
    type: string,
    fn: (e: Event) => void,
    opts?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, fn as EventListener, opts);
    this.handlers.push({ target, type, fn: fn as EventListener });
  }

  /** Movement vector in camera-relative space. */
  read(): InputState {
    let forward = 0;
    let right = 0;
    const k = this.keys;
    if (k.has('w') || k.has('arrowup')) forward += 1;
    if (k.has('s') || k.has('arrowdown')) forward -= 1;
    if (k.has('d') || k.has('arrowright')) right += 1;
    if (k.has('a') || k.has('arrowleft')) right -= 1;
    if (this.joy.active) {
      forward += -this.joy.y;
      right += this.joy.x;
    }
    const len = Math.hypot(forward, right);
    if (len > 1) {
      forward /= len;
      right /= len;
    }
    return { forward, right, joyX: this.joy.x, joyY: this.joy.y, run: this.run };
  }

  consumeInteract(): boolean {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }

  consumeCamera(): { yaw: number; pitch: number; zoom: number } {
    const out = { yaw: this.camYawDelta, pitch: this.camPitchDelta, zoom: this.zoomDelta };
    this.camYawDelta = 0;
    this.camPitchDelta = 0;
    this.zoomDelta = 0;
    return out;
  }

  dispose() {
    for (const h of this.handlers) h.target.removeEventListener(h.type, h.fn);
    this.handlers = [];
  }
}

/** Third-person orbit camera that follows a target smoothly. */
export class FollowCamera {
  yaw = Math.PI;
  pitch = 0.42;
  distance = 13;
  private target = new THREE.Vector3();
  private smoothPos = new THREE.Vector3();
  private smoothLook = new THREE.Vector3();
  private first = true;

  constructor(public camera: THREE.PerspectiveCamera) {}

  applyOrbit(delta: { yaw: number; pitch: number; zoom: number }) {
    this.yaw += delta.yaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + delta.pitch, 0.06, 1.15);
    this.distance = THREE.MathUtils.clamp(this.distance + delta.zoom, 6, 30);
  }

  update(targetPos: THREE.Vector3, dt: number, headHeight = 1.4) {
    this.target.set(targetPos.x, targetPos.y + headHeight, targetPos.z);
    const cp = Math.cos(this.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * cp * this.distance,
      Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * cp * this.distance,
    );
    const desired = new THREE.Vector3().addVectors(this.target, offset);
    if (this.first) {
      this.smoothPos.copy(desired);
      this.smoothLook.copy(this.target);
      this.first = false;
    } else {
      this.smoothPos.lerp(desired, Math.min(1, dt * 7));
      this.smoothLook.lerp(this.target, Math.min(1, dt * 10));
    }
    this.camera.position.copy(this.smoothPos);
    this.camera.lookAt(this.smoothLook);
  }

  /** Unit vector pointing from the camera toward the target, flattened. */
  forwardFlat(): THREE.Vector3 {
    const v = new THREE.Vector3().subVectors(this.smoothLook, this.smoothPos);
    v.y = 0;
    if (v.lengthSq() < 1e-6) return new THREE.Vector3(0, 0, -1);
    return v.normalize();
  }

  snap() {
    this.first = true;
  }
}
