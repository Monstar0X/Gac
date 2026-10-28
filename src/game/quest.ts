import * as THREE from 'three';
import type { CharacterSpec, Waifu } from '../data/types';
import { buildWorld, WORLD_RADIUS, type WorldResult } from '../engine/world';
import { buildCharacter, animateRig, type CharacterRig } from '../engine/character';
import { FollowCamera, InputController } from '../engine/input';
import type { StageContent } from '../engine/stage';

export interface QuestSceneEvents {
  /** A relic was picked up, or '__complete__' when the waifu is recruited. */
  onRelicPickup: (relicId: string) => void;
  onNearPrime: (distance: number) => void;
  onPromptChange: (prompt: string | null) => void;
  onToast: (text: string, kind?: 'info' | 'relic' | 'good' | 'bad') => void;
  /** Compass bearing in radians from the player toward the current objective. */
  onCompass: (bearing: number | null, label: string) => void;
}

const PLAYER_SPEC: CharacterSpec = {
  skin: 0xf0c9a0,
  hair: 0x4a3a2a,
  hairStyle: 'short',
  eye: 0x4a6a9a,
  top: 0x3a4a6a,
  bottom: 0x2a2a3a,
  accent: 0xd8a83a,
  accessory: 'none',
  accessoryColor: 0xd8a83a,
  weapon: 'none',
  build: 1.0,
};

/**
 * The 3D quest world: player avatar, camera, relic hunting and the prime
 * location interaction. Implements `StageContent` so the shared Stage renders
 * it without spawning a second WebGL context.
 */
