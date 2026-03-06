import { getStroke } from 'perfect-freehand';
import { Point, Stroke } from '../types';

const pathCache = new WeakMap<Stroke, Path2D>();

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke
) {
  if (stroke.points.length === 0) return;

  let path = pathCache.get(stroke);
  
  if (!path) {
    let outline = stroke.outline;
    if (!outline) {
      const options = {
        size: stroke.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      };
      outline = getStroke(stroke.points, options);
    }

    if (!outline || outline.length === 0) return;

    path = new Path2D();
    path.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      path.lineTo(outline[i][0], outline[i][1]);
    }
    path.closePath();
    pathCache.set(stroke, path);
  }

  if (stroke.color === 'rainbow' && stroke.points.length > 1) {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let gradient;
    if (dist < 1) {
      gradient = ctx.createLinearGradient(start[0], start[1], start[0] + 100, start[1] + 100);
    } else {
      gradient = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
    }
    
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.17, '#ff7f00');
    gradient.addColorStop(0.33, '#ffff00');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(0.67, '#0000ff');
    gradient.addColorStop(0.83, '#4b0082');
    gradient.addColorStop(1, '#9400d3');
    
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = stroke.color;
  }
  
  const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00'];

  if (stroke.tool === 'laser') {
    ctx.shadowBlur = 10;
    ctx.shadowColor = stroke.color;
    ctx.globalAlpha = (stroke.opacity ?? 1) * 0.8;
  } else if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    if (NEON_COLORS.includes(stroke.color)) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = stroke.color;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1.0;
  }

  ctx.fill(path);

  // Reset context
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
}

let starsCache: { x: number; y: number; size: number; i: number }[] | null = null;

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: { x: number; y: number; scale: number },
  type: string,
  pattern: string = 'none'
) {
  const time = performance.now();

  // Base color
  switch (type) {
    case 'dark': ctx.fillStyle = '#1e293b'; break;
    case 'pink': ctx.fillStyle = '#fdf2f8'; break;
    case 'yellow': ctx.fillStyle = '#fefce8'; break;
    case 'lightgray': ctx.fillStyle = '#e2e8f0'; break;
    case 'midgray': ctx.fillStyle = '#64748b'; break;
    case 'navy': {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
      gradient.addColorStop(0, '#1e40af'); // Blue 800
      gradient.addColorStop(0.4, '#172554'); // Blue 950
      gradient.addColorStop(1, '#020617'); // Slate 950
      ctx.fillStyle = gradient;
      break;
    }
    case 'green': {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
      gradient.addColorStop(0, '#22c55e'); // Green 500 (Bright center)
      gradient.addColorStop(0.3, '#15803d'); // Green 700
      gradient.addColorStop(1, '#022c22'); // Green 950 (Dark edges)
      ctx.fillStyle = gradient;
      break;
    }
    case 'black': ctx.fillStyle = '#000000'; break;
    case 'gray': ctx.fillStyle = '#111827'; break;
    case 'universe': ctx.fillStyle = '#050505'; break;
    case 'mosaic': {
      // Transition color over 20 seconds
      const hue = (time / 20000 * 360) % 360;
      ctx.fillStyle = `hsl(${hue}, 20%, 5%)`;
      break;
    }
    default: ctx.fillStyle = '#f8fafc';
  }
  ctx.fillRect(0, 0, width, height);
  
  if (type === 'universe') {
    if (!starsCache) {
      starsCache = [];
      const starCount = 200;
      const seed = 42;
      for (let i = 0; i < starCount; i++) {
        starsCache.push({
          x: (Math.sin(i * 123.456 + seed) * 0.5 + 0.5),
          y: (Math.cos(i * 654.321 + seed) * 0.5 + 0.5),
          size: (Math.sin(i * 999 + seed) * 0.5 + 0.5) * 1.5,
          i
        });
      }
    }

    starsCache.forEach(star => {
      const x = (star.x * width * 2 + transform.x) % width;
      const y = (star.y * height * 2 + transform.y) % height;
      const twinkle = (Math.sin(time / 1000 + star.i) * 0.5 + 0.5) * 0.5 + 0.2;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }


  if (type === 'mosaic') {
    const mosaicSize = 40 * transform.scale;
    const offsetX = ((transform.x % mosaicSize) + mosaicSize) % mosaicSize;
    const offsetY = ((transform.y % mosaicSize) + mosaicSize) % mosaicSize;
    
    for (let x = offsetX - mosaicSize; x < width + mosaicSize; x += mosaicSize) {
      for (let y = offsetY - mosaicSize; y < height + mosaicSize; y += mosaicSize) {
        const i = Math.floor((x - transform.x) / mosaicSize);
        const j = Math.floor((y - transform.y) / mosaicSize);
        const hueOffset = (Math.sin(i * 0.5 + j * 0.3) * 30);
        const hue = ((time / 20000 * 360) + hueOffset) % 360;
        ctx.fillStyle = `hsl(${hue}, 30%, 8%)`;
        ctx.fillRect(x + 1, y + 1, mosaicSize - 2, mosaicSize - 2);
      }
    }
  }

  if (pattern === 'none') {
    return;
  }

  // Draw pattern (grid, dots, lines)
  const baseGridSize = 20;
  const gridSize = baseGridSize * transform.scale;
  
  // Calculate offset to make it infinite and aligned with transform
  const offsetX = ((transform.x % gridSize) + gridSize) % gridSize;
  const offsetY = ((transform.y % gridSize) + gridSize) % gridSize;

  const isDark = ['dark', 'navy', 'black', 'gray', 'universe', 'mosaic', 'midgray'].includes(type);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;

  if (pattern === 'grid') {
    ctx.beginPath();
    for (let x = offsetX - gridSize; x < width + gridSize; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (pattern === 'lines') {
    ctx.beginPath();
    for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (pattern === 'dots') {
    for (let x = offsetX - gridSize; x < width + gridSize; x += gridSize) {
      for (let y = offsetY - gridSize; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5 * Math.min(transform.scale, 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
