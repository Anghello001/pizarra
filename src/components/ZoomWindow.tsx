import React, { useEffect, useRef, useState } from 'react';
import { Stroke, ToolType, Point } from '../types';
import { getStroke } from 'perfect-freehand';
import { drawStroke, drawBackground } from '../utils/canvas';
import { v4 as uuidv4 } from 'uuid';
import { Toolbar, ToolbarProps } from './Toolbar';
import { Eye, EyeOff, Target, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Crosshair, Home } from 'lucide-react';

interface ZoomWindowProps extends ToolbarProps {
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  laserStrokes: Stroke[];
  setLaserStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  currentStroke: Stroke | null;
  setCurrentStroke: React.Dispatch<React.SetStateAction<Stroke | null>>;
  lupaPos: { x: number; y: number; width: number; height: number; zoom: number };
  setLupaPos: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number; zoom: number }>>;
  lupaVisible: boolean;
  onFindLupa: () => void;
  onToggleLupaVisibility: () => void;
  onStrokeStart: () => void;
  onStrokeEnd: () => void;
  onResize?: (width: number, height: number) => void;
}

export const ZoomWindow = React.memo(function ZoomWindow(props: ZoomWindowProps) {
  const {
    strokes, setStrokes, laserStrokes, setLaserStrokes, currentStroke, setCurrentStroke, tool, color, size,
    lupaPos, setLupaPos, lupaVisible, onFindLupa, onToggleLupaVisibility, onStrokeStart, onStrokeEnd, onResize,
    // Toolbar props
    setTool, setColor, setSize, laserColor, setLaserColor, laserSize, setLaserSize,
    eraserSize, setEraserSize,
    background, setBackground, pattern, setPattern,
    onUndo, onRedo, onClear, onZoomIn, onZoomOut, onResetOrigin, onCenterLupa, onExit, canUndo, canRedo,
    isToolbarVisible, setIsToolbarVisible
  } = props;
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPan, setLastPan] = useState<{ x: number; y: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      setWindowSize(prev => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
      if (onResize) onResize(width, height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [onResize]);

  const [displayLupaPos, setDisplayLupaPos] = useState(lupaPos);

  // Smooth animation
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setDisplayLupaPos(prev => {
        const dx = lupaPos.x - prev.x;
        const dy = lupaPos.y - prev.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          if (prev.x === lupaPos.x && prev.y === lupaPos.y && prev.zoom === lupaPos.zoom && prev.width === lupaPos.width && prev.height === lupaPos.height) {
            return prev;
          }
          return { ...lupaPos };
        }
        return {
          ...prev,
          x: prev.x + dx * 0.15,
          y: prev.y + dy * 0.15,
          zoom: lupaPos.zoom,
          width: lupaPos.width,
          height: lupaPos.height
        };
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [lupaPos]);

  // Background Render Loop
  useEffect(() => {
    const canvas = backgroundCanvasRef.current;
    if (!canvas || windowSize.width === 0) return;
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== windowSize.width * dpr || canvas.height !== windowSize.height * dpr) {
      canvas.width = windowSize.width * dpr;
      canvas.height = windowSize.height * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, windowSize.width, windowSize.height);

    const targetWidth = displayLupaPos.width / displayLupaPos.zoom;
    const targetHeight = displayLupaPos.height / displayLupaPos.zoom;
    const scaleX = windowSize.width / targetWidth;
    const scaleY = windowSize.height / targetHeight;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (windowSize.width - targetWidth * scale) / 2;
    const offsetY = (windowSize.height - targetHeight * scale) / 2;

    const zoomTransform = {
      x: offsetX + scale * (-displayLupaPos.x + (targetWidth/2)),
      y: offsetY + scale * (-displayLupaPos.y + (targetHeight/2)),
      scale: scale
    };
    drawBackground(ctx, windowSize.width, windowSize.height, zoomTransform, background, pattern);
  }, [displayLupaPos, windowSize, background, pattern]);

  // Render loop (Strokes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || windowSize.width === 0) return;
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== windowSize.width * dpr || canvas.height !== windowSize.height * dpr) {
        canvas.width = windowSize.width * dpr;
        canvas.height = windowSize.height * dpr;
        ctx.scale(dpr, dpr);
      } else {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Calculate scale to fit (lupaPos.width / lupaPos.zoom) into windowSize
      const targetWidth = displayLupaPos.width / displayLupaPos.zoom;
      const targetHeight = displayLupaPos.height / displayLupaPos.zoom;
      
      const scaleX = windowSize.width / targetWidth;
      const scaleY = windowSize.height / targetHeight;
      const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
      
      // Center it
      const offsetX = (windowSize.width - targetWidth * scale) / 2;
      const offsetY = (windowSize.height - targetHeight * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      
      // Translate to the center of the displayLupaPos
      ctx.translate(-displayLupaPos.x + (targetWidth/2), -displayLupaPos.y + (targetHeight/2));

      // Draw strokes
      strokes.forEach(s => drawStroke(ctx, s));
      
      // Draw laser strokes
      const now = Date.now();
      laserStrokes.forEach(s => {
        const age = now - (s.createdAt || 0);
        const maxAge = 1500;
        if (age < maxAge) {
          const opacity = Math.max(0, 1 - (age / maxAge));
          drawStroke(ctx, { ...s, opacity });
        }
      });
      
      if (currentStroke) {
        drawStroke(ctx, currentStroke);
      }

      // Draw auto-advance zone
      ctx.restore();
      const advanceZoneWidth = 40; // Reduced from 100
      ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
      ctx.fillRect(windowSize.width - advanceZoneWidth, 0, advanceZoneWidth, windowSize.height);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.beginPath();
      ctx.moveTo(windowSize.width - advanceZoneWidth, 0);
      ctx.lineTo(windowSize.width - advanceZoneWidth, windowSize.height);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [strokes, currentStroke, laserStrokes, displayLupaPos, windowSize]);

  // Pinch to zoom for magnifier
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialPinchDistance: number | null = null;
    let initialZoom: number = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && tool === 'pan') {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialZoom = lupaPos.zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance && tool === 'pan') {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        
        const scaleRatio = distance / initialPinchDistance;
        const newZoom = Math.min(Math.max(1, initialZoom * scaleRatio), 8);

        setLupaPos(prev => ({
          ...prev,
          zoom: newZoom
        }));
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [lupaPos.zoom, setLupaPos, tool]);

  const getPointerPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const targetWidth = displayLupaPos.width / displayLupaPos.zoom;
    const targetHeight = displayLupaPos.height / displayLupaPos.zoom;
    
    const scaleX = windowSize.width / targetWidth;
    const scaleY = windowSize.height / targetHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (windowSize.width - targetWidth * scale) / 2;
    const offsetY = (windowSize.height - targetHeight * scale) / 2;

    return {
      x: (x - offsetX) / scale + displayLupaPos.x - (targetWidth/2),
      y: (y - offsetY) / scale + displayLupaPos.y - (targetHeight/2),
      pressure: e.pressure || 0.5,
      rawX: x
    };
  };

  const activePointers = useRef(new Set<number>());

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    activePointers.current.add(e.pointerId);
    if (activePointers.current.size > 1) {
      setIsDrawing(false);
      setCurrentStroke(null);
      return;
    }

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPan({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getPointerPos(e);
    setIsDrawing(true);
    onStrokeStart();
    const points: Point[] = [[pos.x, pos.y, pos.pressure]];
    const strokeSize = tool === 'laser' ? laserSize : (tool === 'eraser' ? eraserSize : size);
    const options = {
      size: strokeSize,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    };
    const outline = getStroke(points, options);
    setCurrentStroke({
      id: uuidv4(),
      points,
      color: tool === 'laser' ? laserColor : color,
      size: strokeSize,
      tool,
      outline,
      createdAt: Date.now()
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    if (activePointers.current.size > 1) return;

    if (isPanning && lastPan) {
      const dx = e.clientX - lastPan.x;
      const dy = e.clientY - lastPan.y;

      // Calculate how much to move lupaPos based on the current zoom and scale
      const targetWidth = displayLupaPos.width / displayLupaPos.zoom;
      const targetHeight = displayLupaPos.height / displayLupaPos.zoom;
      const scaleX = windowSize.width / targetWidth;
      const scaleY = windowSize.height / targetHeight;
      const scale = Math.min(scaleX, scaleY);

      setLupaPos(prev => ({
        ...prev,
        x: prev.x - dx / scale,
        y: prev.y - dy / scale
      }));

      setLastPan({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing || !currentStroke) return;

    const pos = getPointerPos(e);
    
    setCurrentStroke(prev => {
      if (!prev) return prev;
      const newPoints = [...prev.points, [pos.x, pos.y, pos.pressure] as Point];
      const options = {
        size: prev.size,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      };
      const outline = getStroke(newPoints, options);
      return {
        ...prev,
        points: newPoints,
        outline
      };
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    activePointers.current.delete(e.pointerId);

    if (isPanning) {
      setIsPanning(false);
      setLastPan(null);
      return;
    }

    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);
    if (currentStroke.tool === 'laser') {
      setLaserStrokes(prev => [...prev, { ...currentStroke, createdAt: Date.now() }]);
    } else {
      setStrokes(prev => [...prev, currentStroke]);
      onStrokeEnd();
    }
    setCurrentStroke(null);

    // Auto-advance if the last point was in the advance zone
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > windowSize.width - 40) {
      const targetWidth = lupaPos.width / lupaPos.zoom;
      setLupaPos(prev => ({
        ...prev,
        x: prev.x + targetWidth * 0.8 // Advance by 80% of the visible width
      }));
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-white border-t-4 landscape:border-t-0 landscape:border-l-4 border-indigo-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] landscape:shadow-[-10px_0_40px_rgba(0,0,0,0.1)] touch-none flex flex-col"
      style={{ willChange: 'transform' }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[2, 3, 4].map(z => (
            <button 
              key={z} 
              onClick={() => setLupaPos(prev => ({ ...prev, zoom: z }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${lupaPos.zoom === z ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-300'}`}
            >
              x{z}
            </button>
          ))}
          <div className="flex gap-1 border-l border-slate-300 pl-2">
            <button onClick={() => setLupaPos(prev => ({ ...prev, x: prev.x - (prev.width/prev.zoom) * 0.8 }))} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /></button>
            <button onClick={() => setLupaPos(prev => ({ ...prev, x: prev.x + (prev.width/prev.zoom) * 0.8 }))} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"><ChevronRight size={16} /></button>
            <button onClick={() => setLupaPos(prev => ({ ...prev, y: prev.y - (prev.height/prev.zoom) * 0.8 }))} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"><ChevronUp size={16} /></button>
            <button onClick={() => setLupaPos(prev => ({ ...prev, y: prev.y + (prev.height/prev.zoom) * 0.8 }))} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"><ChevronDown size={16} /></button>
          </div>
          <div className="flex gap-1 border-l border-slate-300 pl-2">
            <button 
              onClick={onResetOrigin} 
              title="Ir al Origen"
              className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
            >
              <Home size={16} />
            </button>
            <button 
              onClick={onCenterLupa} 
              title="Traer Lupa Aquí"
              className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
            >
              <Crosshair size={16} />
            </button>
            <button 
              onClick={onFindLupa} 
              title="Centrar en Lupa"
              className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90"
            >
              <Target size={16} />
            </button>
            <button 
              onClick={onToggleLupaVisibility} 
              title={lupaVisible ? "Ocultar Rectángulo" : "Mostrar Rectángulo"}
              className={`p-2 border rounded-lg transition-all active:scale-90 ${lupaVisible ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-indigo-500 border-indigo-500 text-white shadow-sm'}`}
            >
              {lupaVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
      </div>
      <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={backgroundCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair relative z-10"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
});
