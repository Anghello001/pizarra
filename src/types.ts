export type Point = [number, number, number]; // x, y, pressure

export type ToolType = 'pen' | 'eraser' | 'laser' | 'pan';

export type PatternType = 'none' | 'grid' | 'dots' | 'lines';

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  tool: ToolType;
  opacity?: number;
  outline?: number[][]; // Cached outline for performance
  createdAt?: number;
}

export interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

export type BackgroundType = 'blank' | 'dark' | 'pink' | 'yellow' | 'navy' | 'black' | 'gray' | 'universe' | 'mosaic' | 'lightgray' | 'midgray' | 'green';

export interface CanvasDocument {
  id: string;
  name: string;
  lastModified: number;
  strokes: Stroke[];
  background: BackgroundType;
  pattern: PatternType;
  transform: CanvasTransform;
  lupaPos: { x: number; y: number; width: number; height: number; zoom: number };
}
