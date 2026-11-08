import React, { useState } from 'react';
import type { MapData, CorridorRect, GateConfig, PickupConfig } from '../../types/game';
import { MAP_CLASSIC_SERPENTINE } from '../../core/registry/MapRegistry';
import { X, Play, Plus, Trash2, Download, Upload } from 'lucide-react';

interface MapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMap: (customMap: MapData) => void;
}

export const MapEditorModal: React.FC<MapEditorModalProps> = ({
  isOpen,
  onClose,
  onApplyMap,
}) => {
  const [mapName, setMapName] = useState('Custom Circuit');
  const [corridors, setCorridors] = useState<CorridorRect[]>(
    JSON.parse(JSON.stringify(MAP_CLASSIC_SERPENTINE.corridors))
  );
  const [gates, setGates] = useState<GateConfig[]>(
    JSON.parse(JSON.stringify(MAP_CLASSIC_SERPENTINE.gates))
  );
  const [pickups, setPickups] = useState<PickupConfig[]>(
    JSON.parse(JSON.stringify(MAP_CLASSIC_SERPENTINE.pickups))
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAddCorridor = () => {
    setCorridors([
      ...corridors,
      { x: 100, y: 200, w: 100, h: 60 }
    ]);
  };

  const handleDeleteCorridor = (idx: number) => {
    setCorridors(corridors.filter((_, i) => i !== idx));
    if (selectedIndex === idx) setSelectedIndex(null);
  };

  const handleUpdateCorridor = (idx: number, field: keyof CorridorRect, val: number) => {
    const updated = [...corridors];
    updated[idx] = { ...updated[idx], [field]: val };
    setCorridors(updated);
  };

  const handleApply = () => {
    const customMap: MapData = {
      ...MAP_CLASSIC_SERPENTINE,
      id: `custom_${Date.now()}`,
      name: mapName,
      corridors,
      gates,
      pickups,
    };
    onApplyMap(customMap);
    onClose();
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ name: mapName, corridors, gates, pickups }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapName.toLowerCase().replace(/\s+/g, '_')}_track.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.corridors) setCorridors(json.corridors);
        if (json.gates) setGates(json.gates);
        if (json.pickups) setPickups(json.pickups);
        if (json.name) setMapName(json.name);
      } catch (err) {
        console.error('Failed to parse map JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="paper-card bg-amber-50 w-full max-w-2xl max-h-[90vh] flex flex-col p-4 shadow-[8px_10px_0px_#0f172a]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-slate-900">
              🛠️ Track Builder & Map Editor
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Map Name:</label>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="paper-btn px-2.5 py-1 text-xs text-slate-900 font-bold bg-white focus:outline-none"
            />
            <div className="flex-1"></div>
            <button
              onClick={handleExportJSON}
              className="paper-btn bg-white hover:bg-slate-100 text-xs px-2.5 py-1 flex items-center gap-1 font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="paper-btn bg-white hover:bg-slate-100 text-xs px-2.5 py-1 flex items-center gap-1 font-bold cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>

          {/* Interactive Mini Preview Map */}
          <div className="relative w-full h-48 bg-[#9bb8e8] border-2 border-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
            <svg
              viewBox="0 0 500 800"
              className="h-full max-w-full drop-shadow-md"
            >
              {/* Finish Alcove */}
              <rect x="205" y="18" width="50" height="55" fill="#4ade80" stroke="#0f172a" strokeWidth="2" />
              {/* Corridors */}
              {corridors.map((c, i) => (
                <rect
                  key={i}
                  x={c.x}
                  y={c.y}
                  width={c.w}
                  height={c.h}
                  fill={selectedIndex === i ? '#fef08a' : '#f8fafc'}
                  stroke="#0f172a"
                  strokeWidth="2"
                  onClick={() => setSelectedIndex(i)}
                  className="cursor-pointer transition-colors"
                />
              ))}
              {/* Gates */}
              {gates.map((g, i) => (
                <rect
                  key={i}
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  fill={`#${g.color.toString(16).padStart(6, '0')}`}
                  stroke="#000"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </div>

          {/* Corridors List & Coordinate Tuner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-slate-800">
                Corridor Segments ({corridors.length})
              </span>
              <button
                onClick={handleAddCorridor}
                className="paper-btn bg-emerald-400 hover:bg-emerald-300 text-xs px-2.5 py-1 flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Segment
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {corridors.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`paper-card p-2 text-xs flex flex-col gap-1 cursor-pointer transition-colors ${
                    selectedIndex === idx ? 'bg-amber-200 border-amber-900' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-black">
                    <span>Segment #{idx + 1}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCorridor(idx);
                      }}
                      className="text-red-600 hover:text-red-800 p-0.5"
                      title="Delete segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                    <div>
                      <span>X: </span>
                      <input
                        type="number"
                        value={c.x}
                        onChange={(e) => handleUpdateCorridor(idx, 'x', Number(e.target.value))}
                        className="w-full border rounded px-1"
                      />
                    </div>
                    <div>
                      <span>Y: </span>
                      <input
                        type="number"
                        value={c.y}
                        onChange={(e) => handleUpdateCorridor(idx, 'y', Number(e.target.value))}
                        className="w-full border rounded px-1"
                      />
                    </div>
                    <div>
                      <span>W: </span>
                      <input
                        type="number"
                        value={c.w}
                        onChange={(e) => handleUpdateCorridor(idx, 'w', Number(e.target.value))}
                        className="w-full border rounded px-1"
                      />
                    </div>
                    <div>
                      <span>H: </span>
                      <input
                        type="number"
                        value={c.h}
                        onChange={(e) => handleUpdateCorridor(idx, 'h', Number(e.target.value))}
                        className="w-full border rounded px-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="paper-btn bg-slate-200 hover:bg-slate-300 text-xs px-3 py-1.5 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="paper-btn bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-xs px-4 py-1.5 flex items-center gap-1 font-extrabold"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Save & Test Run Map</span>
          </button>
        </div>
      </div>
    </div>
  );
};
