import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stroke, CanvasTransform, Point, ToolType, BackgroundType, PatternType } from '../types';
import { getStroke } from 'perfect-freehand';
import { drawStroke, drawBackground } from '../utils/canvas';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface CanvasBoardProps {
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  laserStrokes: Stroke[];
  setLaserStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  currentStroke: Stroke | null;
  setCurrentStroke: React.Dispatch<React.SetStateAction<Stroke | null>>;
  tool: ToolType;
  color: string;
  size: number;
  laserColor: string;
  laserSize: number;
  eraserSize: number;
  background: BackgroundType;
  pattern: PatternType;
  lupaVisible: boolean;
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  onStrokeStart: () => void;
  onStrokeEnd: () => void;
  lupaActive: boolean;
  lupaPos: { x: number; y: number; width: number; height: number; zoom: number };
  setLupaPos: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number; zoom: number }>>;
  onResize?: (width: number, height: number) => void;
}

export const CanvasBoard = React.memo(function CanvasBoard({
  strokes, setStrokes, laserStrokes, setLaserStrokes, currentStroke, setCurrentStroke, tool, color, size, laserColor, laserSize, eraserSize, background, pattern,
  lupaVisible, transform, setTransform, onStrokeStart, onStrokeEnd,
  lupaActive, lupaPos, setLupaPos, onResize
}: CanvasBoardProps) {
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPan, setLastPan] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLupa, setIsDraggingLupa] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [lupaBorderOpacity, setLupaBorderOpacity] = useState(0);
  const fadeTimeout = useRef<NodeJS.Timeout>();

  // Function to show border and set fade out
  const showLupaBorder = () => {
    setLupaBorderOpacity(1);
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    fadeTimeout.current = setTimeout(() => {
      setLupaBorderOpacity(0);
    }, 700);
  };

  // Trigger on lupaPos change
  useEffect(() => {
    showLupaBorder();
  }, [lupaPos.x, lupaPos.y, lupaPos.zoom]);

  // Handle canvas resizing with ResizeObserver for reliability
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setWindowSize(prev => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
        if (onResize) onResize(width, height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
    drawBackground(ctx, windowSize.width, windowSize.height, transform, background, pattern);
  }, [transform, background, pattern, windowSize]);

  // Static Render Loop (Completed Strokes)
  useEffect(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas || windowSize.width === 0) return;
    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== windowSize.width * dpr || canvas.height !== windowSize.height * dpr) {
      canvas.width = windowSize.width * dpr;
      canvas.height = windowSize.height * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    strokes.forEach(s => drawStroke(ctx, s));
    
    if (currentStroke && currentStroke.tool === 'eraser') {
      drawStroke(ctx, currentStroke);
    }

    ctx.restore();
  }, [strokes, transform, currentStroke, windowSize]);

  // Active Render Loop (Laser + Current Stroke)
  useEffect(() => {
    const canvas = activeCanvasRef.current;
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

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

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

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentStroke, laserStrokes, transform, windowSize]);

  // Cleanup old laser strokes
  useEffect(() => {
    if (laserStrokes.length === 0) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const maxAge = 1500;
      setLaserStrokes(prev => {
        const filtered = prev.filter(s => (now - (s.createdAt || 0)) < maxAge);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [laserStrokes, setLaserStrokes]);

  const getPointerPos = (e: React.PointerEvent) => {
    const rect = activeCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale,
      pressure: e.pressure || 0.5
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

    const pos = getPointerPos(e);

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPan({ x: e.clientX, y: e.clientY });
      return;
    }

    if (lupaActive && lupaVisible) {
      // Check if clicking inside lupa box to move it
      // Visible area in canvas units
      const visibleWidth = lupaPos.width / lupaPos.zoom;
      const visibleHeight = lupaPos.height / lupaPos.zoom;
      
      if (pos.x >= lupaPos.x - visibleWidth/2 && pos.x <= lupaPos.x + visibleWidth/2 &&
          pos.y >= lupaPos.y - visibleHeight/2 && pos.y <= lupaPos.y + visibleHeight/2) {
        setIsDraggingLupa(true);
        return;
      }
    }

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
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastPan({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getPointerPos(e);

    if (isDraggingLupa) {
      setLupaPos(prev => ({
        ...prev,
        x: pos.x,
        y: pos.y
      }));
      return;
    }

    if (isDrawing && currentStroke) {
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
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    activePointers.current.delete(e.pointerId);
    
    setIsPanning(false);
    setLastPan(null);
    setIsDraggingLupa(false);

    if (isDrawing && currentStroke) {
      setIsDrawing(false);
      if (currentStroke.tool === 'laser') {
        setLaserStrokes(prev => [...prev, { ...currentStroke, createdAt: Date.now() }]);
      } else {
        setStrokes(prev => [...prev, currentStroke]);
        onStrokeEnd();
      }
      setCurrentStroke(null);
    }
  };

  // Pinch to zoom and two-finger pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialPinchDistance: number | null = null;
    let initialScale: number = 1;
    let initialPan: { x: number; y: number } | null = null;
    let initialTransform: CanvasTransform | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && tool === 'pan') {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialScale = transform.scale;
        
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        initialPan = { x: cx, y: cy };
        initialTransform = { ...transform };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance && initialPan && initialTransform && tool === 'pan') {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const scaleRatio = distance / initialPinchDistance;
        const newScale = Math.min(Math.max(0.1, initialScale * scaleRatio), 10);

        const rect = container.getBoundingClientRect();
        const pointerX = initialPan.x - rect.left;
        const pointerY = initialPan.y - rect.top;

        const targetX = (pointerX - initialTransform.x) / initialTransform.scale;
        const targetY = (pointerY - initialTransform.y) / initialTransform.scale;

        const panX = cx - initialPan.x;
        const panY = cy - initialPan.y;

        setTransform({
          x: pointerX - targetX * newScale + panX,
          y: pointerY - targetY * newScale + panY,
          scale: newScale
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
        initialPan = null;
        initialTransform = null;
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
  }, [transform, setTransform, tool]);

  // Wheel event for desktop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Zoom
        const zoomSensitivity = 0.005;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, transform.scale * Math.exp(delta)), 10);
        
        // Zoom around pointer
        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        
        const targetX = (pointerX - transform.x) / transform.scale;
        const targetY = (pointerY - transform.y) / transform.scale;
        
        setTransform({
          x: pointerX - targetX * newScale,
          y: pointerY - targetY * newScale,
          scale: newScale
        });
      } else {
        // Pan
        setTransform(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [transform, setTransform]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden touch-none relative"
      style={{ willChange: 'transform' }}
    >
      {/* Background Layer */}
      <canvas
        ref={backgroundCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Static Layer (Completed Strokes) */}
      <canvas
        ref={staticCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Active Layer (Current Stroke + Laser) */}
      <canvas
        ref={activeCanvasRef}
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Lupa Reference Box (Animated) */}
      <AnimatePresence>
        {lupaActive && lupaVisible && lupaBorderOpacity > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: lupaBorderOpacity * 0.5,
              scale: [1, 1.02, 1],
              x: (lupaPos.x - (lupaPos.width / lupaPos.zoom) / 2) * transform.scale + transform.x,
              y: (lupaPos.y - (lupaPos.height / lupaPos.zoom) / 2) * transform.scale + transform.y,
              width: (lupaPos.width / lupaPos.zoom) * transform.scale,
              height: (lupaPos.height / lupaPos.zoom) * transform.scale,
            }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ 
              x: { type: 'spring', damping: 25, stiffness: 200 },
              y: { type: 'spring', damping: 25, stiffness: 200 },
              opacity: { duration: 0.7 },
              scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
            }}
            className="absolute top-0 left-0 pointer-events-none border-2 border-blue-500 rounded-sm shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10"
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <div className="absolute inset-0 bg-blue-500/5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
