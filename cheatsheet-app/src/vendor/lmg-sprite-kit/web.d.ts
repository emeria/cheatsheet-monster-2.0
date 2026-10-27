// Types for web.js (lmg-sprite-kit v1). Copy next to it.
export interface SpriteSheet { layer: string; id: string; file: string; ramp?: string }
export interface SpriteAnimation { start: number; frames: number; frameRate: number; loop?: boolean; events?: Record<string, number> }
export interface SpriteManifest {
  kit: string;
  frame: { width: number; height: number };
  columns: number;
  directions: string[];
  animations: Record<string, SpriteAnimation>;
  anchor?: { x: number; y: number };
  layers: string[];
  ramps: Record<string, string[]>;
  sheets: SpriteSheet[];
}
/** A piece a character wears; `ramp` recolors it (a colorway). */
export interface SpritePick { layer: string; id: string; ramp?: string }

export function loadManifest(url: string): Promise<SpriteManifest>;
export function loadSheets(baseUrl: string, manifest: SpriteManifest, picks?: SpritePick[]): Promise<Map<string, HTMLImageElement>>;
export function recolorPixels<T extends Uint8ClampedArray | Uint8Array>(data: T, from: string[], to: string[]): T;
export function bake(manifest: SpriteManifest, images: Map<string, CanvasImageSource>, picks: SpritePick[]): HTMLCanvasElement;
export function frameIndex(manifest: SpriteManifest, direction: string, animation: string, frame: number): number;
export function eventFrame(manifest: SpriteManifest, animation: string, event: string): number;
export function originOf(manifest: SpriteManifest): [number, number];
export function frameAt(animation: SpriteAnimation, ms: number): { frame: number; done: boolean };

export interface PlayerOptions {
  scale?: number;
  direction?: string;
  animation?: string;
  reducedMotion?: 'auto' | boolean;
  stillFrame?: number;
}
export interface PlayOptions {
  direction?: string;
  stillFrame?: number;
  onEnd?: () => void;
  onEvent?: (event: string, frame: number) => void;
}
export interface SpritePlayer {
  play(animation: string, options?: PlayOptions): void;
  setLook(picks: SpritePick[]): void;
  setReducedMotion(value: 'auto' | boolean): void;
  readonly reduced: boolean;
  destroy(): void;
}
export function createPlayer(canvas: HTMLCanvasElement, manifest: SpriteManifest, images: Map<string, CanvasImageSource>, picks: SpritePick[], options?: PlayerOptions): SpritePlayer;
