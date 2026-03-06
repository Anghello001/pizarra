import React from 'react';
import { BackgroundType, ToolType, PatternType } from '../types';
import { Pen, Eraser, MousePointer2, ZoomIn, Undo, Redo, Trash2, Grid, Circle, Minus, Square, Palette, Sparkles, LayoutGrid, Home, Crosshair, LogOut } from 'lucide-react';

export interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  laserColor: string;
  setLaserColor: (color: string) => void;
  laserSize: number;
  setLaserSize: (size: number) => void;
  eraserSize: number;
  setEraserSize: (size: number) => void;
  background: BackgroundType;
  setBackground: (bg: BackgroundType) => void;
  pattern: PatternType;
  setPattern: (pattern: PatternType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetOrigin: () => void;
  onCenterLupa: () => void;
  onExit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isToolbarVisible: boolean;
  setIsToolbarVisible: (visible: boolean) => void;
  className?: string;
}

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#39ff14', '#ff00ff', '#00ffff', '#ffff00'];
const LASER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#39ff14', '#ff00ff', '#00ffff', '#ffff00'];
const SIZES = [2, 4, 8, 16];

export const Toolbar = React.memo(function Toolbar({
  tool, setTool, color, setColor, size, setSize, laserColor, setLaserColor, laserSize, setLaserSize,
  eraserSize, setEraserSize,
  background, setBackground, pattern, setPattern, onUndo, onRedo, onClear, onZoomIn, onZoomOut, onResetOrigin, onCenterLupa, onExit, canUndo, canRedo, className,
  isToolbarVisible, setIsToolbarVisible
}: ToolbarProps) {
  const [showPenMenu, setShowPenMenu] = React.useState(false);
  const [showLaserMenu, setShowLaserMenu] = React.useState(false);
  const [showEraserMenu, setShowEraserMenu] = React.useState(false);
  const [showBgs, setShowBgs] = React.useState(false);

  const closeAllMenus = () => {
    setShowPenMenu(false);
    setShowLaserMenu(false);
    setShowEraserMenu(false);
    setShowBgs(false);
  };

  const handleToolClick = (targetTool: ToolType) => {
    if (tool === targetTool) {
      // Toggle menu for active tool
      if (targetTool === 'pen') setShowPenMenu(!showPenMenu);
      if (targetTool === 'eraser') setShowEraserMenu(!showEraserMenu);
      if (targetTool === 'laser') setShowLaserMenu(!showLaserMenu);
      // Close others
      if (targetTool !== 'pen') setShowPenMenu(false);
      if (targetTool !== 'eraser') setShowEraserMenu(false);
      if (targetTool !== 'laser') setShowLaserMenu(false);
      setShowBgs(false);
    } else {
      // Select new tool and close all menus
      setTool(targetTool);
      closeAllMenus();
    }
  };

  return (
    <div className={`relative w-full landscape:w-auto transition-all duration-300 ${className}`}>
      {/* Toggle Tab */}
      <button 
        onClick={() => setIsToolbarVisible(!isToolbarVisible)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 border-b-0 px-6 py-1 rounded-t-xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)] text-slate-500 hover:text-indigo-600 transition-all z-50 flex items-center gap-2 active:scale-95"
      >
        <div className={`w-2 h-2 rounded-full ${isToolbarVisible ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`} />
        <span className="text-[9px] uppercase tracking-widest font-bold">
          {isToolbarVisible ? 'Ocultar' : 'Herramientas'}
        </span>
      </button>

      <div className={`w-full bg-white/95 backdrop-blur-md border-t landscape:border landscape:rounded-2xl border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 overflow-hidden ${isToolbarVisible ? 'h-auto opacity-100' : 'h-0 opacity-0 pointer-events-none'}`}>
        {/* Main Toolbar Row */}
        <div className="p-1.5 flex items-center gap-1.5 overflow-x-auto justify-start no-scrollbar landscape:justify-center">
          <div className="flex items-center gap-1 shrink-0">
            <ToolButton 
              icon={<Pen size={18} />} 
              active={tool === 'pen'} 
              onClick={() => handleToolClick('pen')} 
            />
            
            <div className="flex flex-col gap-0.5">
               <button onClick={onZoomIn} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-90 transition-transform"><ZoomIn size={12} /></button>
               <button onClick={onZoomOut} className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-90 transition-transform"><Minus size={12} /></button>
            </div>

            <ToolButton 
              icon={<Eraser size={18} />} 
              active={tool === 'eraser'} 
              onClick={() => handleToolClick('eraser')} 
            />

            <ToolButton 
              icon={<MousePointer2 size={18} />} 
              active={tool === 'pan'} 
              onClick={() => handleToolClick('pan')} 
            />
            
            <ToolButton 
              icon={<div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: laserColor }} />} 
              active={tool === 'laser'} 
              onClick={() => handleToolClick('laser')} 
            />
          </div>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          <div className="flex items-center gap-1 shrink-0">
            <ToolButton 
              icon={<LogOut size={18} />} 
              active={false} 
              onClick={onExit} 
              title="Salir al Dashboard"
            />
          </div>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          <div className="relative shrink-0">
            <button 
              onClick={() => {
                const newState = !showBgs;
                closeAllMenus();
                setShowBgs(newState);
              }}
              className={`p-2 rounded-lg transition-all active:scale-95 ${showBgs ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Grid size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200 mx-0.5 shrink-0" />

          <div className="flex items-center gap-0.5 text-slate-600 shrink-0 pr-2">
            <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><Undo size={18} /></button>
            <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90"><Redo size={18} /></button>
            <button onClick={onClear} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-all active:scale-90"><Trash2 size={18} /></button>
          </div>
        </div>

        {/* Integrated Menu Row */}
        {(showPenMenu || showEraserMenu || showLaserMenu || showBgs) && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200 max-h-[40vh] overflow-y-auto">
            {showPenMenu && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-wrap landscape:max-w-[400px] landscape:justify-center">
                  <button
                    className={`w-7 h-7 rounded-full border-2 shrink-0 transition-transform active:scale-90 ${color === 'rainbow' ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ background: 'conic-gradient(from 0deg, red, orange, yellow, green, blue, indigo, violet, red)' }}
                    onClick={() => setColor('rainbow')}
                    title="Arcoíris"
                  />
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full border-2 shrink-0 transition-transform active:scale-90 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <label className="w-7 h-7 rounded-full border-2 border-transparent shrink-0 cursor-pointer active:scale-90 transition-transform relative overflow-hidden">
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="w-full h-full rounded-full bg-[conic-gradient(from_90deg,red,yellow,lime,aqua,blue,magenta,red)]" />
                  </label>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white active:scale-90 ${size === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      onClick={() => setSize(s)}
                    >
                      <div className="bg-current rounded-full" style={{ width: s, height: s }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showEraserMenu && (
              <div className="flex items-center justify-center gap-2">
                {SIZES.map(s => (
                  <button
                    key={s}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white active:scale-90 ${eraserSize === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    onClick={() => setEraserSize(s)}
                  >
                    <div className="border-2 border-current rounded-sm" style={{ width: s, height: s }} />
                  </button>
                ))}
              </div>
            )}

            {showLaserMenu && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-wrap landscape:max-w-[400px] landscape:justify-center">
                  {LASER_COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-full border-2 shrink-0 transition-transform active:scale-90 ${laserColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setLaserColor(c)}
                    />
                  ))}
                  <label className="w-7 h-7 rounded-full border-2 border-transparent shrink-0 cursor-pointer active:scale-90 transition-transform relative overflow-hidden">
                    <input 
                      type="color" 
                      value={laserColor}
                      onChange={(e) => setLaserColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="w-full h-full rounded-full bg-[conic-gradient(from_90deg,red,yellow,lime,aqua,blue,magenta,red)]" />
                  </label>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white active:scale-90 ${laserSize === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      onClick={() => setLaserSize(s)}
                    >
                      <div className="bg-current rounded-full blur-[1px]" style={{ width: s, height: s }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showBgs && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-1">Patrón</span>
                  <div className="flex gap-2 justify-center flex-wrap landscape:justify-center">
                    <BgButton label="Ninguno" icon={<Square size={18} className="opacity-30" />} active={pattern === 'none'} onClick={() => { setPattern('none'); }} />
                    <BgButton label="Cuadrícula" icon={<Grid size={18} />} active={pattern === 'grid'} onClick={() => { setPattern('grid'); }} />
                    <BgButton label="Puntos" icon={<Circle size={18} />} active={pattern === 'dots'} onClick={() => { setPattern('dots'); }} />
                    <BgButton label="Líneas" icon={<Minus size={18} />} active={pattern === 'lines'} onClick={() => { setPattern('lines'); }} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-200 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold px-1">Fondo</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1 flex-wrap landscape:max-w-[400px] landscape:justify-center">
                    <BgButton label="Blanco" icon={<Square size={18} />} active={background === 'blank'} onClick={() => { setBackground('blank'); }} />
                    <BgButton label="Rosa" icon={<div className="w-4 h-4 bg-pink-100 border border-pink-200 rounded-sm" />} active={background === 'pink'} onClick={() => { setBackground('pink'); }} />
                    <BgButton label="Amarillo" icon={<div className="w-4 h-4 bg-yellow-50 border border-yellow-100 rounded-sm" />} active={background === 'yellow'} onClick={() => { setBackground('yellow'); }} />
                    <BgButton label="Gris Claro" icon={<div className="w-4 h-4 bg-slate-200 border border-slate-300 rounded-sm" />} active={background === 'lightgray'} onClick={() => { setBackground('lightgray'); }} />
                    <BgButton label="Gris" icon={<div className="w-4 h-4 bg-slate-500 rounded-sm" />} active={background === 'midgray'} onClick={() => { setBackground('midgray'); }} />
                    <BgButton label="Gris Pizarra" icon={<div className="w-4 h-4 bg-slate-800 rounded-sm" />} active={background === 'dark'} onClick={() => { setBackground('dark'); }} />
                    <BgButton label="Gris Carbón" icon={<div className="w-4 h-4 bg-gray-900 rounded-sm" />} active={background === 'gray'} onClick={() => { setBackground('gray'); }} />
                    <BgButton label="Navy" icon={<div className="w-4 h-4 bg-slate-950 rounded-sm" />} active={background === 'navy'} onClick={() => { setBackground('navy'); }} />
                    <BgButton label="Verde Pizarra" icon={<div className="w-4 h-4 bg-green-900 rounded-sm" />} active={background === 'green'} onClick={() => { setBackground('green'); }} />
                    <BgButton label="Negro" icon={<div className="w-4 h-4 bg-black rounded-sm" />} active={background === 'black'} onClick={() => { setBackground('black'); }} />
                    <BgButton label="Universo" icon={<Sparkles size={18} className="text-indigo-400" />} active={background === 'universe'} onClick={() => { setBackground('universe'); }} />
                    <BgButton label="Mosaico" icon={<LayoutGrid size={18} className="text-emerald-400" />} active={background === 'mosaic'} onClick={() => { setBackground('mosaic'); }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function ToolButton({ icon, active, onClick, title }: { icon: React.ReactNode, active: boolean, onClick: () => void, title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all active:scale-95 ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {icon}
    </button>
  );
}

function BgButton({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-all active:scale-90 flex items-center gap-2 ${active ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-white text-slate-600'}`}
    >
      {icon}
      {label && <span className="text-[10px] font-medium hidden sm:inline landscape:inline">{label}</span>}
    </button>
  );
}