export class QuestScene implements StageContent {
  readonly world: WorldResult;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private follow: FollowCamera;
  private input: InputController;
  private playerRig: CharacterRig;
  private playerPos = new THREE.Vector3(0, 0, 8);
  private playerYaw = Math.PI;
  private velocity = new THREE.Vector3();
  private elapsed = 0;
  private lastPrompt: string | null = null;
  private disposed = false;
  private primeTalked = false;
  private interactCooldown = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private waifu: Waifu,
    collectedRelicIds: string[],
    private events: QuestSceneEvents,
  ) {
    this.world = buildWorld(waifu, collectedRelicIds);
    this.scene = this.world.scene;
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 420);
    this.follow = new FollowCamera(this.camera);

    this.playerRig = buildCharacter(PLAYER_SPEC);
    this.playerRig.root.position.copy(this.playerPos);
    this.scene.add(this.playerRig.root);

    this.input = new InputController(canvas);
    this.follow.update(this.playerPos, 1, 1.5);
    this.follow.snap();
  }

  onResize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(_t: number, dt: number) {
    if (this.disposed) return;
    this.elapsed += dt;
    this.step(dt);
  }

  private step(dt: number) {
    this.interactCooldown = Math.max(0, this.interactCooldown - dt);
    this.follow.applyOrbit(this.input.consumeCamera());

    const state = this.input.read();
    const fwd = this.follow.forwardFlat();
    const rightV = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3()
      .addScaledVector(fwd, state.forward)
      .addScaledVector(rightV, state.right);
    const speed = state.run ? 11.5 : 6.4;
    if (move.lengthSq() > 0.0001) {
      move.normalize();
      this.velocity.lerp(move.multiplyScalar(speed), Math.min(1, dt * 12));
    } else {
      this.velocity.lerp(new THREE.Vector3(), Math.min(1, dt * 14));
    }

    this.playerPos.addScaledVector(this.velocity, dt);
    const r = Math.hypot(this.playerPos.x, this.playerPos.z);
    if (r > WORLD_RADIUS - 2) {
      const s = (WORLD_RADIUS - 2) / r;
      this.playerPos.x *= s;
      this.playerPos.z *= s;
    }
    this.playerRig.root.position.copy(this.playerPos);

    const speedNorm = Math.min(1, this.velocity.length() / 7);
    if (this.velocity.lengthSq() > 0.02) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      this.playerYaw = lerpAngle(this.playerYaw, targetYaw, Math.min(1, dt * 12));
    }
    this.playerRig.root.rotation.y = this.playerYaw;
    animateRig(this.playerRig, this.elapsed, speedNorm);

    this.follow.update(this.playerPos, dt, 1.5);
    this.world.update(this.elapsed, dt, this.playerPos);

    // ── relic pickup ──
    for (const relic of this.world.relics) {
      if (relic.collected) continue;
      if (relic.position.distanceTo(this.playerPos) < 3.4) {
        relic.collected = true;
        relic.group.visible = false;
        this.events.onRelicPickup(relic.relicId);
      }
    }

    // ── prime location ──
    const primeDist = this.world.primePosition.distanceTo(this.playerPos);
    this.events.onNearPrime(primeDist);

    const prompt =
      primeDist < this.world.primeRadius
        ? this.primeTalked
          ? 'Press E to talk again'
          : `Press E to speak with ${this.waifu.name}`
        : null;
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      this.events.onPromptChange(prompt);
    }

    // ── compass: point at the nearest relic, then at the waifu ──
    let target: THREE.Vector3 | null = null;
    let label = '';
    let best = Infinity;
    for (const relic of this.world.relics) {
      if (relic.collected) continue;
      const d = relic.position.distanceTo(this.playerPos);
      if (d < best) {
        best = d;
        target = relic.position;
        label = this.relicName(relic.relicId);
      }
    }
    if (!target) {
      target = this.world.primePosition;
      label = this.waifu.name;
    }
    const bearing = Math.atan2(
      target.x - this.playerPos.x,
      target.z - this.playerPos.z,
    );
    this.events.onCompass(bearing, label);

    if (this.input.consumeInteract() && primeDist < this.world.primeRadius && this.interactCooldown <= 0) {
      this.interactCooldown = 0.6;
      this.onPrimeInteract();
    }
  }

  private onPrimeInteract() {
    const missing = this.world.relics.filter((r) => !r.collected);
    if (missing.length > 0 && !this.primeTalked) {
      const names = missing.map((m) => this.relicName(m.relicId)).join(', ');
      this.events.onToast(`${this.waifu.name}: "You are still missing ${names}."`, 'info');
      this.lastPrompt = null;
      return;
    }
    if (!this.primeTalked) {
      this.primeTalked = true;
      this.events.onToast(`${this.waifu.name}: "${this.waifu.quest?.primeLine ?? '...'}"`, 'good');
      window.setTimeout(() => this.events.onRelicPickup('__complete__'), 1000);
    } else {
      const line =
        this.waifu.dialogue[Math.floor(Math.random() * this.waifu.dialogue.length)] ?? '...';
      this.events.onToast(`${this.waifu.name}: "${line}"`, 'info');
    }
  }

  private relicName(relicId: string): string {
    return this.waifu.quest?.relics.find((r) => r.id === relicId)?.name ?? relicId;
  }

  /** Teleport in front of the waifu at the prime location. */
  teleportToPrime() {
    const dir = new THREE.Vector3().subVectors(this.playerPos, this.world.primePosition);
    dir.y = 0;
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize();
    this.playerPos.copy(this.world.primePosition).addScaledVector(dir, 5.5);
    this.follow.snap();
  }

  /** Teleport in front of the nearest uncollected relic. */
  teleportToNearestRelic(): boolean {
    let best: { pos: THREE.Vector3; d: number } | null = null;
    for (const r of this.world.relics) {
      if (r.collected) continue;
      const d = r.position.distanceTo(this.playerPos);
      if (!best || d < best.d) best = { pos: r.position, d };
    }
    if (!best) return false;
    const dir = new THREE.Vector3().subVectors(this.playerPos, best.pos);
    dir.y = 0;
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
    dir.normalize();
    // Land inside the pickup radius so the warp actually collects the relic.
    this.playerPos.copy(best.pos).addScaledVector(dir, 2.2);
    this.follow.snap();
    return true;
  }

  /** Trigger the prime interaction from a UI button. */
  interactPrime() {
    if (this.world.primePosition.distanceTo(this.playerPos) < this.world.primeRadius) {
      this.onPrimeInteract();
    }
  }

  /** Camera yaw in radians, for the compass needle. */
  cameraYaw(): number {
    return this.follow.yaw;
  }

  /** Feed the on-screen joystick from the UI layer. */
  setJoystick(x: number, y: number, active: boolean) {
    this.input.joy.x = x;
    this.input.joy.y = y;
    this.input.joy.active = active;
  }

  setRun(v: boolean) {
    this.input.run = v;
  }

  get playerPosition(): THREE.Vector3 {
    return this.playerPos;
  }

  dispose() {
    this.disposed = true;
    this.input.dispose();
    this.world.dispose();
    this.playerRig.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material instanceof THREE.Material) m.material.dispose();
    });
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
