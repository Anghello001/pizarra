import React from 'react';
import { CanvasDocument } from '../types';
import { Plus, Trash2, FileText, Clock, ChevronRight, LogOut, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { drawStroke, drawBackground } from '../utils/canvas';

interface DashboardProps {
  documents: CanvasDocument[];
  onSelect: (doc: CanvasDocument) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ documents, onSelect, onCreate, onDelete, onRename }) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  
  const exportToPDF = async (doc: CanvasDocument) => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080]
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw background
      drawBackground(ctx, 1920, 1080, { x: 0, y: 0, scale: 1 }, doc.background, doc.pattern);
      
      // Draw strokes
      ctx.save();
      ctx.translate(doc.transform.x, doc.transform.y);
      ctx.scale(doc.transform.scale, doc.transform.scale);
      doc.strokes.forEach(s => drawStroke(ctx, s));
      ctx.restore();

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 1920, 1080);
      pdf.save(`${doc.name || 'pizarra'}.pdf`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Mis Pizarras</h1>
            <p className="text-slate-500 mt-2">Gestiona tus lienzos y dibujos</p>
          </div>
          <button 
            onClick={onCreate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Plus size={20} />
            Nuevo Lienzo
          </button>
        </header>

        {documents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-400" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">No hay lienzos todavía</h3>
            <p className="text-slate-500 mt-2 mb-8">Comienza creando tu primera pizarra interactiva</p>
            <button 
              onClick={onCreate}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Crear mi primer lienzo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...documents].sort((a, b) => b.lastModified - a.lastModified).map((doc) => (
              <motion.div 
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col"
              >
                <div 
                  onClick={() => onSelect(doc)}
                  className="h-40 bg-slate-100 relative cursor-pointer overflow-hidden"
                >
                  {/* Mini preview could go here, but for now just a placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                     <FileText size={64} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-sm font-medium flex items-center gap-1">
                      Abrir lienzo <ChevronRight size={14} />
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {editingId === doc.id ? (
                        <input 
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => {
                            onRename(doc.id, editName);
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRename(doc.id, editName);
                              setEditingId(null);
                            }
                          }}
                          className="font-bold text-slate-800 text-lg border-b-2 border-indigo-500 outline-none w-full bg-transparent"
                        />
                      ) : (
                        <h3 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(doc.id);
                            setEditName(doc.name);
                          }}
                          className="font-bold text-slate-800 text-lg truncate max-w-[180px] hover:text-indigo-600 cursor-text"
                        >
                          {doc.name || 'Lienzo sin nombre'}
                        </h3>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                        <Clock size={12} />
                        {new Date(doc.lastModified).toLocaleDateString()} {new Date(doc.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          exportToPDF(doc);
                        }}
                        title="Descargar PDF"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(doc.id);
                        }}
                        title="Eliminar"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
