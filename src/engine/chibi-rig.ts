import type { CharacterSpec, HairStyle } from '../data/types';
import type { HeroHairStyle } from '../data/player';
import type { OutfitDef } from '../data/outfits';
import type { Bitmap, Ramp } from './pixelkit';

/**
 * Shared geometry for the chibi sprite. The proportions follow the reference:
 * a head roughly as wide as it is tall and over half the figure's height, huge
 * eyes set low on the face, and a body small enough to tuck under the chin.
 */

/** Sprite canvas, in sprite pixels. Includes a margin so outlines never clip. */
export const CW = 48;
export const CH = 58;

export const HEAD = { cx: 24, cy: 21.5, rx: 16, ry: 13.5, p: 2.6 };

export type AnyHairStyle = HairStyle | HeroHairStyle;
export type Expression = 'neutral' | 'smile' | 'blink' | 'open' | 'sad';
export type Pose = 'stand' | 'sit';
export type HeldProp = 'none' | 'mug' | 'book' | 'handheld';

/** A character spec the chibi renderer understands; a superset of the game's. */
export interface ChibiSpec extends Omit<CharacterSpec, 'hairStyle'> {
  hairStyle: AnyHairStyle;
  /** Trousers instead of a skirt, squarer shoulders. */
  male?: boolean;
  /** Hero-only fallbacks used by the "custom fit" outfit. */
  headgear?: string;
  back?: string;
}

export interface Rig {
  b: Bitmap;
  spec: ChibiSpec;
  male: boolean;
  pose: Pose;
  /** `hold` raises both hands in front of the chest for props. */
  arms: 'down' | 'hold';
  outfit: OutfitDef | null;
  skin: Ramp;
  hair: Ramp;
  top: Ramp;
  bottom: Ramp;
  accent: Ramp;
}

/** Superellipse membership test for the head, optionally grown by `grow` px. */
export function inHead(x: number, y: number, grow = 0): boolean {
  const dx = Math.abs((x + 0.5 - HEAD.cx) / (HEAD.rx + grow));
  const dy = Math.abs((y + 0.5 - HEAD.cy) / (HEAD.ry + grow));
  return Math.pow(dx, HEAD.p) + Math.pow(dy, HEAD.p) <= 1;
}

export function torsoBox(male: boolean) {
  return male ? { x: 18, y: 34, w: 12, h: 10 } : { x: 19, y: 34, w: 10, h: 10 };
}
