import React, { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import type {
  MapData,
  CorridorRect,
  GateConfig,
  PickupConfig,
  TeamConfig,
  MovingWallDirection,
  WallTriggerMode,
  BarrierConfig,
  BarrierMovement,
  CameraConfig,
  CameraType,
  BaySpawn,
  SimulationLayoutConfig,
  ViewportAspectRatio
} from '../../types/game';
import { DEFAULT_CAMERA_CONFIG, DEFAULT_LAYOUT_CONFIG } from '../../types/game';
import {
  MAP_CLASSIC_SERPENTINE,
  MAP_DOUBLE_HELIX,
  MAP_ARENA_GAUNTLET
} from '../../core/registry/MapRegistry';
import { Sound } from '../../core/audio/SoundEngine';
import {
  Play, Plus, Minus, Trash2, MapPin, Sliders, Users, Download, Upload, Volume2,
  Move, Shield, Check, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Activity,
  Layers, Package, Radio, Flame, Timer, Undo2, Redo2, Save, FolderOpen, Key, Flag, Zap,
  ChevronDown, ChevronUp, Wrench, Camera, Video, ZoomIn, ZoomOut, Layout, Eye, EyeOff
} from 'lucide-react';

const HistoryContext = React.createContext<(() => void) | null>(null);

interface NumberStepperProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  min = 0,
  max = 9999,
  step = 1,
  unit = '',
  onChange,
}) => {
  const pushSnapshotFromCtx = useContext(HistoryContext);
  const hasPushedOnEditRef = useRef(false);
  const isDecimal = Math.abs(step % 1) > 1e-6;

  const roundToStep = (num: number) => {
    const clamped = Math.max(min, Math.min(max, num));
    return isDecimal ? Math.round(clamped * 100) / 100 : Math.round(clamped);
  };

  const [text, setText] = useState<string>(String(value ?? 0));

  useEffect(() => {
    setText(String(value ?? 0));
  }, [value]);

  const commitValue = (num: number) => {
    const rounded = roundToStep(num);
    setText(String(rounded));
    onChange(rounded);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!hasPushedOnEditRef.current) {
      pushSnapshotFromCtx?.();
      hasPushedOnEditRef.current = true;
    }
    if (raw === '') {
      setText('');
      return;
    }
    // Allow digits, optional minus sign if min < 0, and optional decimal point if isDecimal
    let cleaned = raw;
    if (isDecimal) {
      cleaned = raw.replace(min < 0 ? /[^\d.-]/g : /[^\d.]/g, '');
      // Keep only the first decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
      }
    } else {
      cleaned = raw.replace(min < 0 ? /[^\d-]/g : /\D/g, '');
    }
    // Strip leading zeros unless followed by decimal point or just '0'
    const stripped = cleaned.replace(/^(-?)0+(?=\d)/, '$1');
    setText(stripped);
    if (stripped !== '' && stripped !== '-' && stripped !== '.' && stripped !== '-.') {
      const parsed = isDecimal ? parseFloat(stripped) : parseInt(stripped, 10);
      if (!isNaN(parsed)) {
        onChange(roundToStep(parsed));
      }
    }
  };

  const handleBlur = () => {
    hasPushedOnEditRef.current = false;
    if (text === '' || text === '-' || text === '.' || isNaN(Number(text))) {
      commitValue(min > 0 ? min : 0);
    } else {
      commitValue(Number(text));
    }
  };

  const handleIncrement = () => {
    pushSnapshotFromCtx?.();
    const cur = text === '' || isNaN(Number(text)) ? (value ?? 0) : Number(text);
    commitValue(cur + step);
  };

  const handleDecrement = () => {
    pushSnapshotFromCtx?.();
    const cur = text === '' || isNaN(Number(text)) ? (value ?? 0) : Number(text);
    commitValue(cur - step);
  };

  return (
    <div className="flex flex-col text-[11px] font-bold text-slate-800">
      {label && (
        <span className="block text-slate-700 font-extrabold mb-1">
          {label} {unit && <span className="font-normal text-slate-500">({unit})</span>}
        </span>
      )}
      <div className="flex items-center gap-0.5 bg-white border border-slate-400 rounded-md p-0.5 shadow-xs">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-5 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 rounded text-slate-900 select-none cursor-pointer shrink-0"
          title="Decrease"
        >
          <Minus className="w-3 h-3 stroke-[2.5]" />
        </button>
        <input
          type="text"
          inputMode={isDecimal ? 'decimal' : 'numeric'}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className="w-full min-w-0 text-center font-mono text-xs font-bold text-slate-950 bg-transparent focus:outline-none px-0.5"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-5 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-40 rounded text-slate-900 select-none cursor-pointer shrink-0"
          title="Increase"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export interface PaperDropdownOption {
  value: string;
  label: string;
  colorSwatch?: string;
  badge?: string;
  subtitle?: string;
}

interface PaperDropdownProps {
  value: string;
  options: PaperDropdownOption[];
  placeholder?: string;
  onChange: (val: string) => void;
  compact?: boolean;
  className?: string;
  resetOnSelect?: boolean;
}

const PaperDropdown: React.FC<PaperDropdownProps> = ({
  value,
  options,
  placeholder = 'Select option...',
  onChange,
  compact = false,
  className = '',
  resetOnSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find(o => o.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 210 && rect.top > spaceBelow);
    }
    Sound.play('button_click');
    setIsOpen(prev => !prev);
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-1.5 bg-white hover:bg-amber-50/70 active:bg-amber-100/70 border-2 border-slate-900 rounded-lg font-extrabold text-slate-900 transition-colors cursor-pointer ${
          compact
            ? 'px-2 py-0.5 text-[10px] shadow-[1.5px_2px_0px_#0f172a]'
            : 'px-2.5 py-1.5 text-xs shadow-[2px_3px_0px_#0f172a]'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {selectedOption?.colorSwatch && (
            <span
              className="w-3.5 h-3.5 rounded-xs border-[1.5px] border-slate-900 shrink-0 shadow-2xs"
              style={{ backgroundColor: selectedOption.colorSwatch }}
            />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="bg-amber-200 text-slate-950 border border-slate-900/40 px-1 py-0.2 rounded text-[9px] font-black shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-700 shrink-0 stroke-[2.5] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-950' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 min-w-[180px] z-50 bg-white border-2 border-slate-900 rounded-lg shadow-[4px_5px_0px_#0f172a] p-1 max-h-52 overflow-y-auto space-y-0.5 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map(opt => {
            const isSelected = !resetOnSelect && opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  Sound.play('button_click');
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-300 text-slate-950 font-black border border-slate-900 shadow-2xs'
                    : 'hover:bg-slate-100 text-slate-800 font-bold'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.colorSwatch && (
                    <span
                      className="w-3.5 h-3.5 rounded-xs border-[1.5px] border-slate-900 shrink-0 shadow-2xs"
                      style={{ backgroundColor: opt.colorSwatch }}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-[11px] leading-tight truncate">{opt.label}</div>
                    {opt.subtitle && (
                      <div className="text-[9px] text-slate-500 font-semibold truncate">
                        {opt.subtitle}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {opt.badge && (
                    <span
                      className={`px-1 py-0.5 rounded text-[8.5px] font-black border ${
                        isSelected
                          ? 'bg-white text-slate-950 border-slate-900'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-slate-950" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface EditorSceneProps {
  currentMap: MapData;
  teams: TeamConfig[];
  onStartSimulation: (mapData: MapData, teams: TeamConfig[]) => void;
}

type EditorMode = 'select' | 'draw' | 'gate' | 'gate_v' | 'pickup' | 'barrier' | 'barrier_v' | 'spawn';

interface HistorySnapshot {
  corridors: CorridorRect[];
  gates: GateConfig[];
  pickups: PickupConfig[];
  barriers: BarrierConfig[];
  finishZone: CorridorRect;
  baySpawns: BaySpawn[];
  wallTriggerMode: WallTriggerMode;
  wallTriggerTimer: number;
  cameraConfig: CameraConfig;
  layoutConfig: SimulationLayoutConfig;
}

export const EditorScene: React.FC<EditorSceneProps> = ({
  currentMap,
  teams,
  onStartSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'track' | 'roster' | 'sound'>('track');
  const [editorMode, setEditorMode] = useState<EditorMode>('select');

  // Track state
  const [mapName, setMapName] = useState(currentMap.name || 'Custom Circuit');
  const [corridors, setCorridors] = useState<CorridorRect[]>(
    JSON.parse(JSON.stringify(currentMap.corridors || MAP_CLASSIC_SERPENTINE.corridors))
  );
  const [gates, setGates] = useState<GateConfig[]>(
    JSON.parse(JSON.stringify(currentMap.gates || MAP_CLASSIC_SERPENTINE.gates))
  );
  const [pickups, setPickups] = useState<PickupConfig[]>(
    JSON.parse(JSON.stringify(currentMap.pickups || MAP_CLASSIC_SERPENTINE.pickups))
  );
  const [barriers, setBarriers] = useState<BarrierConfig[]>(
    JSON.parse(JSON.stringify(currentMap.barriers || []))
  );
  const [finishZone, setFinishZone] = useState<CorridorRect>(
    JSON.parse(JSON.stringify(currentMap.finishZone || { x: 205, y: 18, w: 50, h: 55 }))
  );
  const [baySpawns, setBaySpawns] = useState<BaySpawn[]>(
    JSON.parse(JSON.stringify(currentMap.baySpawns || MAP_CLASSIC_SERPENTINE.baySpawns))
  );

  const [wallTriggerMode, setWallTriggerMode] = useState<WallTriggerMode>(
    currentMap.wallTriggerMode || 'gate_destroy'
  );
  const [wallTriggerTimer, setWallTriggerTimer] = useState<number>(
    currentMap.wallTriggerTimer !== undefined ? currentMap.wallTriggerTimer : 5
  );

  // In-Game Camera Configuration
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(
    currentMap.cameraConfig
      ? { ...DEFAULT_CAMERA_CONFIG, ...currentMap.cameraConfig }
      : { ...DEFAULT_CAMERA_CONFIG }
  );

  // Simulation Scene Layout Configuration (Aspect Ratio 1:1, 16:9, 4:3, Title, Timer, Arena, Racers List)
  const [layoutConfig, setLayoutConfig] = useState<SimulationLayoutConfig>(
    currentMap.layoutConfig
      ? { ...DEFAULT_LAYOUT_CONFIG, ...currentMap.layoutConfig }
      : { ...DEFAULT_LAYOUT_CONFIG }
  );

  // Track Inspector Active Tab: 'track_editor' | 'preset_tile' | 'cam' | 'layout'
  const [inspectorTab, setInspectorTab] = useState<'track_editor' | 'preset_tile' | 'cam' | 'layout'>('track_editor');

  // Selection state
  const [selectedCorridorIdx, setSelectedCorridorIdx] = useState<number | null>(null);
  const [selectedGateIdx, setSelectedGateIdx] = useState<number | null>(null);
  const [selectedPickupIdx, setSelectedPickupIdx] = useState<number | null>(null);
  const [selectedBarrierIdx, setSelectedBarrierIdx] = useState<number | null>(null);
  const [isFinishSelected, setIsFinishSelected] = useState<boolean>(false);
  const [selectedSpawnIdx, setSelectedSpawnIdx] = useState<number | null>(null);
  const [isSpawnGroupSelected, setIsSpawnGroupSelected] = useState<boolean>(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState<boolean>(true);

  const clearSelection = useCallback(() => {
    setSelectedCorridorIdx(null);
    setSelectedGateIdx(null);
    setSelectedPickupIdx(null);
    setSelectedBarrierIdx(null);
    setIsFinishSelected(false);
    setSelectedSpawnIdx(null);
    setIsSpawnGroupSelected(false);
  }, []);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const pendingDragSnapshotRef = useRef<HistorySnapshot | null>(null);
  const dragSnapshotCommittedRef = useRef<boolean>(false);

  const buildSnapshot = useCallback((): HistorySnapshot => ({
    corridors: JSON.parse(JSON.stringify(corridors)),
    gates: JSON.parse(JSON.stringify(gates)),
    pickups: JSON.parse(JSON.stringify(pickups)),
    barriers: JSON.parse(JSON.stringify(barriers)),
    finishZone: { ...finishZone },
    baySpawns: JSON.parse(JSON.stringify(baySpawns)),
    wallTriggerMode,
    wallTriggerTimer,
    cameraConfig: { ...cameraConfig },
    layoutConfig: { ...layoutConfig },
  }), [corridors, gates, pickups, barriers, finishZone, baySpawns, wallTriggerMode, wallTriggerTimer, cameraConfig, layoutConfig]);

  // Push snapshot to undo stack immediately
  const pushSnapshot = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-25), buildSnapshot()]);
    setRedoStack([]);
  }, [buildSnapshot]);

  // Prepare pre-drag snapshot so moving any corridor/gate/barrier/pickup/finish/spawn records undo history
  const prepareDragSnapshot = useCallback(() => {
    pendingDragSnapshotRef.current = buildSnapshot();
    dragSnapshotCommittedRef.current = false;
  }, [buildSnapshot]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, buildSnapshot()]);

    setCorridors(previous.corridors);
    setGates(previous.gates);
    setPickups(previous.pickups);
    setBarriers(previous.barriers);
    setFinishZone(previous.finishZone);
    if (previous.baySpawns) setBaySpawns(previous.baySpawns);
    setWallTriggerMode(previous.wallTriggerMode);
    setWallTriggerTimer(previous.wallTriggerTimer);
    if (previous.cameraConfig) setCameraConfig(previous.cameraConfig);
    if (previous.layoutConfig) setLayoutConfig(previous.layoutConfig);
    clearSelection();
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, buildSnapshot()]);

    setCorridors(next.corridors);
    setGates(next.gates);
    setPickups(next.pickups);
    setBarriers(next.barriers);
    setFinishZone(next.finishZone);
    if (next.baySpawns) setBaySpawns(next.baySpawns);
    setWallTriggerMode(next.wallTriggerMode);
    setWallTriggerTimer(next.wallTriggerTimer);
    if (next.cameraConfig) setCameraConfig(next.cameraConfig);
    if (next.layoutConfig) setLayoutConfig(next.layoutConfig);
    clearSelection();
  };


  // Manual save system (Local Storage Slots)
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [savedSlots, setSavedSlots] = useState<Array<{ name: string; date: string; data: any }>>(() => {
    try {
      const stored = localStorage.getItem('minit_escape_custom_tracks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSaveTrack = () => {
    const trackPayload = {
      id: `saved_${Date.now()}`,
      name: mapName,
      corridors,
      gates,
      pickups,
      barriers,
      finishZone,
      baySpawns,
      wallTriggerMode,
      wallTriggerTimer,
      cameraConfig,
      layoutConfig,
    };
    const updated = [
      { name: mapName, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), data: trackPayload },
      ...savedSlots.filter(s => s.name !== mapName).slice(0, 5)
    ];
    setSavedSlots(updated);
    try {
      localStorage.setItem('minit_escape_custom_tracks', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    setSaveToast(`Saved "${mapName}"!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleLoadSavedSlot = (slotData: any) => {
    pushSnapshot();
    setMapName(slotData.name || 'Saved Circuit');
    if (slotData.corridors) setCorridors(slotData.corridors);
    if (slotData.gates) setGates(slotData.gates);
    if (slotData.pickups) setPickups(slotData.pickups);
    if (slotData.barriers) setBarriers(slotData.barriers);
    if (slotData.finishZone) setFinishZone(slotData.finishZone);
    if (slotData.baySpawns) setBaySpawns(slotData.baySpawns);
    if (slotData.wallTriggerMode) setWallTriggerMode(slotData.wallTriggerMode);
    if (slotData.wallTriggerTimer !== undefined) setWallTriggerTimer(slotData.wallTriggerTimer);
    if (slotData.cameraConfig) setCameraConfig({ ...DEFAULT_CAMERA_CONFIG, ...slotData.cameraConfig });
    if (slotData.layoutConfig) setLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG, ...slotData.layoutConfig });
    clearSelection();
  };

  // SVG & Canvas container interaction refs
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gridRectRef = useRef<SVGRectElement | null>(null);
  const cachedSvgRectRef = useRef<DOMRect | null>(null);
  const rafMoveIdRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [canvasStageSize, setCanvasStageSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const [canvasContainerSize, setCanvasContainerSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });
  const [portraitDrawerMode, setPortraitDrawerMode] = useState<'collapsed' | 'compact' | 'expanded'>('compact');

  const [dragState, setDragState] = useState<{
    type: 'corridor' | 'gate' | 'pickup' | 'barrier' | 'finish' | 'spawn' | 'spawn_group';
    index: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origSpawns?: BaySpawn[];
  } | null>(null);

  // Canvas View: Pan and Zoom state
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [panDragState, setPanDragState] = useState<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  // Observe Track Builder outer stage and inner canvas container size
  useEffect(() => {
    if (activeTab !== 'track') return;
    const stageEl = canvasStageRef.current;
    const containerEl = canvasContainerRef.current;

    const updateSizes = () => {
      if (stageEl) {
        const sRect = stageEl.getBoundingClientRect();
        if (sRect.width > 0 && sRect.height > 0) {
          setCanvasStageSize({ w: Math.round(sRect.width), h: Math.round(sRect.height) });
        }
      }
      if (containerEl) {
        const cRect = containerEl.getBoundingClientRect();
        if (cRect.width > 0 && cRect.height > 0) {
          setCanvasContainerSize({ w: Math.round(cRect.width), h: Math.round(cRect.height) });
        }
      }
    };

    updateSizes();
    const ro = new ResizeObserver(updateSizes);
    if (stageEl) ro.observe(stageEl);
    if (containerEl) ro.observe(containerEl);
    return () => ro.disconnect();
  }, [activeTab, layoutConfig.aspectRatio, portraitDrawerMode]);

  // Compute fitted box for the Track Builder viewport when aspectRatio is 1:1, 16:9, or 4:3
  const fittedEditorBox = useMemo(() => {
    const ratio = layoutConfig.aspectRatio || '4:3';
    if (ratio === 'auto' || canvasStageSize.w <= 0 || canvasStageSize.h <= 0) {
      return null;
    }
    const targetAspect = ratio === '1:1' ? 1.0 : ratio === '16:9' ? 16 / 9 : 4 / 3;
    const availW = canvasStageSize.w;
    const availH = canvasStageSize.h;
    let w = availW;
    let h = Math.round(w / targetAspect);
    if (h > availH) {
      h = availH;
      w = Math.round(h * targetAspect);
    }
    return { w: Math.max(180, w), h: Math.max(140, h), aspect: targetAspect };
  }, [layoutConfig.aspectRatio, canvasStageSize]);

  // Roster state
  const [teamList, setTeamList] = useState<TeamConfig[]>(() => {
    return teams.map(t => ({
      ...t,
      enabled: t.enabled !== undefined ? t.enabled : true
    }));
  });

  // Sound state
  const [scaleType, setScaleType] = useState(Sound.config.scaleType);
  const [waveform, setWaveform] = useState(Sound.config.waveform);
  const [secondaryWaveform, setSecondaryWaveform] = useState(Sound.config.secondaryWaveform || 'sine');
  const [decayTime, setDecayTime] = useState(Sound.config.decayTime);
  const [masterVolume, setMasterVolume] = useState(Sound.config.volume);

  // Dynamic Arena Bounds (Unlimited Arena Size support)
  // Frozen while dragging an object so the camera viewBox never shifts or rescales mid-drag
  const lastStableArenaBoundsRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: -40,
    y: -40,
    w: 580,
    h: 880,
  });

  const arenaBounds = useMemo(() => {
    if (dragState !== null) {
      return lastStableArenaBoundsRef.current;
    }

    let minX = 0;
    let minY = 0;
    let maxX = 500;
    let maxY = 800;

    for (let i = 0; i < corridors.length; i++) {
      const c = corridors[i];
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x + c.w > maxX) maxX = c.x + c.w;
      if (c.y + c.h > maxY) maxY = c.y + c.h;
    }

    if (finishZone) {
      if (finishZone.x < minX) minX = finishZone.x;
      if (finishZone.y < minY) minY = finishZone.y;
      if (finishZone.x + finishZone.w > maxX) maxX = finishZone.x + finishZone.w;
      if (finishZone.y + finishZone.h > maxY) maxY = finishZone.y + finishZone.h;
    }

    for (let i = 0; i < gates.length; i++) {
      const g = gates[i];
      if (g.x < minX) minX = g.x;
      if (g.y < minY) minY = g.y;
      if (g.x + g.w > maxX) maxX = g.x + g.w;
      if (g.y + g.h > maxY) maxY = g.y + g.h;
    }

    for (let i = 0; i < barriers.length; i++) {
      const b = barriers[i];
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }

    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (p.x - 20 < minX) minX = p.x - 20;
      if (p.y - 20 < minY) minY = p.y - 20;
      if (p.x + 20 > maxX) maxX = p.x + 20;
      if (p.y + 20 > maxY) maxY = p.y + 20;
    }

    for (let i = 0; i < baySpawns.length; i++) {
      const s = baySpawns[i];
      if (s.x - 25 < minX) minX = s.x - 25;
      if (s.y - 25 < minY) minY = s.y - 25;
      if (s.x + 25 > maxX) maxX = s.x + 25;
      if (s.y + 25 > maxY) maxY = s.y + 25;
    }

    const pad = 40;
    const computed = {
      x: Math.floor(minX - pad),
      y: Math.floor(minY - pad),
      w: Math.max(500, Math.ceil(maxX - minX + pad * 2)),
      h: Math.max(800, Math.ceil(maxY - minY + pad * 2)),
    };
    lastStableArenaBoundsRef.current = computed;
    return computed;
  }, [corridors, finishZone, gates, barriers, pickups, baySpawns, dragState]);

  // Dynamic ViewBox matching the exact aspect ratio of the canvas container
  const { dynamicViewBox, viewX, viewY, viewW, viewH } = useMemo(() => {
    const activeW = fittedEditorBox ? fittedEditorBox.w : canvasContainerSize.w;
    const activeH = fittedEditorBox ? fittedEditorBox.h : canvasContainerSize.h;
    const containerAspect = Math.max(0.2, activeW / Math.max(1, activeH));
    const arenaAspect = arenaBounds.w / Math.max(1, arenaBounds.h);

    let baseW = arenaBounds.w;
    let baseH = arenaBounds.h;
    if (containerAspect > arenaAspect) {
      baseH = arenaBounds.h;
      baseW = baseH * containerAspect;
    } else {
      baseW = arenaBounds.w;
      baseH = baseW / containerAspect;
    }

    const vW = baseW / canvasZoom;
    const vH = baseH / canvasZoom;
    const vCenterX = arenaBounds.x + arenaBounds.w / 2 + canvasPan.x;
    const vCenterY = arenaBounds.y + arenaBounds.h / 2 + canvasPan.y;
    const vX = vCenterX - vW / 2;
    const vY = vCenterY - vH / 2;
    return {
      dynamicViewBox: `${vX} ${vY} ${vW} ${vH}`,
      viewX: vX,
      viewY: vY,
      viewW: vW,
      viewH: vH,
    };
  }, [arenaBounds, canvasContainerSize, fittedEditorBox, canvasZoom, canvasPan]);

  // Fast zero-reflow SVG coordinate converter using cached bounding rect and viewBox math
  const getSVGCoords = (e: React.PointerEvent<any> | React.MouseEvent<any> | { clientX: number; clientY: number }) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = cachedSvgRectRef.current || svgRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      return {
        x: Math.round(viewX + normX * viewW),
        y: Math.round(viewY + normY * viewH),
      };
    }
    return { x: 0, y: 0 };
  };

  // Spawn group center & bounding box
  const spawnBounds = useMemo(() => {
    if (!baySpawns || baySpawns.length === 0) {
      return { minX: 110, minY: 380, maxX: 180, maxY: 660, cx: 145, cy: 520 };
    }
    let minX = baySpawns[0].x;
    let maxX = baySpawns[0].x;
    let minY = baySpawns[0].y;
    let maxY = baySpawns[0].y;
    let sumX = 0;
    let sumY = 0;
    baySpawns.forEach(s => {
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
      sumX += s.x;
      sumY += s.y;
    });
    return {
      minX: minX - 18,
      minY: minY - 18,
      maxX: maxX + 18,
      maxY: maxY + 18,
      cx: Math.round(sumX / baySpawns.length),
      cy: Math.round(sumY / baySpawns.length),
    };
  }, [baySpawns]);

  // Camera preview field-of-view calculation matching RaceSimulation initial focus & aspectRatio
  const previewCamCenter = useMemo(() => {
    if (cameraConfig.type === 'auto_moving') {
      const wallCorridors = corridors.filter(c => c.hasMovingWall);
      if (wallCorridors.length > 0) {
        const firstWall = [...wallCorridors].sort((a, b) => (a.wallOrder || 1) - (b.wallOrder || 1))[0];
        return { x: firstWall.x + firstWall.w / 2, y: firstWall.y + firstWall.h / 2 };
      }
    }
    if (baySpawns && baySpawns.length > 0) {
      return { x: spawnBounds.cx, y: spawnBounds.cy };
    }
    if (corridors.length > 0) {
      const lowest = corridors.reduce((max, c) => c.y > max.y ? c : max, corridors[0]);
      return { x: lowest.x + lowest.w / 2, y: lowest.y + lowest.h / 2 };
    }
    return { x: 250, y: 700 };
  }, [cameraConfig.type, baySpawns, spawnBounds, corridors]);

  const camPreviewRect = useMemo(() => {
    const z = Math.max(0.2, Number(cameraConfig.defaultZoom) || 1.0);
    const ratio = layoutConfig.aspectRatio || '4:3';
    const aspect =
      ratio === '1:1'
        ? 1.0
        : ratio === '16:9'
        ? 16 / 9
        : ratio === '4:3'
        ? 4 / 3
        : Math.max(0.25, canvasContainerSize.w / Math.max(1, canvasContainerSize.h));
    const baseSimW = aspect >= 1 ? Math.round(600 * aspect) : 500;
    const baseSimH = aspect >= 1 ? 600 : Math.round(500 / aspect);
    const w = baseSimW / z;
    const h = baseSimH / z;
    return {
      x: previewCamCenter.x - w / 2,
      y: previewCamCenter.y - h / 2,
      w,
      h,
      zoom: z,
    };
  }, [previewCamCenter, cameraConfig.defaultZoom, layoutConfig.aspectRatio, canvasContainerSize]);

  // Smart Spawn Setup Helpers
  const handlePlaceSpawnsInCorridor = (corridorIdx: number) => {
    const c = corridors[corridorIdx];
    if (!c) return;
    pushSnapshot();
    const count = teamList.length || 8;
    const isHorizontal = c.w >= c.h;
    const cols = isHorizontal ? Math.min(4, count) : Math.min(2, count);
    const rows = Math.ceil(count / cols);
    const padX = Math.min(22, Math.max(14, Math.floor(c.w * 0.2)));
    const padY = Math.min(22, Math.max(14, Math.floor(c.h * 0.2)));
    const usableW = Math.max(16, c.w - padX * 2);
    const usableH = Math.max(16, c.h - padY * 2);

    const dir = c.wallDirection || (isHorizontal ? 'right' : 'up');
    const newSpawns: BaySpawn[] = teamList.map((team, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = Math.round(c.x + padX + (cols > 1 ? (col / (cols - 1)) * usableW : usableW / 2));
      const y = Math.round(c.y + padY + (rows > 1 ? (row / (rows - 1)) * usableH : usableH / 2));
      let vx = (idx % 2 === 0 ? 1 : -1) * 2.8;
      let vy = (row % 2 === 0 ? -1 : 1) * 2.2;
      if (dir === 'right') { vx = 3.1; vy = (idx % 2 === 0 ? -1.8 : 1.8); }
      else if (dir === 'left') { vx = -3.1; vy = (idx % 2 === 0 ? -1.8 : 1.8); }
      else if (dir === 'up') { vx = (idx % 2 === 0 ? -2.0 : 2.0); vy = -3.1; }
      else if (dir === 'down') { vx = (idx % 2 === 0 ? -2.0 : 2.0); vy = 3.1; }
      return { x, y, vx, vy, teamId: team.id };
    });

    setBaySpawns(newSpawns);
    clearSelection();
    setIsSpawnGroupSelected(true);
    setInspectorTab('track_editor');
  };

  const handleAutoFitStartingBays = () => {
    if (corridors.length === 0) return;
    pushSnapshot();
    // Find Stage Order 1 corridors first; otherwise use first corridor
    const order1 = corridors.filter((c, idx) => c.hasMovingWall && (c.wallOrder ?? idx + 1) === 1);
    const targetBays = order1.length > 0 ? order1 : [corridors[0]];
    const count = teamList.length || 8;

    if (targetBays.length === 1) {
      const idx = corridors.indexOf(targetBays[0]);
      handlePlaceSpawnsInCorridor(idx >= 0 ? idx : 0);
      return;
    }

    const newSpawns: BaySpawn[] = teamList.map((team, idx) => {
      const bay = targetBays[idx % targetBays.length];
      const slotInBay = Math.floor(idx / targetBays.length);
      const totalInBay = Math.ceil(count / targetBays.length);
      const isHorizontal = bay.w >= bay.h;
      const pad = 16;
      let x = Math.round(bay.x + bay.w * 0.72);
      let y = Math.round(
        bay.y + pad + (totalInBay > 1 ? (slotInBay / (totalInBay - 1)) * Math.max(12, bay.h - pad * 2) : (bay.h - pad * 2) / 2)
      );
      if (!isHorizontal) {
        x = Math.round(
          bay.x + pad + (totalInBay > 1 ? (slotInBay / (totalInBay - 1)) * Math.max(12, bay.w - pad * 2) : (bay.w - pad * 2) / 2)
        );
        y = Math.round(bay.y + bay.h * 0.72);
      }
      const dir = bay.wallDirection || (isHorizontal ? 'right' : 'up');
      let vx = dir === 'left' ? -3.1 : 3.1;
      let vy = slotInBay % 2 === 0 ? -1.9 : 1.9;
      if (dir === 'up' || dir === 'down') {
        vx = slotInBay % 2 === 0 ? -2.0 : 2.0;
        vy = dir === 'up' ? -3.1 : 3.1;
      }
      return { x, y, vx, vy, teamId: team.id };
    });

    setBaySpawns(newSpawns);
    clearSelection();
    setIsSpawnGroupSelected(true);
    setInspectorTab('track_editor');
  };

  const handleApplySpawnFormation = (
    formation: 'grid_2x4' | 'grid_4x2' | 'line_h' | 'line_v' | 'circle',
    centerOverride?: { x: number; y: number }
  ) => {
    pushSnapshot();
    const cx = centerOverride ? centerOverride.x : spawnBounds.cx;
    const cy = centerOverride ? centerOverride.y : spawnBounds.cy;
    const count = teamList.length || 8;

    const newSpawns: BaySpawn[] = teamList.map((team, idx) => {
      const prev = baySpawns[idx] || { vx: 3.0, vy: -2.0 };
      let x = cx;
      let y = cy;
      if (formation === 'grid_2x4') {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        x = Math.round(cx + (col - 0.5) * 26);
        y = Math.round(cy + (row - 1.5) * 26);
      } else if (formation === 'grid_4x2') {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        x = Math.round(cx + (col - 1.5) * 26);
        y = Math.round(cy + (row - 0.5) * 26);
      } else if (formation === 'line_h') {
        x = Math.round(cx + (idx - (count - 1) / 2) * 20);
        y = Math.round(cy);
      } else if (formation === 'line_v') {
        x = Math.round(cx);
        y = Math.round(cy + (idx - (count - 1) / 2) * 20);
      } else if (formation === 'circle') {
        const angle = (idx / count) * Math.PI * 2;
        x = Math.round(cx + Math.cos(angle) * 28);
        y = Math.round(cy + Math.sin(angle) * 28);
      }
      return {
        x,
        y,
        vx: prev.vx,
        vy: prev.vy,
        teamId: team.id,
      };
    });

    setBaySpawns(newSpawns);
  };

  const handleMoveAllSpawnsTo = (newCx: number, newCy: number) => {
    const dx = newCx - spawnBounds.cx;
    const dy = newCy - spawnBounds.cy;
    setBaySpawns(prev =>
      prev.map(s => ({
        ...s,
        x: Math.round(s.x + dx),
        y: Math.round(s.y + dy),
      }))
    );
  };

  const handleScaleSpawnSpread = (factor: number) => {
    pushSnapshot();
    const { cx, cy } = spawnBounds;
    setBaySpawns(prev =>
      prev.map(s => ({
        ...s,
        x: Math.round(cx + (s.x - cx) * factor),
        y: Math.round(cy + (s.y - cy) * factor),
      }))
    );
  };

  const handleSetSpawnVelocities = (dir: 'up' | 'down' | 'left' | 'right' | 'scatter', targetIdx: number | null = null) => {
    pushSnapshot();
    setBaySpawns(prev =>
      prev.map((s, idx) => {
        if (targetIdx !== null && idx !== targetIdx) return s;
        const alt = idx % 2 === 0 ? 1 : -1;
        if (dir === 'up') return { ...s, vx: 1.8 * alt, vy: -3.2 };
        if (dir === 'down') return { ...s, vx: 1.8 * alt, vy: 3.2 };
        if (dir === 'left') return { ...s, vx: -3.2, vy: 1.8 * alt };
        if (dir === 'right') return { ...s, vx: 3.2, vy: 1.8 * alt };
        // scatter
        const angle = (idx / Math.max(1, prev.length)) * Math.PI * 2 + 0.4;
        return {
          ...s,
          vx: Math.round(Math.cos(angle) * 3.2 * 10) / 10,
          vy: Math.round(Math.sin(angle) * 3.2 * 10) / 10,
        };
      })
    );
  };

  // Preset loading
  const handleLoadPreset = (preset: MapData) => {
    pushSnapshot();
    setMapName(preset.name);
    setCorridors(JSON.parse(JSON.stringify(preset.corridors)));
    setGates(JSON.parse(JSON.stringify(preset.gates)));
    setPickups(JSON.parse(JSON.stringify(preset.pickups)));
    setBarriers(JSON.parse(JSON.stringify(preset.barriers || [])));
    setFinishZone(JSON.parse(JSON.stringify(preset.finishZone || { x: 205, y: 18, w: 50, h: 55 })));
    setBaySpawns(JSON.parse(JSON.stringify(preset.baySpawns || MAP_CLASSIC_SERPENTINE.baySpawns)));
    setWallTriggerMode(preset.wallTriggerMode || 'gate_destroy');
    setWallTriggerTimer(preset.wallTriggerTimer !== undefined ? preset.wallTriggerTimer : 5);
    if (preset.cameraConfig) {
      setCameraConfig({ ...DEFAULT_CAMERA_CONFIG, ...preset.cameraConfig });
    } else {
      setCameraConfig({ ...DEFAULT_CAMERA_CONFIG });
    }
    if (preset.layoutConfig) {
      setLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG, ...preset.layoutConfig });
    }
    setCanvasZoom(1.0);
    setCanvasPan({ x: 0, y: 0 });
    clearSelection();
  };


  // Add elements (defaults to current viewport center so limitless arenas place items right where the user is looking)
  const getViewCenter = () => ({
    cx: Math.round((viewX + viewW / 2) / 5) * 5,
    cy: Math.round((viewY + viewH / 2) / 5) * 5,
  });

  const handleAddCorridor = (
    x?: number, y?: number, w = 90, h = 60,
    hasMovingWall = false,
    wallDirection: MovingWallDirection = 'right'
  ) => {
    pushSnapshot();
    const { cx, cy } = getViewCenter();
    const finalX = x !== undefined ? x : Math.round((cx - w / 2) / 5) * 5;
    const finalY = y !== undefined ? y : Math.round((cy - h / 2) / 5) * 5;
    const newCorridor: CorridorRect = {
      x: finalX, y: finalY, w, h,
      hasMovingWall,
      wallDirection,
      wallSpeed: 55,
      wallDelay: 0
    };
    setCorridors(prev => [...prev, newCorridor]);
    setSelectedCorridorIdx(corridors.length);
    setSelectedGateIdx(null);
    setSelectedPickupIdx(null);
    setSelectedBarrierIdx(null);
    setIsFinishSelected(false);
  };

  const handleAddGate = (x?: number, y?: number, w = 70, h = 15, orientation: 'H' | 'V' = 'H') => {
    pushSnapshot();
    const { cx, cy } = getViewCenter();
    const finalX = x !== undefined ? x : Math.round((cx - w / 2) / 5) * 5;
    const finalY = y !== undefined ? y : Math.round((cy - h / 2) / 5) * 5;
    const defaultRacerColor = teamList[gates.length % Math.max(1, teamList.length)]?.hex ?? 0x22c55e;
    const newGate: GateConfig = {
      id: `gate_${Date.now()}`,
      x: finalX, y: finalY, w, h,
      hp: 8,
      color: defaultRacerColor,
      orientation,
      triggersFlood: false
    };
    setGates(prev => [...prev, newGate]);
    setSelectedGateIdx(gates.length);
    setSelectedCorridorIdx(null);
    setSelectedPickupIdx(null);
    setSelectedBarrierIdx(null);
    setIsFinishSelected(false);
  };

  const handleAddPickup = (type: string, x?: number, y?: number) => {
    pushSnapshot();
    const { cx, cy } = getViewCenter();
    const finalX = x !== undefined ? x : cx;
    const finalY = y !== undefined ? y : cy;
    const newP: PickupConfig = { type, x: finalX, y: finalY };
    setPickups(prev => [...prev, newP]);
    setSelectedPickupIdx(pickups.length);
    setSelectedCorridorIdx(null);
    setSelectedGateIdx(null);
    setSelectedBarrierIdx(null);
    setIsFinishSelected(false);
  };

  const handleAddBarrier = (x?: number, y?: number, w = 60, h = 16, movement: BarrierMovement = 'horizontal') => {
    pushSnapshot();
    const { cx, cy } = getViewCenter();
    const finalX = x !== undefined ? x : Math.round((cx - w / 2) / 5) * 5;
    const finalY = y !== undefined ? y : Math.round((cy - h / 2) / 5) * 5;
    const newB: BarrierConfig = {
      id: `barrier_${Date.now()}`,
      x: finalX, y: finalY, w, h,
      movement,
      speed: 45,
      distance: 60,
      color: 0x475569
    };
    setBarriers(prev => [...prev, newB]);
    setSelectedBarrierIdx(barriers.length);
    setSelectedCorridorIdx(null);
    setSelectedGateIdx(null);
    setSelectedPickupIdx(null);
    setIsFinishSelected(false);
  };

  // Canvas zoom with mouse wheel or two-finger pinch gesture (wide zoom range for limitless tracks)
  const touchPinchDistRef = useRef<number | null>(null);
  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setCanvasZoom(prev => Math.max(0.08, Math.min(6.0, Math.round(prev * factor * 100) / 100)));
  };

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (touchPinchDistRef.current !== null && touchPinchDistRef.current > 0) {
        const ratio = dist / touchPinchDistRef.current;
        if (Math.abs(ratio - 1) > 0.015) {
          setCanvasZoom(prev => Math.max(0.08, Math.min(6.0, Math.round(prev * ratio * 100) / 100)));
          touchPinchDistRef.current = dist;
        }
      } else {
        touchPinchDistRef.current = dist;
      }
    }
  };

  const handleCanvasTouchEnd = () => {
    touchPinchDistRef.current = null;
  };

  // Generic tool placement handler for any pointer event on canvas or child items (no coordinate clamps)
  const handleItemToolPlacement = (e: React.PointerEvent<any>) => {
    if (editorMode === 'draw') {
      const { x, y } = getSVGCoords(e);
      handleAddCorridor(Math.round((x - 40) / 5) * 5, Math.round((y - 25) / 5) * 5, 80, 50, false, 'right');
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'gate') {
      const { x, y } = getSVGCoords(e);
      handleAddGate(Math.round((x - 35) / 5) * 5, Math.round((y - 7) / 5) * 5, 70, 14, 'H');
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'gate_v') {
      const { x, y } = getSVGCoords(e);
      handleAddGate(Math.round((x - 7) / 5) * 5, Math.round((y - 35) / 5) * 5, 14, 70, 'V');
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'pickup') {
      const { x, y } = getSVGCoords(e);
      handleAddPickup('cherry_clone', x, y);
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'barrier') {
      const { x, y } = getSVGCoords(e);
      handleAddBarrier(Math.round((x - 30) / 5) * 5, Math.round((y - 8) / 5) * 5, 60, 16, 'horizontal');
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'barrier_v') {
      const { x, y } = getSVGCoords(e);
      handleAddBarrier(Math.round((x - 8) / 5) * 5, Math.round((y - 30) / 5) * 5, 16, 60, 'vertical');
      e.stopPropagation();
      return true;
    }
    if (editorMode === 'spawn') {
      const { x, y } = getSVGCoords(e);
      pushSnapshot();
      // Check if clicked inside a corridor; if so, fit or clamp nicely
      const hitCorridorIdx = corridors.findIndex(
        c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h
      );
      if (hitCorridorIdx >= 0) {
        const c = corridors[hitCorridorIdx];
        const isHoriz = c.w >= c.h;
        const count = teamList.length || 8;
        const cols = isHoriz ? 4 : 2;
        const rows = Math.ceil(count / cols);
        const spacingX = Math.min(20, Math.max(10, (c.w - 28) / Math.max(1, cols)));
        const spacingY = Math.min(20, Math.max(10, (c.h - 28) / Math.max(1, rows)));
        const clampedCx = Math.max(c.x + 20, Math.min(c.x + c.w - 20, x));
        const clampedCy = Math.max(c.y + 20, Math.min(c.y + c.h - 20, y));
        setBaySpawns(prev =>
          teamList.map((t, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const sx = Math.round(
              Math.max(c.x + 12, Math.min(c.x + c.w - 12, clampedCx + (col - (cols - 1) / 2) * spacingX))
            );
            const sy = Math.round(
              Math.max(c.y + 12, Math.min(c.y + c.h - 12, clampedCy + (row - (rows - 1) / 2) * spacingY))
            );
            const existing = prev[idx] || { vx: 3.0, vy: -2.0 };
            return { x: sx, y: sy, vx: existing.vx, vy: existing.vy, teamId: t.id };
          })
        );
      } else {
        handleMoveAllSpawnsTo(x, y);
      }
      clearSelection();
      setIsSpawnGroupSelected(true);
      setInspectorTab('track_editor');
      e.stopPropagation();
      return true;
    }
    return false;
  };

  // SVG pointer handlers
  const handlePointerDownSVG = (e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      cachedSvgRectRef.current = svgRef.current.getBoundingClientRect();
    }
    if (handleItemToolPlacement(e)) return;

    // Deselect if clicking on empty background and begin canvas pan dragging
    clearSelection();

    setPanDragState({
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: canvasPan.x,
      startPanY: canvasPan.y,
    });
  };

  const applyPointerMove = (clientX: number, clientY: number) => {
    if (panDragState && svgRef.current) {
      const rect = cachedSvgRectRef.current || svgRef.current.getBoundingClientRect();
      const svgW = rect.width || 1;
      const svgH = rect.height || 1;
      const dxScreen = clientX - panDragState.startClientX;
      const dyScreen = clientY - panDragState.startClientY;
      const scaleX = viewW / svgW;
      const scaleY = viewH / svgH;
      const nextPanX = panDragState.startPanX - dxScreen * scaleX;
      const nextPanY = panDragState.startPanY - dyScreen * scaleY;
      setCanvasPan({
        x: nextPanX,
        y: nextPanY,
      });
      return;
    }

    if (!dragState) return;
    if (!cachedSvgRectRef.current && svgRef.current) {
      cachedSvgRectRef.current = svgRef.current.getBoundingClientRect();
    }
    const { x, y } = getSVGCoords({ clientX, clientY });
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;

    // Commit pre-drag snapshot to undoStack the first time the object actually moves
    const commitSnapIfNeeded = () => {
      if (!dragSnapshotCommittedRef.current && pendingDragSnapshotRef.current) {
        const snap = pendingDragSnapshotRef.current;
        setUndoStack(prev => [...prev.slice(-25), snap]);
        setRedoStack([]);
        dragSnapshotCommittedRef.current = true;
      }
    };

    if (dragState.type === 'corridor') {
      const target = corridors[dragState.index];
      if (target) {
        const nextX = Math.round((dragState.origX + dx) / 5) * 5;
        const nextY = Math.round((dragState.origY + dy) / 5) * 5;
        if (nextX !== target.x || nextY !== target.y) {
          commitSnapIfNeeded();
          setCorridors(prev => {
            const updated = [...prev];
            updated[dragState.index] = { ...updated[dragState.index], x: nextX, y: nextY };
            return updated;
          });
        }
      }
    } else if (dragState.type === 'gate') {
      const target = gates[dragState.index];
      if (target) {
        const nextX = Math.round((dragState.origX + dx) / 5) * 5;
        const nextY = Math.round((dragState.origY + dy) / 5) * 5;
        if (nextX !== target.x || nextY !== target.y) {
          commitSnapIfNeeded();
          setGates(prev => {
            const updated = [...prev];
            updated[dragState.index] = { ...updated[dragState.index], x: nextX, y: nextY };
            return updated;
          });
        }
      }
    } else if (dragState.type === 'pickup') {
      const target = pickups[dragState.index];
      if (target) {
        const nextX = Math.round(dragState.origX + dx);
        const nextY = Math.round(dragState.origY + dy);
        if (nextX !== target.x || nextY !== target.y) {
          commitSnapIfNeeded();
          setPickups(prev => {
            const updated = [...prev];
            updated[dragState.index] = { ...updated[dragState.index], x: nextX, y: nextY };
            return updated;
          });
        }
      }
    } else if (dragState.type === 'barrier') {
      const target = barriers[dragState.index];
      if (target) {
        const nextX = Math.round((dragState.origX + dx) / 5) * 5;
        const nextY = Math.round((dragState.origY + dy) / 5) * 5;
        if (nextX !== target.x || nextY !== target.y) {
          commitSnapIfNeeded();
          setBarriers(prev => {
            const updated = [...prev];
            updated[dragState.index] = { ...updated[dragState.index], x: nextX, y: nextY };
            return updated;
          });
        }
      }
    } else if (dragState.type === 'finish') {
      const nextX = Math.round((dragState.origX + dx) / 5) * 5;
      const nextY = Math.round((dragState.origY + dy) / 5) * 5;
      if (nextX !== finishZone.x || nextY !== finishZone.y) {
        commitSnapIfNeeded();
        setFinishZone(prev => ({
          ...prev,
          x: nextX,
          y: nextY,
        }));
      }
    } else if (dragState.type === 'spawn') {
      const target = baySpawns[dragState.index];
      if (target) {
        const nextX = Math.round(dragState.origX + dx);
        const nextY = Math.round(dragState.origY + dy);
        if (nextX !== target.x || nextY !== target.y) {
          commitSnapIfNeeded();
          setBaySpawns(prev => {
            const updated = [...prev];
            updated[dragState.index] = { ...updated[dragState.index], x: nextX, y: nextY };
            return updated;
          });
        }
      }
    } else if (dragState.type === 'spawn_group' && dragState.origSpawns) {
      if (Math.round(dx) !== 0 || Math.round(dy) !== 0) {
        commitSnapIfNeeded();
        setBaySpawns(
          dragState.origSpawns.map(sp => ({
            ...sp,
            x: Math.round(sp.x + dx),
            y: Math.round(sp.y + dy),
          }))
        );
      }
    }
  };

  const handlePointerMoveSVG = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panDragState && !dragState) return;
    latestPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (rafMoveIdRef.current !== null) return;
    rafMoveIdRef.current = requestAnimationFrame(() => {
      rafMoveIdRef.current = null;
      if (latestPointerRef.current) {
        applyPointerMove(latestPointerRef.current.clientX, latestPointerRef.current.clientY);
      }
    });
  };

  const handlePointerUpSVG = () => {
    if (rafMoveIdRef.current !== null) {
      cancelAnimationFrame(rafMoveIdRef.current);
      rafMoveIdRef.current = null;
    }
    if (latestPointerRef.current && (panDragState || dragState)) {
      applyPointerMove(latestPointerRef.current.clientX, latestPointerRef.current.clientY);
    }
    latestPointerRef.current = null;
    cachedSvgRectRef.current = null;
    setDragState(null);
    setPanDragState(null);
    pendingDragSnapshotRef.current = null;
    dragSnapshotCommittedRef.current = false;
  };

  // Launch simulation
  const handleLaunch = () => {
    Sound.init();
    const activeCount = teamList.filter(t => t.enabled !== false).length;
    const confirmedTeams = activeCount > 0 ? teamList : teamList.map(t => ({ ...t, enabled: true }));

    const finalizedMap: MapData = {
      ...currentMap,
      id: `custom_${Date.now()}`,
      name: mapName,
      corridors,
      gates,
      pickups,
      barriers,
      finishZone,
      baySpawns,
      wallTriggerMode,
      wallTriggerTimer,
      cameraConfig: { ...cameraConfig },
      layoutConfig: { ...layoutConfig },
    };
    onStartSimulation(finalizedMap, confirmedTeams);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({
      name: mapName,
      corridors,
      gates,
      pickups,
      barriers,
      finishZone,
      baySpawns,
      wallTriggerMode,
      wallTriggerTimer,
      cameraConfig,
      layoutConfig,
    }, null, 2);
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
        pushSnapshot();
        if (json.corridors) setCorridors(json.corridors);
        if (json.gates) setGates(json.gates);
        if (json.pickups) setPickups(json.pickups);
        if (json.barriers) setBarriers(json.barriers);
        if (json.finishZone) setFinishZone(json.finishZone);
        if (json.baySpawns) setBaySpawns(json.baySpawns);
        if (json.name) setMapName(json.name);
        if (json.wallTriggerMode) setWallTriggerMode(json.wallTriggerMode);
        if (json.wallTriggerTimer !== undefined) setWallTriggerTimer(json.wallTriggerTimer);
        if (json.cameraConfig) setCameraConfig({ ...DEFAULT_CAMERA_CONFIG, ...json.cameraConfig });
        if (json.layoutConfig) setLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG, ...json.layoutConfig });
      } catch (err) {
        console.error('Failed to parse track JSON:', err);
      }
    };
    reader.readAsText(file);
  };


  const handleToggleTeamEnabled = (id: string) => {
    setTeamList(prev => prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const handleSelectAllRacers = (enable: boolean) => {
    setTeamList(prev => prev.map(t => ({ ...t, enabled: enable })));
  };

  const activeRacersCount = teamList.filter(t => t.enabled !== false).length;
  const isObjectSelected = selectedCorridorIdx !== null || selectedGateIdx !== null || selectedPickupIdx !== null;

  return (
    <HistoryContext.Provider value={pushSnapshot}>
    <div className="flex flex-col w-full h-dvh p-1.5 sm:p-3 select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="w-full paper-card bg-amber-100 px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center justify-between gap-2 shadow-[3px_4px_0px_#0f172a] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-red-500 border-2 border-slate-900 rounded-sm flex items-center justify-center shadow-xs shrink-0">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 bg-white border border-black"></div>
              <div className="w-1.5 h-1.5 bg-white border border-black"></div>
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-slate-900 leading-tight truncate">
              Minit Escape! Track Studio
            </h1>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 hidden sm:block truncate">
              Modular moving walls, direct drag-and-drop, and racer selector
            </span>
          </div>
        </div>

        {/* Start Simulation CTA Button */}
        <button
          onClick={handleLaunch}
          className="paper-btn bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-[11px] sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1.5 font-black shadow-[3px_4px_0px_#0f172a] shrink-0 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
          <span>START RACE ({activeRacersCount})</span>
        </button>
      </div>

      {/* Main Studio Frame */}
      <div className="flex-1 w-full mt-1.5 sm:mt-2 flex flex-col paper-card bg-white p-2 sm:p-3 overflow-hidden min-h-0 shadow-[4px_5px_0px_#0f172a]">
        {/* Navigation Tabs & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2 gap-1.5 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('track')}
              className={`paper-btn text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1 font-black shrink-0 ${
                activeTab === 'track' ? 'bg-amber-300 text-slate-900' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>1. Track Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`paper-btn text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1 font-black shrink-0 ${
                activeTab === 'roster' ? 'bg-rose-300 text-slate-900' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Racers ({activeRacersCount}/8)</span>
            </button>
            <button
              onClick={() => setActiveTab('sound')}
              className={`paper-btn text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1 font-black shrink-0 ${
                activeTab === 'sound' ? 'bg-indigo-300 text-slate-900' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>3. Synthesizer</span>
            </button>
          </div>
          {/* Circuit Stats Summary */}
          <div className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide hidden md:block">
            {corridors.length} Corridors · {gates.length} Gates · {barriers.length} Barriers · {pickups.length} Pickups
          </div>
        </div>

        {/* TAB 1: VISUAL DRAG-AND-DROP TRACK BUILDER */}
        {activeTab === 'track' && (
          <div className="flex-1 flex flex-col landscape:flex-row lg:flex-row gap-2.5 overflow-hidden min-h-0">
            {/* Outer Stage Wrapper supporting 1:1, 16:9, 4:3, or Full Auto aspect ratio */}
            <div
              ref={canvasStageRef}
              className="relative flex-1 w-full h-full min-h-[160px] min-w-0 flex items-center justify-center bg-slate-200/70 rounded-xl overflow-hidden"
            >
            {/* Interactive SVG Canvas matching chosen aspect ratio (1:1, 16:9, 4:3, or Full) */}
            <div
              ref={canvasContainerRef}
              style={
                fittedEditorBox
                  ? { width: `${fittedEditorBox.w}px`, height: `${fittedEditorBox.h}px` }
                  : undefined
              }
              className={`relative ${
                fittedEditorBox ? '' : 'w-full h-full'
              } bg-[#9bb8e8] border-[3px] border-slate-900 rounded-xl overflow-hidden shadow-md`}
              onWheel={handleCanvasWheel}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasTouchEnd}
              onTouchCancel={handleCanvasTouchEnd}
            >

              {/* Collapsible Canvas Floating Toolbar */}
              {!isToolbarOpen ? (
                <button
                  type="button"
                  onClick={() => setIsToolbarOpen(true)}
                  className="absolute top-2 left-2 z-20 paper-btn bg-white/95 text-xs px-2.5 py-1 font-black text-slate-900 flex items-center gap-1.5 shadow-md hover:bg-slate-100 cursor-pointer"
                  title="Open Tool Bar"
                >
                  <Wrench className="w-3.5 h-3.5 text-slate-700" />
                  <span>TOOLS ({editorMode.toUpperCase()})</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ) : (
                <div className="absolute top-2 left-2 z-20 flex flex-wrap items-center gap-1 bg-white/95 paper-card px-2 py-1 shadow-md border-2 border-slate-900 max-w-[96%]">
                  {/* Close / Hide Toolbar */}
                  <button
                    type="button"
                    onClick={() => setIsToolbarOpen(false)}
                    className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] px-1.5 py-0.5 font-black flex items-center gap-0.5 text-slate-700"
                    title="Hide / Close Tool Bar"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span className="hidden xs:inline">Close</span>
                  </button>
                  <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                  {/* Creation & Placement Tools */}
                  <span className="text-[10px] font-extrabold text-slate-700 mr-0.5">TOOLS:</span>
                  <button
                    type="button"
                    onClick={() => setEditorMode('select')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'select' ? '!bg-amber-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Select & drag corridor blocks, gates, barriers, and finish alcove"
                  >
                    <Move className="w-3 h-3 inline mr-0.5" /> Move
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('draw')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'draw' ? '!bg-emerald-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to stamp new corridor segment"
                  >
                    <Plus className="w-3 h-3 inline mr-0.5" /> +Corridor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('gate')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'gate' ? '!bg-purple-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to place Horizontal Gate (H)"
                  >
                    <Shield className="w-3 h-3 inline mr-0.5" /> +Gate H
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('gate_v')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'gate_v' ? '!bg-purple-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to place Vertical Gate (V)"
                  >
                    <Shield className="w-3 h-3 inline mr-0.5" /> +Gate V
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('barrier')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'barrier' ? '!bg-amber-400 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to drop Horizontal Barrier (↔)"
                  >
                    <Zap className="w-3 h-3 inline mr-0.5 text-amber-600" /> +Bar H
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('barrier_v')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'barrier_v' ? '!bg-amber-400 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to drop Vertical Barrier (↕)"
                  >
                    <Zap className="w-3 h-3 inline mr-0.5 text-amber-600" /> +Bar V
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('pickup')}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'pickup' ? '!bg-rose-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click anywhere to drop cherry pickup item"
                  >
                    🍒 +Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorMode('spawn');
                      clearSelection();
                      setIsSpawnGroupSelected(true);
                      setInspectorTab('track_editor');
                    }}
                    className={`paper-btn text-[10px] px-2 py-0.5 font-bold ${
                      editorMode === 'spawn' ? '!bg-sky-300 !text-slate-950 font-black' : 'bg-slate-100 text-slate-800'
                    }`}
                    title="Click any corridor or point on the map to place the racer spawn zone there"
                  >
                    🏁 +Spawn
                  </button>

                  <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                  {/* Viewport Aspect Ratio Quick Selector (1:1, 16:9, 4:3, Full) */}
                  <span className="text-[10px] font-extrabold text-slate-700 mr-0.5">RATIO:</span>
                  {(['1:1', '16:9', '4:3', 'auto'] as ViewportAspectRatio[]).map(ratio => {
                    const isRatioActive = (layoutConfig.aspectRatio || '4:3') === ratio;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => {
                          pushSnapshot();
                          setLayoutConfig(prev => ({ ...prev, aspectRatio: ratio }));
                        }}
                        className={`paper-btn px-1.5 py-0.5 text-[10px] font-black cursor-pointer ${
                          isRatioActive
                            ? '!bg-amber-300 !text-slate-950'
                            : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                        title={`Set Viewport Aspect Ratio to ${ratio === 'auto' ? 'Full Container' : ratio}`}
                      >
                        {ratio === 'auto' ? 'Full' : ratio}
                      </button>
                    );
                  })}

                  <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                  {/* Canvas View Zoom & Reset Controls */}
                  <span className="text-[10px] font-extrabold text-slate-700 mr-0.5">VIEW:</span>
                  <button
                    type="button"
                    onClick={() => setCanvasZoom(prev => Math.max(0.08, Math.round((prev - 0.15) * 100) / 100))}
                    className="paper-btn bg-white hover:bg-slate-100 px-1.5 py-0.5 text-[10px] font-black flex items-center text-slate-800"
                    title="Zoom Out Canvas"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCanvasZoom(1.0); setCanvasPan({ x: 0, y: 0 }); }}
                    className="paper-btn bg-white hover:bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-800 cursor-pointer"
                    title="Reset Zoom to 100%"
                  >
                    {Math.round(canvasZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasZoom(prev => Math.min(6.0, Math.round((prev + 0.15) * 100) / 100))}
                    className="paper-btn bg-white hover:bg-slate-100 px-1.5 py-0.5 text-[10px] font-black flex items-center text-slate-800"
                    title="Zoom In Canvas"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCanvasZoom(1.0); setCanvasPan({ x: 0, y: 0 }); }}
                    className="paper-btn bg-sky-100 hover:bg-sky-200 px-1.5 py-0.5 text-[10px] font-black text-sky-950"
                    title="Center and Reset Track View"
                  >
                    Reset View
                  </button>

                  <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

                  {/* History & Manual Save System in Toolbar */}
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="paper-btn bg-white hover:bg-slate-100 disabled:opacity-40 px-1.5 py-0.5 text-[10px] font-black flex items-center gap-0.5 text-slate-800"
                    title="Undo last change"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="paper-btn bg-white hover:bg-slate-100 disabled:opacity-40 px-1.5 py-0.5 text-[10px] font-black flex items-center gap-0.5 text-slate-800"
                    title="Redo previous change"
                  >
                    <Redo2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Redo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTrack}
                    className="paper-btn bg-amber-200 hover:bg-amber-300 px-2 py-0.5 text-[10px] font-black flex items-center gap-0.5 text-amber-950"
                    title="Manually save current track to local browser storage"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>

                  {savedSlots.length > 0 && (
                    <PaperDropdown
                      value=""
                      compact
                      resetOnSelect
                      placeholder={`📂 Load (${savedSlots.length})`}
                      className="min-w-[96px]"
                      options={savedSlots.map(s => ({
                        value: s.name,
                        label: s.name,
                        badge: s.date,
                      }))}
                      onChange={(val) => {
                        const slot = savedSlots.find(s => s.name === val);
                        if (slot) handleLoadSavedSlot(slot.data);
                      }}
                    />
                  )}

                  {saveToast && (
                    <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow animate-fade-in">
                      ✓ {saveToast}
                    </span>
                  )}
                </div>
              )}

              {/* SVG Canvas with Dynamic Pan, Zoom, and Exact Container Aspect Ratio */}
              <svg
                ref={svgRef}
                viewBox={dynamicViewBox}
                shapeRendering="optimizeSpeed"
                className={`w-full h-full block select-none touch-none ${
                  editorMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
                }`}
                onPointerDown={handlePointerDownSVG}
                onPointerMove={handlePointerMoveSVG}
                onPointerUp={handlePointerUpSVG}
                onPointerCancel={handlePointerUpSVG}
              >
                <defs>
                  <pattern id="arenaGridPattern" width="32" height="32" patternUnits="userSpaceOnUse">
                    <rect x="2" y="2" width="2.2" height="2.2" fill="#1e3a8a" opacity="0.22" />
                  </pattern>
                </defs>
                {/* Viewport-fitted infinite grid background (avoids 100,000x100,000 SVG pattern rasterization overhead) */}
                <rect
                  ref={gridRectRef}
                  x={viewX - 100}
                  y={viewY - 100}
                  width={viewW + 200}
                  height={viewH + 200}
                  fill="url(#arenaGridPattern)"
                  pointerEvents="none"
                />

                {/* 1. Track Shadow Layer */}
                {corridors.map((c, i) => (
                  <rect key={`sh_${i}`} x={c.x + 4} y={c.y + 5} width={c.w} height={c.h} fill="rgba(15,23,42,0.3)" pointerEvents="none" />
                ))}

                {/* 2. Track Cutout Border */}
                {corridors.map((c, i) => (
                  <rect key={`br_${i}`} x={c.x - 2.5} y={c.y - 2.5} width={c.w + 5} height={c.h + 5} fill="#0f172a" pointerEvents="none" />
                ))}

                {/* 3. Walkable Corridors (Normal or Moving Wall) */}
                {corridors.map((c, i) => {
                  const isSelected = selectedCorridorIdx === i;
                  const hasWall = !!c.hasMovingWall;
                  const wallDir = c.wallDirection || 'right';

                  // Normal = white #f8fafc, Moving Wall corridor = soft cyan tint #e0f2fe
                  const fillColor = isSelected
                    ? '#fef08a'
                    : hasWall ? '#e0f2fe' : '#f8fafc';

                  return (
                    <g key={`cor_${i}`}>
                      <rect
                        x={c.x}
                        y={c.y}
                        width={c.w}
                        height={c.h}
                        fill={fillColor}
                        stroke={isSelected ? '#d97706' : hasWall ? '#0284c7' : '#94a3b8'}
                        strokeWidth={isSelected ? '2.5' : hasWall ? '1.5' : '1'}
                        className={editorMode === 'select' ? "cursor-move transition-colors" : "cursor-crosshair transition-colors"}
                        onPointerDown={(e) => {
                          if (handleItemToolPlacement(e)) return;
                          e.stopPropagation();
                          prepareDragSnapshot();
                          setSelectedCorridorIdx(i);
                          setSelectedGateIdx(null);
                          setSelectedPickupIdx(null);
                          setSelectedBarrierIdx(null);
                          setIsFinishSelected(false);
                          setInspectorTab('track_editor');
                          const { x, y } = getSVGCoords(e);

                          setDragState({
                            type: 'corridor',
                            index: i,
                            startX: x,
                            startY: y,
                            origX: c.x,
                            origY: c.y,
                          });
                        }}
                      />

                      {/* Moving wall indicator badge and directional arrow */}
                      {hasWall && (
                        <g pointerEvents="none" opacity={0.85}>
                          <rect
                            x={c.x + 4}
                            y={c.y + 4}
                            width={58}
                            height={15}
                            rx={3}
                            fill="#0284c7"
                          />
                          <text
                            x={c.x + 33}
                            y={c.y + 15}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            WALL {wallDir.toUpperCase()}
                          </text>
                        </g>
                      )}

                      {isSelected && (
                        <text
                          x={c.x + c.w / 2}
                          y={c.y + c.h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#0f172a"
                          fontSize="10"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          #{i + 1}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 4. Finish Zone Alcove (Draggable, Rotatable & Configurable) */}
                <g
                  transform={`rotate(${finishZone.rotation || 0} ${finishZone.x + finishZone.w / 2} ${finishZone.y + finishZone.h / 2})`}
                  className={editorMode === 'select' ? "cursor-move" : "cursor-crosshair"}
                  onPointerDown={(e) => {
                    if (handleItemToolPlacement(e)) return;
                    e.stopPropagation();
                    prepareDragSnapshot();
                    setIsFinishSelected(true);
                    setSelectedCorridorIdx(null);
                    setSelectedGateIdx(null);
                    setSelectedPickupIdx(null);
                    setSelectedBarrierIdx(null);
                    setInspectorTab('track_editor');
                    const { x, y } = getSVGCoords(e);

                    setDragState({
                      type: 'finish',
                      index: 0,
                      startX: x,
                      startY: y,
                      origX: finishZone.x,
                      origY: finishZone.y,
                    });
                  }}
                >
                  <rect
                    x={finishZone.x}
                    y={finishZone.y}
                    width={finishZone.w}
                    height={finishZone.h}
                    fill={isFinishSelected ? '#86efac' : '#4ade80'}
                    stroke={isFinishSelected ? '#15803d' : '#0f172a'}
                    strokeWidth={isFinishSelected ? '3.5' : '2.5'}
                  />
                  <rect
                    x={finishZone.x}
                    y={finishZone.y + finishZone.h - 14}
                    width={finishZone.w}
                    height={14}
                    fill="#0f172a"
                  />
                  <text
                    x={finishZone.x + finishZone.w / 2}
                    y={finishZone.y + Math.max(12, (finishZone.h - 14) / 2 + 4)}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="10"
                    fontWeight="900"
                    pointerEvents="none"
                  >
                    FINISH{finishZone.rotation ? ` (${finishZone.rotation}°)` : ''}
                  </text>
                  {/* Checkered pattern inside finish line */}
                  {Array.from({ length: 6 }).map((_, cIdx) => (
                    <rect
                      key={`ch_${cIdx}`}
                      x={finishZone.x + cIdx * (finishZone.w / 6)}
                      y={finishZone.y + finishZone.h - 14 + (cIdx % 2 === 0 ? 0 : 7)}
                      width={finishZone.w / 6}
                      height={7}
                      fill="#ffffff"
                      pointerEvents="none"
                    />
                  ))}
                </g>

                {/* 5. Destructible & Key-Locked Gates (Horizontal & Vertical) */}
                {gates.map((g, i) => {
                  const isSelected = selectedGateIdx === i;
                  const keyTeam = g.unlockTeamId ? teamList.find(t => t.id === g.unlockTeamId) : null;
                  const isVert = g.orientation === 'V' || g.h > g.w;
                  return (
                    <g
                      key={`gate_${i}`}
                      className={editorMode === 'select' ? "cursor-move" : "cursor-crosshair"}
                      onPointerDown={(e) => {
                        if (handleItemToolPlacement(e)) return;
                        e.stopPropagation();
                        prepareDragSnapshot();
                        setSelectedGateIdx(i);
                        setSelectedCorridorIdx(null);
                        setSelectedPickupIdx(null);
                        setSelectedBarrierIdx(null);
                        setIsFinishSelected(false);
                        setInspectorTab('track_editor');
                        const { x, y } = getSVGCoords(e);

                        setDragState({
                          type: 'gate',
                          index: i,
                          startX: x,
                          startY: y,
                          origX: g.x,
                          origY: g.y,
                        });
                      }}
                    >
                      <rect
                        x={g.x}
                        y={g.y}
                        width={g.w}
                        height={g.h}
                        fill={keyTeam ? keyTeam.css : `#${g.color.toString(16).padStart(6, '0')}`}
                        stroke={isSelected ? '#ffffff' : '#0f172a'}
                        strokeWidth={isSelected ? '2.5' : '1.8'}
                      />
                      {/* Inner double stripes matching horizontal or vertical orientation */}
                      {isVert ? (
                        <>
                          <line x1={g.x + g.w * 0.35} y1={g.y + 2} x2={g.x + g.w * 0.35} y2={g.y + g.h - 2} stroke="rgba(15,23,42,0.45)" strokeWidth="1.2" pointerEvents="none" />
                          <line x1={g.x + g.w * 0.65} y1={g.y + 2} x2={g.x + g.w * 0.65} y2={g.y + g.h - 2} stroke="rgba(15,23,42,0.45)" strokeWidth="1.2" pointerEvents="none" />
                        </>
                      ) : (
                        <>
                          <line x1={g.x + 2} y1={g.y + g.h * 0.35} x2={g.x + g.w - 2} y2={g.y + g.h * 0.35} stroke="rgba(15,23,42,0.45)" strokeWidth="1.2" pointerEvents="none" />
                          <line x1={g.x + 2} y1={g.y + g.h * 0.65} x2={g.x + g.w - 2} y2={g.y + g.h * 0.65} stroke="rgba(15,23,42,0.45)" strokeWidth="1.2" pointerEvents="none" />
                        </>
                      )}
                      {keyTeam && (
                        <text
                          x={g.x + g.w / 2}
                          y={g.y + g.h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#0f172a"
                          fontSize="9"
                          fontWeight="900"
                          pointerEvents="none"
                        >
                          🔑 {keyTeam.name.slice(0, 3)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 6. Static and Moving Barriers (Horizontal & Vertical) */}
                {barriers.map((b, i) => {
                  const isSelected = selectedBarrierIdx === i;
                  const isVert = b.h > b.w;
                  return (
                    <g
                      key={`barr_${i}`}
                      className={editorMode === 'select' ? "cursor-move" : "cursor-crosshair"}
                      onPointerDown={(e) => {
                        if (handleItemToolPlacement(e)) return;
                        e.stopPropagation();
                        prepareDragSnapshot();
                        setSelectedBarrierIdx(i);
                        setSelectedCorridorIdx(null);
                        setSelectedGateIdx(null);
                        setSelectedPickupIdx(null);
                        setIsFinishSelected(false);
                        setInspectorTab('track_editor');
                        const { x, y } = getSVGCoords(e);
                        setDragState({
                          type: 'barrier',
                          index: i,
                          startX: x,
                          startY: y,
                          origX: b.x,
                          origY: b.y,
                        });
                      }}
                    >
                      <rect
                        x={b.x}
                        y={b.y}
                        width={b.w}
                        height={b.h}
                        fill={b.movement === 'static' ? '#334155' : '#f59e0b'}
                        stroke={isSelected ? '#38bdf8' : '#0f172a'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        rx={2}
                      />
                      <text
                        x={b.x + b.w / 2}
                        y={b.y + b.h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {b.movement === 'static' ? (isVert ? '↕ BAR' : 'BARRIER') : (
                          b.movement === 'horizontal' ? '↔' :
                          b.movement === 'vertical' ? '↕' :
                          b.movement === 'diagonal_up' ? '↗' : '↘'
                        )}
                      </text>
                    </g>
                  );
                })}

                {/* 7. Pickups */}
                {pickups.map((p, i) => {
                  const isSelected = selectedPickupIdx === i;
                  return (
                    <circle
                      key={`pick_${i}`}
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      fill={p.type === 'knife' ? '#f1f5f9' : '#ef4444'}
                      stroke={isSelected ? '#facc15' : '#0f172a'}
                      strokeWidth="2"
                      className={editorMode === 'select' ? "cursor-move" : "cursor-crosshair"}
                      onPointerDown={(e) => {
                        if (handleItemToolPlacement(e)) return;
                        e.stopPropagation();
                        prepareDragSnapshot();
                        setSelectedPickupIdx(i);
                        setSelectedCorridorIdx(null);
                        setSelectedGateIdx(null);
                        setSelectedBarrierIdx(null);
                        setIsFinishSelected(false);
                        setInspectorTab('track_editor');
                        const { x, y } = getSVGCoords(e);

                        setDragState({
                          type: 'pickup',
                          index: i,
                          startX: x,
                          startY: y,
                          origX: p.x,
                          origY: p.y,
                        });
                      }}
                    />
                  );
                })}

                {/* 7b. Interactive Racer Spawn Zone & Individual Racer Spawn Points */}
                {baySpawns.length > 0 && (
                  <g>
                    {/* Spawn Zone Group Outline & Draggable Header Handle */}
                    <rect
                      x={spawnBounds.minX}
                      y={spawnBounds.minY}
                      width={Math.max(36, spawnBounds.maxX - spawnBounds.minX)}
                      height={Math.max(36, spawnBounds.maxY - spawnBounds.minY)}
                      fill={isSpawnGroupSelected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.05)'}
                      stroke={isSpawnGroupSelected ? '#0284c7' : '#0369a1'}
                      strokeWidth={isSpawnGroupSelected ? '2.2' : '1.5'}
                      strokeDasharray="5 4"
                      rx="6"
                      pointerEvents="none"
                    />

                    {/* Group Drag Pill Handle: Dragging this moves ALL racer spawns together */}
                    <g
                      className="cursor-move"
                      onPointerDown={(e) => {
                        if (handleItemToolPlacement(e)) return;
                        e.stopPropagation();
                        prepareDragSnapshot();
                        clearSelection();
                        setIsSpawnGroupSelected(true);
                        setInspectorTab('track_editor');
                        const { x, y } = getSVGCoords(e);
                        setDragState({
                          type: 'spawn_group',
                          index: 0,
                          startX: x,
                          startY: y,
                          origX: spawnBounds.cx,
                          origY: spawnBounds.cy,
                          origSpawns: JSON.parse(JSON.stringify(baySpawns)),
                        });
                      }}
                    >
                      <rect
                        x={spawnBounds.minX}
                        y={spawnBounds.minY - 19}
                        width={106}
                        height={17}
                        rx={4}
                        fill={isSpawnGroupSelected ? '#0284c7' : '#0f172a'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x={spawnBounds.minX + 53}
                        y={spawnBounds.minY - 7.5}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight="900"
                        letterSpacing="0.3"
                        pointerEvents="none"
                      >
                        🏁 SPAWNS (DRAG ALL)
                      </text>
                    </g>

                    {/* Individual Racer Spawn Markers */}
                    {baySpawns.map((sp, i) => {
                      const team = teamList.find(t => t.id === sp.teamId) || teamList[i % teamList.length];
                      const isRacerActive = team ? team.enabled !== false : true;
                      const isThisSelected = selectedSpawnIdx === i;
                      const vLen = Math.hypot(sp.vx, sp.vy) || 1;
                      const arrowX = sp.x + (sp.vx / vLen) * 16;
                      const arrowY = sp.y + (sp.vy / vLen) * 16;

                      return (
                        <g
                          key={`spawn_${i}`}
                          opacity={isRacerActive ? 1 : 0.38}
                          className={editorMode === 'select' ? 'cursor-move' : 'cursor-crosshair'}
                          onPointerDown={(e) => {
                            if (handleItemToolPlacement(e)) return;
                            e.stopPropagation();
                            prepareDragSnapshot();
                            clearSelection();
                            setSelectedSpawnIdx(i);
                            setInspectorTab('track_editor');
                            const { x, y } = getSVGCoords(e);
                            setDragState({
                              type: 'spawn',
                              index: i,
                              startX: x,
                              startY: y,
                              origX: sp.x,
                              origY: sp.y,
                            });
                          }}
                        >
                          {/* Launch velocity direction line */}
                          <line
                            x1={sp.x}
                            y1={sp.y}
                            x2={arrowX}
                            y2={arrowY}
                            stroke={isThisSelected ? '#facc15' : '#0f172a'}
                            strokeWidth="2"
                            pointerEvents="none"
                          />
                          <circle
                            cx={arrowX}
                            cy={arrowY}
                            r="2.2"
                            fill={isThisSelected ? '#facc15' : '#0f172a'}
                            pointerEvents="none"
                          />

                          {/* Selection Halo */}
                          {(isThisSelected || isSpawnGroupSelected) && (
                            <rect
                              x={sp.x - 10.5}
                              y={sp.y - 10.5}
                              width={21}
                              height={21}
                              rx={team?.shape === 'circle' ? 11 : 4}
                              fill="none"
                              stroke={isThisSelected ? '#facc15' : '#38bdf8'}
                              strokeWidth="2.2"
                              pointerEvents="none"
                            />
                          )}

                          {/* Racer Spawn Body */}
                          <rect
                            x={sp.x - 8}
                            y={sp.y - 8}
                            width={16}
                            height={16}
                            rx={team?.shape === 'circle' ? 8 : team?.shape === 'rounded' ? 4 : 1.5}
                            fill={team?.css || '#22d3ee'}
                            stroke="#0f172a"
                            strokeWidth="1.8"
                          />

                          {/* Mini Paper-Craft Eyes */}
                          <rect x={sp.x - 4.5} y={sp.y - 3} width={3.2} height={3.2} fill="#ffffff" stroke="#0f172a" strokeWidth="0.7" pointerEvents="none" />
                          <rect x={sp.x + 1.3} y={sp.y - 3} width={3.2} height={3.2} fill="#ffffff" stroke="#0f172a" strokeWidth="0.7" pointerEvents="none" />
                          <rect x={sp.x - 3.3} y={sp.y - 2} width={1.5} height={1.5} fill="#0f172a" pointerEvents="none" />
                          <rect x={sp.x + 2.5} y={sp.y - 2} width={1.5} height={1.5} fill="#0f172a" pointerEvents="none" />

                          {/* Spawn Slot Number Badge */}
                          <text
                            x={sp.x}
                            y={sp.y + 6.2}
                            textAnchor="middle"
                            fill="#0f172a"
                            fontSize="6.5"
                            fontWeight="900"
                            pointerEvents="none"
                          >
                            {i + 1}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* 8. Camera Field-Of-View Dotted Preview Outline */}
                <g pointerEvents="none" opacity={0.88}>
                  {/* Dotted border of camera field-of-view */}
                  <rect
                    x={camPreviewRect.x}
                    y={camPreviewRect.y}
                    width={camPreviewRect.w}
                    height={camPreviewRect.h}
                    fill="rgba(2, 132, 199, 0.04)"
                    stroke="#0284c7"
                    strokeWidth="2.5"
                    strokeDasharray="8 6"
                    rx="8"
                  />
                  {/* Corner bracket accents */}
                  <path
                    d={`M ${camPreviewRect.x} ${camPreviewRect.y + 24} L ${camPreviewRect.x} ${camPreviewRect.y} L ${camPreviewRect.x + 24} ${camPreviewRect.y}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.5"
                  />
                  <path
                    d={`M ${camPreviewRect.x + camPreviewRect.w - 24} ${camPreviewRect.y} L ${camPreviewRect.x + camPreviewRect.w} ${camPreviewRect.y} L ${camPreviewRect.x + camPreviewRect.w} ${camPreviewRect.y + 24}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.5"
                  />
                  <path
                    d={`M ${camPreviewRect.x} ${camPreviewRect.y + camPreviewRect.h - 24} L ${camPreviewRect.x} ${camPreviewRect.y + camPreviewRect.h} L ${camPreviewRect.x + 24} ${camPreviewRect.y + camPreviewRect.h}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.5"
                  />
                  <path
                    d={`M ${camPreviewRect.x + camPreviewRect.w - 24} ${camPreviewRect.y + camPreviewRect.h} L ${camPreviewRect.x + camPreviewRect.w} ${camPreviewRect.y + camPreviewRect.h} L ${camPreviewRect.x + camPreviewRect.w} ${camPreviewRect.y + camPreviewRect.h - 24}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="3.5"
                  />
                  {/* Camera FOV Badge */}
                  <rect
                    x={camPreviewRect.x + 6}
                    y={camPreviewRect.y + 6}
                    width={124}
                    height={19}
                    rx={4}
                    fill="#0284c7"
                  />
                  <text
                    x={camPreviewRect.x + 68}
                    y={camPreviewRect.y + 19}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="900"
                    letterSpacing="0.4"
                  >
                    🎥 CAM FOV ({Math.round(camPreviewRect.zoom * 100)}%)
                  </text>
                  {/* Crosshair at center */}
                  <circle cx={previewCamCenter.x} cy={previewCamCenter.y} r="3" fill="#0284c7" />
                  <line
                    x1={previewCamCenter.x - 14}
                    y1={previewCamCenter.y}
                    x2={previewCamCenter.x + 14}
                    y2={previewCamCenter.y}
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1={previewCamCenter.x}
                    y1={previewCamCenter.y - 14}
                    x2={previewCamCenter.x}
                    y2={previewCamCenter.y + 14}
                    stroke="#0284c7"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </g>
              </svg>
            </div>
            </div>

            {/* Properties & Object Browser Inspector: Docked right in landscape/desktop, adjustable bottom drawer in portrait */}
            <div
              className={`w-full landscape:w-80 lg:w-88 xl:w-96 flex flex-col overflow-hidden bg-slate-50 border-2 border-slate-900 rounded-lg p-2 sm:p-2.5 shadow-sm shrink-0 transition-all duration-200 ${
                portraitDrawerMode === 'collapsed'
                  ? 'h-[40px]'
                  : portraitDrawerMode === 'compact'
                  ? 'h-[42%]'
                  : 'h-[62%]'
              } landscape:h-full lg:h-full`}
            >
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-2 shrink-0 gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-black uppercase text-slate-800 truncate">
                    Track Inspector
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 truncate hidden xs:inline">
                    ({corridors.length}C · {gates.length}G · {pickups.length}P)
                  </span>
                </div>
                {/* Portrait Drawer Size Toggle */}
                <div className="flex items-center gap-1 landscape:hidden lg:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setPortraitDrawerMode(prev =>
                        prev === 'collapsed' ? 'compact' : prev === 'compact' ? 'expanded' : 'collapsed'
                      )
                    }
                    className="paper-btn bg-white hover:bg-slate-100 text-[9px] px-1.5 py-0.5 font-black text-slate-700 flex items-center gap-0.5"
                    title="Cycle Inspector Drawer Height in Portrait"
                  >
                    {portraitDrawerMode === 'collapsed' ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Expand
                      </>
                    ) : portraitDrawerMode === 'compact' ? (
                      <>
                        <ChevronUp className="w-3 h-3" /> Full
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" /> Minimize
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Inspector Navigation Tabs: 'track_editor' | 'preset_tile' | 'cam' | 'layout' */}
              <div className="grid grid-cols-4 gap-1 bg-slate-200/90 p-1 rounded-md border border-slate-300 mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInspectorTab('track_editor')}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[9.5px] sm:text-[10px] font-black cursor-pointer select-none uppercase tracking-tight transition-colors ${
                    inspectorTab === 'track_editor'
                      ? 'bg-amber-300 text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Element properties and object browser"
                >
                  <Sliders className="w-3 h-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('preset_tile')}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[9.5px] sm:text-[10px] font-black cursor-pointer select-none uppercase tracking-tight transition-colors ${
                    inspectorTab === 'preset_tile'
                      ? 'bg-amber-300 text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Preset circuits, stamp elements, and JSON backup"
                >
                  <Package className="w-3 h-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">presets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('cam')}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[9.5px] sm:text-[10px] font-black cursor-pointer select-none uppercase tracking-tight transition-colors ${
                    inspectorTab === 'cam'
                      ? 'bg-amber-300 text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="In-game camera system configuration"
                >
                  <Camera className="w-3 h-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">cam</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('layout')}
                  className={`flex items-center justify-center gap-1 py-1 rounded text-[9.5px] sm:text-[10px] font-black cursor-pointer select-none uppercase tracking-tight transition-colors ${
                    inspectorTab === 'layout'
                      ? 'bg-amber-300 text-slate-950 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Configure Simulation Scene Layout (Title, Timer, Arena Ratio, Racers List)"
                >
                  <Layout className="w-3 h-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">layout</span>
                </button>
              </div>

              {/* TAB CONTENT: PRESET TILE */}
              {inspectorTab === 'preset_tile' && (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {/* Preset Maps List */}
                  <div className="paper-card bg-amber-50/90 p-2 border border-slate-400 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                        Preset Circuits
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">Quick Load</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(MAP_CLASSIC_SERPENTINE)}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          mapName === MAP_CLASSIC_SERPENTINE.name ? 'bg-emerald-200 text-slate-950 font-black' : 'bg-white hover:bg-slate-100 text-slate-800'
                        }`}
                        title="Load Circuit 1: Serpentine Tower"
                      >
                        1. Serpentine
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(MAP_DOUBLE_HELIX)}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          mapName === MAP_DOUBLE_HELIX.name ? 'bg-sky-200 text-slate-950 font-black' : 'bg-white hover:bg-slate-100 text-slate-800'
                        }`}
                        title="Load Circuit 2: Whirlpool Spiral"
                      >
                        2. Spiral
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(MAP_ARENA_GAUNTLET)}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          mapName === MAP_ARENA_GAUNTLET.name ? 'bg-amber-200 text-slate-950 font-black' : 'bg-white hover:bg-slate-100 text-slate-800'
                        }`}
                        title="Load Circuit 3: Crossfire Citadel"
                      >
                        3. Citadel
                      </button>
                    </div>
                  </div>

                  {/* Stamp Preset Tiles Palette */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                        Stamp Preset Tiles
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">Click to place</span>
                    </div>

                    <span className="text-[9px] font-bold text-slate-500 uppercase block pt-0.5">Corridors:</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddCorridor(undefined, undefined, 90, 60, false)}
                        className="paper-btn bg-emerald-50 hover:bg-emerald-100 text-[10px] py-1 font-bold text-emerald-950 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Normal Track
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCorridor(undefined, undefined, 70, 160, true, 'up')}
                        className="paper-btn bg-sky-50 hover:bg-sky-100 text-[10px] py-1 font-bold text-sky-950 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Moving Wall
                      </button>
                    </div>

                    <span className="text-[9px] font-bold text-slate-500 uppercase block pt-1">Barriers (Horizontal & Vertical):</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddBarrier(undefined, undefined, 60, 16, 'static')}
                        className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] py-1 font-bold text-slate-800 flex items-center justify-center gap-1"
                      >
                        <Shield className="w-3 h-3" /> Static Bar (H) ↔
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBarrier(undefined, undefined, 16, 60, 'static')}
                        className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] py-1 font-bold text-slate-800 flex items-center justify-center gap-1"
                      >
                        <Shield className="w-3 h-3" /> Static Bar (V) ↕
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBarrier(undefined, undefined, 60, 16, 'horizontal')}
                        className="paper-btn bg-amber-50 hover:bg-amber-100 text-[10px] py-1 font-bold text-amber-950 flex items-center justify-center gap-1"
                      >
                        <Move className="w-3 h-3" /> Moving Bar (H) ↔
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBarrier(undefined, undefined, 16, 60, 'vertical')}
                        className="paper-btn bg-amber-50 hover:bg-amber-100 text-[10px] py-1 font-bold text-amber-950 flex items-center justify-center gap-1"
                      >
                        <Move className="w-3 h-3" /> Moving Bar (V) ↕
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBarrier(undefined, undefined, 45, 16, 'diagonal_up')}
                        className="paper-btn bg-amber-50 hover:bg-amber-100 text-[10px] py-1 font-bold text-amber-950 flex items-center justify-center gap-1 col-span-2"
                      >
                        <Move className="w-3 h-3" /> Diagonal Barrier ↗
                      </button>
                    </div>

                    <span className="text-[9px] font-bold text-slate-500 uppercase block pt-1">Gates (H & V) & Pickups:</span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddGate(undefined, undefined, 70, 14, 'H')}
                        className="paper-btn bg-purple-50 hover:bg-purple-100 text-[10px] py-1 font-bold text-purple-950 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Gate (H) ↔
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddGate(undefined, undefined, 14, 70, 'V')}
                        className="paper-btn bg-purple-50 hover:bg-purple-100 text-[10px] py-1 font-bold text-purple-950 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Gate (V) ↕
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPickup('cherry_clone')}
                        className="paper-btn bg-rose-50 hover:bg-rose-100 text-[10px] py-1 font-bold text-rose-950 flex items-center justify-center gap-1"
                      >
                        🍒 +Cherry
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPickup('star_dash')}
                        className="paper-btn bg-yellow-50 hover:bg-yellow-100 text-[10px] py-1 font-bold text-yellow-950 flex items-center justify-center gap-1"
                      >
                        ⭐ +Star Dash
                      </button>
                    </div>
                  </div>

                  {/* Circuit File Backup */}
                  <div className="paper-card bg-slate-100 p-2 border border-slate-300 space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider block">
                      Import & Export Circuit
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="paper-btn bg-white hover:bg-slate-100 text-[10px] py-1 flex items-center justify-center gap-1 font-bold text-slate-800"
                        title="Export circuit as JSON file"
                      >
                        <Download className="w-3 h-3" /> Export JSON
                      </button>
                      <label className="paper-btn bg-white hover:bg-slate-100 text-[10px] py-1 flex items-center justify-center gap-1 font-bold text-slate-800 cursor-pointer">
                        <Upload className="w-3 h-3" /> Import JSON
                        <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: CAM */}
              {inspectorTab === 'cam' && (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  <div className="paper-card bg-sky-50/90 p-2 border-2 border-sky-800 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-sky-950 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-sky-700" />
                        In-Game Camera Mode
                      </span>
                      <span className="bg-sky-200 text-sky-900 px-1 rounded text-[9px] font-black">
                        LOCKED IN RACE
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {([
                        {
                          type: 'auto_moving' as CameraType,
                          title: 'Auto Moving Cam',
                          desc: 'Follows advancing order of moving walls automatically.',
                          icon: Video,
                        },
                        {
                          type: 'selected_racer' as CameraType,
                          title: 'Selected Racer Cam',
                          desc: 'Smoothly centers and follows designated racer or leader.',
                          icon: Users,
                        },
                        {
                          type: 'manual' as CameraType,
                          title: 'Manual Pan & Zoom',
                          desc: 'Player drags canvas to pan and scrolls/uses buttons to zoom.',
                          icon: Move,
                        },
                      ]).map(opt => {
                        const isSelected = (cameraConfig?.type || 'auto_moving') === opt.type;
                        const Icon = opt.icon;
                        return (
                          <div
                            key={opt.type}
                            onClick={() => {
                              pushSnapshot();
                              setCameraConfig(prev => ({ ...prev, type: opt.type }));
                            }}
                            className={`p-2 rounded-lg border-2 cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-sky-500 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-black text-[11px] flex items-center gap-1">
                                <Icon className="w-3.5 h-3.5" />
                                {opt.title}
                              </span>
                              {isSelected && <span className="text-[10px] font-bold">✓ Active</span>}
                            </div>
                            <span className={`text-[10px] leading-tight block ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                              {opt.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* If Selected Racer mode, choose target racer */}
                  {cameraConfig.type === 'selected_racer' && (
                    <div className="paper-card bg-amber-50 p-2 border border-amber-400 space-y-1.5">
                      <span className="text-[11px] font-black text-amber-950 uppercase block">
                        Target Racer / Subject
                      </span>
                      <PaperDropdown
                        value={cameraConfig.targetRacerId || 'leader'}
                        options={[
                          {
                            value: 'leader',
                            label: '🏆 Race Leader',
                            badge: 'AUTO',
                            subtitle: 'Automatically tracks 1st place racer',
                          },
                          ...teamList.map(t => ({
                            value: t.id,
                            label: `${t.name} Racer`,
                            colorSwatch: t.css,
                            badge: t.enabled !== false ? 'ACTIVE' : 'OFF',
                          })),
                        ]}
                        onChange={(val) => {
                          setCameraConfig(prev => ({ ...prev, targetRacerId: val }));
                        }}
                      />
                      <span className="text-[9px] text-amber-800 block">
                        Camera stays centered on this racer, or gracefully transfers to current leader if eliminated.
                      </span>
                    </div>
                  )}

                  {/* Zoom Configuration */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <span className="text-[11px] font-black text-slate-800 uppercase block">
                      Zoom & Scale Range
                    </span>

                    <NumberStepper
                      label="Default Zoom Level"
                      unit="×"
                      value={Math.round((cameraConfig.defaultZoom || 1.0) * 100) / 100}
                      min={0.4}
                      max={2.5}
                      step={0.1}
                      onChange={(val) => setCameraConfig(prev => ({ ...prev, defaultZoom: val }))}
                    />
                    <input
                      type="range"
                      min="0.4"
                      max="2.5"
                      step="0.05"
                      value={cameraConfig.defaultZoom || 1.0}
                      onPointerDown={prepareDragSnapshot}
                      onChange={(e) => {
                        const val = Math.round(parseFloat(e.target.value) * 100) / 100;
                        setCameraConfig(prev => ({ ...prev, defaultZoom: val }));
                      }}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((presetZoom) => {
                        const isActiveZoom = Math.abs((cameraConfig.defaultZoom || 1.0) - presetZoom) < 0.03;
                        return (
                          <button
                            key={presetZoom}
                            type="button"
                            onClick={() => {
                              pushSnapshot();
                              setCameraConfig(prev => ({ ...prev, defaultZoom: presetZoom }));
                            }}
                            className={`flex-1 py-0.5 text-[10px] font-black rounded border transition-colors cursor-pointer ${
                              isActiveZoom
                                ? 'bg-sky-500 text-white border-slate-900 shadow-2xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {presetZoom}×
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <NumberStepper
                        label="Min Zoom Limit"
                        unit="×"
                        value={Math.round((cameraConfig.minZoom || 0.4) * 10) / 10}
                        min={0.2}
                        max={1.0}
                        step={0.1}
                        onChange={(val) => setCameraConfig(prev => ({ ...prev, minZoom: val }))}
                      />
                      <NumberStepper
                        label="Max Zoom Limit"
                        unit="×"
                        value={Math.round((cameraConfig.maxZoom || 2.5) * 10) / 10}
                        min={1.2}
                        max={3.5}
                        step={0.1}
                        onChange={(val) => setCameraConfig(prev => ({ ...prev, maxZoom: val }))}
                      />
                    </div>
                  </div>

                  {/* Camera Smoothness */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <span className="text-[11px] font-black text-slate-800 uppercase block">
                      Motion Smoothing (Lerp)
                    </span>
                    <NumberStepper
                      label="Camera Follow Smoothness"
                      unit="spd"
                      value={Math.round((cameraConfig.smoothSpeed || 4.5) * 10) / 10}
                      min={1.0}
                      max={12.0}
                      step={0.5}
                      onChange={(val) => setCameraConfig(prev => ({ ...prev, smoothSpeed: val }))}
                    />
                    <input
                      type="range"
                      min="1.0"
                      max="12.0"
                      step="0.5"
                      value={cameraConfig.smoothSpeed || 4.5}
                      onPointerDown={prepareDragSnapshot}
                      onChange={(e) => setCameraConfig(prev => ({ ...prev, smoothSpeed: parseFloat(e.target.value) }))}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block">
                      Exponential damping interpolation guarantees jitter-free, cinematic tracking.
                    </span>
                  </div>

                  {/* Reset Camera Defaults */}
                  <button
                    type="button"
                    onClick={() => {
                      pushSnapshot();
                      setCameraConfig({ ...DEFAULT_CAMERA_CONFIG });
                    }}
                    className="paper-btn bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] py-1 font-bold w-full"
                  >
                    Reset Camera to Defaults
                  </button>
                </div>
              )}

              {/* TAB CONTENT: SIMULATION SCENE LAYOUT */}
              {inspectorTab === 'layout' && (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  <div className="paper-card bg-violet-50 p-2 border-2 border-violet-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-violet-950 uppercase flex items-center gap-1">
                        <Layout className="w-3.5 h-3.5 text-violet-700" />
                        Simulation Scene Layout
                      </span>
                      <span className="text-[10px] bg-violet-200 text-violet-900 px-1.5 py-0.5 rounded font-bold">
                        HUD & Viewport
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-snug">
                      Customize the Simulation Scene HUD: Title, Timer, Arena Aspect Ratio (1:1, 16:9, 4:3, Full), Theme, and Racers List position & style.
                    </p>
                  </div>

                  {/* Interactive Mini Preview of Simulation Scene Layout */}
                  <div className="paper-card bg-slate-900 text-white p-2 border-2 border-slate-950 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <span>Live Layout Preview</span>
                      <span className="text-violet-300">
                        Ratio: {layoutConfig.aspectRatio === 'auto' ? 'Full Screen' : layoutConfig.aspectRatio}
                      </span>
                    </div>
                    <div className="bg-amber-50/95 text-slate-900 rounded border border-slate-700 p-1.5 space-y-1">
                      {/* Preview Top Header */}
                      <div className="flex items-center justify-between bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[8px] font-black">
                        <div className="flex items-center gap-1">
                          {layoutConfig.showTitle && layoutConfig.titlePosition === 'left' && (
                            <span className="bg-amber-300 px-1 rounded border border-slate-800 truncate max-w-[85px]">
                              {layoutConfig.customTitle?.trim() || mapName || 'TITLE'}
                            </span>
                          )}
                          {layoutConfig.showTimer && layoutConfig.timerPosition === 'left' && (
                            <span className="bg-slate-800 text-white px-1 rounded font-mono">⏱ 00:12.4</span>
                          )}
                        </div>
                        {layoutConfig.showTitle && layoutConfig.titlePosition === 'center' && (
                          <span className="bg-amber-300 px-1 rounded border border-slate-800 truncate max-w-[95px]">
                            {layoutConfig.customTitle?.trim() || mapName || 'TITLE'}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {layoutConfig.showTitle && layoutConfig.titlePosition === 'right' && (
                            <span className="bg-amber-300 px-1 rounded border border-slate-800 truncate max-w-[85px]">
                              {layoutConfig.customTitle?.trim() || mapName || 'TITLE'}
                            </span>
                          )}
                          {layoutConfig.showTimer && layoutConfig.timerPosition === 'right' && (
                            <span className="bg-slate-800 text-white px-1 rounded font-mono">⏱ 00:12.4</span>
                          )}
                        </div>
                      </div>

                      {/* Preview Racers List (Top) */}
                      {layoutConfig.showRacersList && layoutConfig.racersListPosition === 'top' && (
                        <div className="grid grid-cols-4 gap-0.5 bg-white border border-slate-300 rounded p-0.5">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-2 rounded-xs bg-slate-200 flex items-center px-0.5 gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                              <span className="text-[6px] font-black text-slate-700">#{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Preview Arena Box */}
                      <div className="flex items-center justify-center py-1 bg-slate-200/70 rounded border border-dashed border-slate-400">
                        <div
                          className={`rounded border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-xs transition-all ${
                            layoutConfig.arenaTheme === 'midnight'
                              ? 'bg-slate-800'
                              : layoutConfig.arenaTheme === 'emerald'
                              ? 'bg-emerald-600'
                              : layoutConfig.arenaTheme === 'sunset'
                              ? 'bg-amber-600'
                              : layoutConfig.arenaTheme === 'violet'
                              ? 'bg-violet-600'
                              : 'bg-sky-500'
                          }`}
                          style={{
                            width:
                              layoutConfig.aspectRatio === '1:1'
                                ? 44
                                : layoutConfig.aspectRatio === '4:3'
                                ? 56
                                : layoutConfig.aspectRatio === '16:9'
                                ? 68
                                : 84,
                            height: 40,
                          }}
                        >
                          ARENA ({layoutConfig.aspectRatio === 'auto' ? 'FULL' : layoutConfig.aspectRatio})
                        </div>
                      </div>

                      {/* Preview Racers List (Bottom) */}
                      {layoutConfig.showRacersList && layoutConfig.racersListPosition === 'bottom' && (
                        <div className="grid grid-cols-4 gap-0.5 bg-white border border-slate-300 rounded p-0.5">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-2 rounded-xs bg-slate-200 flex items-center px-0.5 gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                              <span className="text-[6px] font-black text-slate-700">#{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. Arena Viewport Aspect Ratio (Fixes long portrait viewport) */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-800 uppercase">
                        1. Arena Viewport Aspect Ratio
                      </span>
                      <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                        Portrait & Landscape
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Choose a fixed frame ratio so portrait mode isn't too tall, or Full to stretch across the container.
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {([
                        { id: '1:1', label: '1:1', desc: 'Square' },
                        { id: '16:9', label: '16:9', desc: 'Wide' },
                        { id: '4:3', label: '4:3', desc: 'Classic' },
                        { id: 'auto', label: 'Full', desc: 'Stretch' },
                      ] as { id: ViewportAspectRatio; label: string; desc: string }[]).map((opt) => {
                        const active = layoutConfig.aspectRatio === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              pushSnapshot();
                              setLayoutConfig(prev => ({ ...prev, aspectRatio: opt.id }));
                            }}
                            className={`paper-btn py-1.5 px-1 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                              active
                                ? '!bg-violet-600 !text-white !border-slate-950'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span className="text-[11px] font-black">{opt.label}</span>
                            <span className={`text-[8px] font-bold ${active ? 'text-violet-200' : 'text-slate-500'}`}>
                              {opt.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Title Configuration */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-800 uppercase">
                        2. Race Title Banner
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushSnapshot();
                          setLayoutConfig(prev => ({ ...prev, showTitle: !prev.showTitle }));
                        }}
                        className={`paper-btn px-2 py-0.5 text-[10px] font-black flex items-center gap-1 cursor-pointer ${
                          layoutConfig.showTitle ? 'bg-emerald-300 text-slate-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {layoutConfig.showTitle ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {layoutConfig.showTitle ? 'Shown' : 'Hidden'}
                      </button>
                    </div>

                    {layoutConfig.showTitle && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-100">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Custom Simulation Title (Leave empty to use Track Title)
                          </label>
                          <input
                            type="text"
                            value={layoutConfig.customTitle || ''}
                            placeholder={mapName || 'Enter custom simulation title...'}
                            onFocus={prepareDragSnapshot}
                            onChange={(e) => {
                              if (!dragSnapshotCommittedRef.current && pendingDragSnapshotRef.current) {
                                setUndoStack(prev => [...prev.slice(-25), pendingDragSnapshotRef.current!]);
                                setRedoStack([]);
                                dragSnapshotCommittedRef.current = true;
                              }
                              setLayoutConfig(prev => ({ ...prev, customTitle: e.target.value }));
                            }}
                            className="w-full px-2 py-1 text-xs font-bold bg-slate-50 border-2 border-slate-800 rounded focus:outline-none focus:bg-white"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-600 block mb-1">
                            Title Alignment in Header
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {(['left', 'center', 'right'] as const).map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => {
                                  pushSnapshot();
                                  setLayoutConfig(prev => ({ ...prev, titlePosition: pos }));
                                }}
                                className={`paper-btn py-1 text-[10px] font-black uppercase cursor-pointer ${
                                  layoutConfig.titlePosition === pos
                                    ? '!bg-violet-600 !text-white'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Live Race Timer Configuration */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-800 uppercase">
                        3. Live Race Timer
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushSnapshot();
                          setLayoutConfig(prev => ({ ...prev, showTimer: !prev.showTimer }));
                        }}
                        className={`paper-btn px-2 py-0.5 text-[10px] font-black flex items-center gap-1 cursor-pointer ${
                          layoutConfig.showTimer ? 'bg-emerald-300 text-slate-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {layoutConfig.showTimer ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {layoutConfig.showTimer ? 'Shown' : 'Hidden'}
                      </button>
                    </div>

                    {layoutConfig.showTimer && (
                      <div className="pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-600 block mb-1">
                          Timer Position
                        </span>
                        <div className="grid grid-cols-2 gap-1">
                          {(['left', 'right'] as const).map((pos) => (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => {
                                pushSnapshot();
                                setLayoutConfig(prev => ({ ...prev, timerPosition: pos }));
                              }}
                              className={`paper-btn py-1 text-[10px] font-black uppercase cursor-pointer ${
                                layoutConfig.timerPosition === pos
                                  ? '!bg-violet-600 !text-white'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pos} Side
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Arena Theme & Padding */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <span className="text-[11px] font-black text-slate-800 uppercase block">
                      4. Arena Canvas Theme & Frame Padding
                    </span>

                    <div>
                      <span className="text-[10px] font-bold text-slate-600 block mb-1">
                        Arena Background Theme
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {([
                          { id: 'classic_blue', label: 'Blue', swatch: '#4895ef' },
                          { id: 'midnight', label: 'Dark', swatch: '#1e293b' },
                          { id: 'emerald', label: 'Green', swatch: '#059669' },
                          { id: 'sunset', label: 'Amber', swatch: '#d97706' },
                          { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
                        ] as const).map((theme) => {
                          const active = layoutConfig.arenaTheme === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => {
                                pushSnapshot();
                                setLayoutConfig(prev => ({ ...prev, arenaTheme: theme.id }));
                              }}
                              className={`paper-btn py-1 px-1 flex flex-col items-center gap-0.5 cursor-pointer ${
                                active ? '!bg-slate-900 !text-white' : 'bg-slate-50 text-slate-800'
                              }`}
                            >
                              <span
                                className="w-4 h-3 rounded-xs border border-slate-900"
                                style={{ backgroundColor: theme.swatch }}
                              />
                              <span className="text-[8px] font-black">{theme.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-600 block mb-1">
                        Arena Outer Frame Padding
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['compact', 'normal', 'spacious'] as const).map((pad) => (
                          <button
                            key={pad}
                            type="button"
                            onClick={() => {
                              pushSnapshot();
                              setLayoutConfig(prev => ({ ...prev, arenaPadding: pad }));
                            }}
                            className={`paper-btn py-1 text-[10px] font-black capitalize cursor-pointer ${
                              layoutConfig.arenaPadding === pad
                                ? '!bg-violet-600 !text-white'
                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pad}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. Racers List / Leaderboard Layout */}
                  <div className="paper-card bg-white p-2 border border-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-800 uppercase">
                        5. Racers List (Leaderboard)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          pushSnapshot();
                          setLayoutConfig(prev => ({ ...prev, showRacersList: !prev.showRacersList }));
                        }}
                        className={`paper-btn px-2 py-0.5 text-[10px] font-black flex items-center gap-1 cursor-pointer ${
                          layoutConfig.showRacersList ? 'bg-emerald-300 text-slate-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {layoutConfig.showRacersList ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {layoutConfig.showRacersList ? 'Shown' : 'Hidden'}
                      </button>
                    </div>

                    {layoutConfig.showRacersList && (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">
                              Dock Position
                            </span>
                            <div className="grid grid-cols-2 gap-1">
                              {(['bottom', 'top'] as const).map((pos) => (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={() => {
                                    pushSnapshot();
                                    setLayoutConfig(prev => ({ ...prev, racersListPosition: pos }));
                                  }}
                                  className={`paper-btn py-1 text-[10px] font-black uppercase cursor-pointer ${
                                    layoutConfig.racersListPosition === pos
                                      ? '!bg-violet-600 !text-white'
                                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-600 block mb-1">
                              Card Density
                            </span>
                            <div className="grid grid-cols-2 gap-1">
                              {(['detailed', 'compact'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    pushSnapshot();
                                    setLayoutConfig(prev => ({ ...prev, racersListStyle: st }));
                                  }}
                                  className={`paper-btn py-1 text-[10px] font-black capitalize cursor-pointer ${
                                    layoutConfig.racersListStyle === st
                                      ? '!bg-violet-600 !text-white'
                                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-600 block mb-1">
                            Grid Columns
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {([
                              { id: 'auto', label: 'Auto Fit' },
                              { id: '8', label: '8 Cols (1 Row)' },
                              { id: '4', label: '4 Cols (2 Rows)' },
                            ] as const).map((col) => (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => {
                                  pushSnapshot();
                                  setLayoutConfig(prev => ({ ...prev, racersListColumns: col.id }));
                                }}
                                className={`paper-btn py-1 text-[9px] font-black cursor-pointer ${
                                  layoutConfig.racersListColumns === col.id
                                    ? '!bg-violet-600 !text-white'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {col.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reset Layout Defaults */}
                  <button
                    type="button"
                    onClick={() => {
                      pushSnapshot();
                      setLayoutConfig({ ...DEFAULT_LAYOUT_CONFIG });
                    }}
                    className="paper-btn bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] py-1 font-bold w-full cursor-pointer"
                  >
                    Reset Simulation Layout to Defaults
                  </button>
                </div>
              )}

              {/* TAB CONTENT: TRACK EDITOR */}
              {inspectorTab === 'track_editor' && (
                <>
              {/* VIEW A: SPECIFIC CORRIDOR SELECTED */}
              {selectedCorridorIdx !== null && corridors[selectedCorridorIdx] ? (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">

                  <div className="paper-card bg-amber-50 p-2 text-xs space-y-2 border-2 border-amber-900">
                    <div className="flex items-center justify-between font-black text-amber-950">
                      <span>Corridor #{selectedCorridorIdx + 1}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedCorridorIdx(null)}
                          className="paper-btn bg-white px-2 py-0.5 text-[10px]"
                        >
                          All Objects
                        </button>
                        <button
                          onClick={() => {
                            pushSnapshot();
                            setCorridors(corridors.filter((_, i) => i !== selectedCorridorIdx));
                            setSelectedCorridorIdx(null);
                          }}
                          className="text-red-600 hover:text-red-800 p-0.5"
                          title="Delete Corridor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Place Racer Spawns in this Corridor */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handlePlaceSpawnsInCorridor(selectedCorridorIdx)}
                        className="paper-btn w-full bg-sky-300 hover:bg-sky-200 text-slate-950 text-[11px] py-1.5 font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>🏁 Place Racer Spawns in Corridor #{selectedCorridorIdx + 1}</span>
                      </button>
                    </div>

                    {/* Corridor Type: Normal vs Moving Wall */}
                    <div className="border-t border-amber-200 pt-1.5">
                      <span className="block text-slate-700 font-extrabold mb-1">Corridor Type:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            pushSnapshot();
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], hasMovingWall: false };
                              return u;
                            });
                          }}
                          className={`paper-btn text-xs py-1 font-bold ${
                            !corridors[selectedCorridorIdx].hasMovingWall ? 'bg-amber-300' : 'bg-white'
                          }`}
                        >
                          Normal Track
                        </button>
                        <button
                          onClick={() => {
                            pushSnapshot();
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = {
                                ...u[selectedCorridorIdx],
                                hasMovingWall: true,
                                wallDirection: u[selectedCorridorIdx].wallDirection || 'right',
                                wallSpeed: u[selectedCorridorIdx].wallSpeed || 55,
                                wallDelay: u[selectedCorridorIdx].wallDelay || 0
                              };
                              return u;
                            });
                          }}
                          className={`paper-btn text-xs py-1 font-bold ${
                            corridors[selectedCorridorIdx].hasMovingWall ? 'bg-sky-400 text-white' : 'bg-white'
                          }`}
                        >
                          Moving Wall
                        </button>
                      </div>
                    </div>

                    {/* Moving Wall Direction & Controls */}
                    {corridors[selectedCorridorIdx].hasMovingWall && (
                      <div className="bg-sky-50 border border-sky-300 rounded p-2 space-y-2">
                        <span className="block text-[11px] font-black text-sky-900 uppercase">
                          Wall Travel Direction
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {(['right', 'left', 'up', 'down'] as MovingWallDirection[]).map(dir => {
                            const isCurrent = corridors[selectedCorridorIdx].wallDirection === dir;
                            return (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => {
                                  pushSnapshot();
                                  setCorridors(prev => {
                                    const u = [...prev];
                                    u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], wallDirection: dir };
                                    return u;
                                  });
                                }}
                                className={`paper-btn text-[10px] py-1 font-black capitalize flex flex-col items-center gap-0.5 select-none transition-none ${
                                  isCurrent
                                    ? '!bg-sky-600 !text-white !border-slate-950'
                                    : '!bg-white !text-slate-900 hover:!bg-slate-100'
                                }`}
                              >
                                <span className={isCurrent ? 'text-white' : 'text-slate-800'}>
                                  {dir === 'right' && <ArrowRight className="w-3.5 h-3.5" />}
                                  {dir === 'left' && <ArrowLeft className="w-3.5 h-3.5" />}
                                  {dir === 'up' && <ArrowUp className="w-3.5 h-3.5" />}
                                  {dir === 'down' && <ArrowDown className="w-3.5 h-3.5" />}
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                                  {dir}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Order & Timing Steppers */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          <NumberStepper
                            label="Stage Order"
                            value={corridors[selectedCorridorIdx].wallOrder !== undefined ? corridors[selectedCorridorIdx].wallOrder! : (selectedCorridorIdx + 1)}
                            min={1}
                            max={50}
                            step={1}
                            onChange={(val) => {
                              setCorridors(prev => {
                                const u = [...prev];
                                u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], wallOrder: val };
                                return u;
                              });
                            }}
                          />
                          <NumberStepper
                            label="Speed"
                            unit="px/s"
                            value={corridors[selectedCorridorIdx].wallSpeed || 55}
                            min={10}
                            max={200}
                            step={5}
                            onChange={(val) => {
                              setCorridors(prev => {
                                const u = [...prev];
                                u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], wallSpeed: val };
                                return u;
                              });
                            }}
                          />
                          <NumberStepper
                            label="Start Delay"
                            unit="s"
                            value={corridors[selectedCorridorIdx].wallDelay || 0}
                            min={0}
                            max={60}
                            step={1}
                            onChange={(val) => {
                              setCorridors(prev => {
                                const u = [...prev];
                                u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], wallDelay: val };
                                return u;
                              });
                            }}
                          />
                        </div>
                        <span className="block text-[9px] text-sky-800 font-medium">
                          Next Stage Order moves only after all corridors in previous Order finish.
                        </span>
                      </div>
                    )}

                    {/* Geometric Coordinate inputs (Limitless Arena) */}
                    <div className="border-t border-amber-200 pt-1.5 space-y-1.5">
                      <span className="block text-slate-700 font-extrabold text-[10px] uppercase">Corridor Bounds (Limitless)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <NumberStepper
                          label="X Position"
                          value={corridors[selectedCorridorIdx].x}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], x: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Y Position"
                          value={corridors[selectedCorridorIdx].y}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], y: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Width"
                          value={corridors[selectedCorridorIdx].w}
                          min={20}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], w: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Height"
                          value={corridors[selectedCorridorIdx].h}
                          min={20}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setCorridors(prev => {
                              const u = [...prev];
                              u[selectedCorridorIdx] = { ...u[selectedCorridorIdx], h: val };
                              return u;
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedGateIdx !== null && gates[selectedGateIdx] ? (
                /* VIEW B: SPECIFIC GATE SELECTED */
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="paper-card bg-purple-50 p-2 text-xs space-y-2 border-2 border-purple-900">
                    <div className="flex items-center justify-between font-black text-purple-950">
                      <span>Gate #{selectedGateIdx + 1} ({gates[selectedGateIdx].orientation === 'V' || gates[selectedGateIdx].h > gates[selectedGateIdx].w ? 'Vertical' : 'Horizontal'})</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedGateIdx(null)}
                          className="paper-btn bg-white px-2 py-0.5 text-[10px] text-slate-900 select-none"
                        >
                          All Objects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGates(gates.filter((_, i) => i !== selectedGateIdx));
                            setSelectedGateIdx(null);
                          }}
                          className="text-red-600 hover:text-red-800 p-0.5 select-none"
                          title="Delete Gate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {/* Gate Orientation Toggle (Horizontal vs Vertical) */}
                      <div>
                        <span className="block text-slate-700 font-extrabold text-[11px] mb-1">
                          Gate Orientation:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              pushSnapshot();
                              setGates(prev => {
                                const u = [...prev];
                                const cur = u[selectedGateIdx];
                                const longSide = Math.max(cur.w, cur.h, 70);
                                const shortSide = Math.min(cur.w, cur.h, 15);
                                u[selectedGateIdx] = {
                                  ...cur,
                                  orientation: 'H',
                                  w: longSide,
                                  h: shortSide,
                                };
                                return u;
                              });
                            }}
                            className={`paper-btn text-[10px] py-1 font-black ${
                              gates[selectedGateIdx].orientation !== 'V' && gates[selectedGateIdx].w >= gates[selectedGateIdx].h
                                ? '!bg-purple-500 !text-white'
                                : '!bg-white !text-slate-800'
                            }`}
                          >
                            ↔ Horizontal Gate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              pushSnapshot();
                              setGates(prev => {
                                const u = [...prev];
                                const cur = u[selectedGateIdx];
                                const longSide = Math.max(cur.w, cur.h, 70);
                                const shortSide = Math.min(cur.w, cur.h, 15);
                                u[selectedGateIdx] = {
                                  ...cur,
                                  orientation: 'V',
                                  w: shortSide,
                                  h: longSide,
                                };
                                return u;
                              });
                            }}
                            className={`paper-btn text-[10px] py-1 font-black ${
                              gates[selectedGateIdx].orientation === 'V' || gates[selectedGateIdx].h > gates[selectedGateIdx].w
                                ? '!bg-purple-500 !text-white'
                                : '!bg-white !text-slate-800'
                            }`}
                          >
                            ↕ Vertical Gate
                          </button>
                        </div>
                      </div>

                      {/* Gate Color (Strictly From Racers List Colors) */}
                      <div>
                        <span className="block text-slate-700 font-extrabold text-[11px] mb-1">
                          Gate Color (From Racers List):
                        </span>
                        {(() => {
                          const currentGate = gates[selectedGateIdx];
                          const matchedRacer =
                            teamList.find(t => t.hex === currentGate.color) ||
                            (currentGate.unlockTeamId ? teamList.find(t => t.id === currentGate.unlockTeamId) : undefined) ||
                            teamList[0];

                          return (
                            <div className="space-y-1.5">
                              <PaperDropdown
                                value={matchedRacer ? matchedRacer.id : teamList[0]?.id || ''}
                                options={teamList.map(t => ({
                                  value: t.id,
                                  label: `${t.name} Color`,
                                  colorSwatch: t.css,
                                  badge: t.css.toUpperCase(),
                                }))}
                                onChange={(racerId) => {
                                  const picked = teamList.find(t => t.id === racerId);
                                  if (!picked) return;
                                  pushSnapshot();
                                  setGates(prev => {
                                    const u = [...prev];
                                    u[selectedGateIdx] = {
                                      ...u[selectedGateIdx],
                                      color: picked.hex,
                                    };
                                    return u;
                                  });
                                }}
                              />

                              {/* Quick Racer Color Swatches */}
                              <div className="grid grid-cols-8 gap-1 pt-0.5">
                                {teamList.map(t => {
                                  const isSelectedColor = currentGate.color === t.hex;
                                  return (
                                    <button
                                      key={`gate_col_${t.id}`}
                                      type="button"
                                      onClick={() => {
                                        Sound.play('button_click');
                                        pushSnapshot();
                                        setGates(prev => {
                                          const u = [...prev];
                                          u[selectedGateIdx] = {
                                            ...u[selectedGateIdx],
                                            color: t.hex,
                                          };
                                          return u;
                                        });
                                      }}
                                      className={`h-6 rounded border-2 border-slate-900 flex items-center justify-center transition-transform cursor-pointer ${
                                        isSelectedColor
                                          ? 'ring-2 ring-slate-950 scale-105 shadow-[1.5px_2px_0px_#0f172a]'
                                          : 'opacity-80 hover:opacity-100'
                                      }`}
                                      style={{ backgroundColor: t.css }}
                                      title={`Set Gate Color to ${t.name} (${t.css})`}
                                    >
                                      {isSelectedColor && (
                                        <Check className="w-3 h-3 stroke-[3] text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Key Unlock Requirement */}
                      <div>
                        <span className="block text-slate-700 font-extrabold text-[11px] mb-1 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-amber-600" /> Unlock Condition
                        </span>
                        <PaperDropdown
                          value={gates[selectedGateIdx].unlockTeamId || ''}
                          options={[
                            {
                              value: '',
                              label: 'Any Racer (Normal Breakable HP)',
                              badge: `${gates[selectedGateIdx].hp} HP`,
                            },
                            ...teamList.map(t => ({
                              value: t.id,
                              label: `🔑 ${t.name} Keyholder`,
                              colorSwatch: t.css,
                              badge: 'INSTANT',
                            })),
                          ]}
                          onChange={(val) => {
                            pushSnapshot();
                            setGates(prev => {
                              const u = [...prev];
                              const targetGate = { ...u[selectedGateIdx] };
                              if (val) {
                                targetGate.unlockTeamId = val;
                                const match = teamList.find(t => t.id === val);
                                if (match) targetGate.color = match.hex;
                              } else {
                                targetGate.unlockTeamId = undefined;
                              }
                              u[selectedGateIdx] = targetGate;
                              return u;
                            });
                          }}
                        />
                      </div>

                      <NumberStepper
                        label="Durability (Hits to destroy)"
                        value={gates[selectedGateIdx].hp}
                        min={1}
                        max={200}
                        step={1}
                        onChange={(val) => {
                          setGates(prev => {
                            const u = [...prev];
                            u[selectedGateIdx] = { ...u[selectedGateIdx], hp: val };
                            return u;
                          });
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <NumberStepper
                          label="X Position"
                          value={gates[selectedGateIdx].x}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setGates(prev => {
                              const u = [...prev];
                              u[selectedGateIdx] = { ...u[selectedGateIdx], x: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Y Position"
                          value={gates[selectedGateIdx].y}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setGates(prev => {
                              const u = [...prev];
                              u[selectedGateIdx] = { ...u[selectedGateIdx], y: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Width"
                          value={gates[selectedGateIdx].w}
                          min={8}
                          max={999999}
                          step={2}
                          onChange={(val) => {
                            setGates(prev => {
                              const u = [...prev];
                              const nextH = u[selectedGateIdx].h;
                              u[selectedGateIdx] = {
                                ...u[selectedGateIdx],
                                w: val,
                                orientation: val >= nextH ? 'H' : 'V',
                              };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Height"
                          value={gates[selectedGateIdx].h}
                          min={8}
                          max={999999}
                          step={2}
                          onChange={(val) => {
                            setGates(prev => {
                              const u = [...prev];
                              const nextW = u[selectedGateIdx].w;
                              u[selectedGateIdx] = {
                                ...u[selectedGateIdx],
                                h: val,
                                orientation: nextW >= val ? 'H' : 'V',
                              };
                              return u;
                            });
                          }}
                        />
                      </div>

                      {/* Moving Wall Trigger for this gate */}
                      <div className="pt-2 border-t border-purple-200">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!gates[selectedGateIdx].triggersFlood}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setGates(prev => {
                                const u = [...prev];
                                u[selectedGateIdx] = { ...u[selectedGateIdx], triggersFlood: checked };
                                return u;
                              });
                            }}
                            className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                          />
                          <span className="text-[11px] font-extrabold text-purple-950 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-600" />
                            Trigger Moving Wall on Destroy
                          </span>
                        </label>
                        <span className="block text-[9px] text-purple-700 mt-0.5 ml-6">
                          Breaking this gate will activate the moving walls.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedBarrierIdx !== null && barriers[selectedBarrierIdx] ? (
                /* VIEW C: SPECIFIC BARRIER SELECTED */
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="paper-card bg-amber-50 p-2 text-xs space-y-2 border-2 border-amber-900">
                    <div className="flex items-center justify-between font-black text-amber-950">
                      <span>Barrier #{selectedBarrierIdx + 1} ({barriers[selectedBarrierIdx].h > barriers[selectedBarrierIdx].w ? 'Vertical' : 'Horizontal'})</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBarrierIdx(null)}
                          className="paper-btn bg-white px-2 py-0.5 text-[10px] text-slate-900 select-none"
                        >
                          All Objects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBarriers(barriers.filter((_, i) => i !== selectedBarrierIdx));
                            setSelectedBarrierIdx(null);
                          }}
                          className="text-red-600 hover:text-red-800 p-0.5 select-none"
                          title="Delete Barrier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Barrier Shape Orientation Toggle (Horizontal vs Vertical) */}
                    <div>
                      <span className="block text-slate-700 font-extrabold text-[11px] mb-1">Barrier Shape Orientation:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            pushSnapshot();
                            setBarriers(prev => {
                              const u = [...prev];
                              const cur = u[selectedBarrierIdx];
                              const longSide = Math.max(cur.w, cur.h, 60);
                              const shortSide = Math.min(cur.w, cur.h, 16);
                              u[selectedBarrierIdx] = {
                                ...cur,
                                w: longSide,
                                h: shortSide,
                              };
                              return u;
                            });
                          }}
                          className={`paper-btn text-[10px] py-1 font-black ${
                            barriers[selectedBarrierIdx].w >= barriers[selectedBarrierIdx].h
                              ? '!bg-amber-400 !text-slate-950'
                              : '!bg-white !text-slate-800'
                          }`}
                        >
                          ↔ Horizontal Bar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pushSnapshot();
                            setBarriers(prev => {
                              const u = [...prev];
                              const cur = u[selectedBarrierIdx];
                              const longSide = Math.max(cur.w, cur.h, 60);
                              const shortSide = Math.min(cur.w, cur.h, 16);
                              u[selectedBarrierIdx] = {
                                ...cur,
                                w: shortSide,
                                h: longSide,
                              };
                              return u;
                            });
                          }}
                          className={`paper-btn text-[10px] py-1 font-black ${
                            barriers[selectedBarrierIdx].h > barriers[selectedBarrierIdx].w
                              ? '!bg-amber-400 !text-slate-950'
                              : '!bg-white !text-slate-800'
                          }`}
                        >
                          ↕ Vertical Bar
                        </button>
                      </div>
                    </div>

                    {/* Movement Pattern */}
                    <div>
                      <span className="block text-slate-700 font-extrabold text-[11px] mb-1">Movement Trajectory:</span>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { id: 'static', label: 'Static (Still)' },
                          { id: 'horizontal', label: '↔ Horizontal' },
                          { id: 'vertical', label: '↕ Vertical' },
                          { id: 'diagonal_up', label: '↗ Diagonal Up' },
                          { id: 'diagonal_down', label: '↘ Diagonal Down' }
                        ].map((m) => {
                          const isCur = barriers[selectedBarrierIdx].movement === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setBarriers(prev => {
                                  const u = [...prev];
                                  u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], movement: m.id as BarrierMovement };
                                  return u;
                                });
                              }}
                              className={`paper-btn text-[10px] py-1 font-bold ${
                                isCur ? '!bg-amber-400 !text-slate-950' : '!bg-white !text-slate-800 hover:!bg-slate-100'
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Speed & Amplitude (Distance) */}
                    {barriers[selectedBarrierIdx].movement !== 'static' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <NumberStepper
                          label="Speed"
                          unit="px/s"
                          value={barriers[selectedBarrierIdx].speed}
                          min={5}
                          max={1000}
                          step={5}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], speed: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Travel Distance"
                          unit="px"
                          value={barriers[selectedBarrierIdx].distance}
                          min={5}
                          max={5000}
                          step={5}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], distance: val };
                              return u;
                            });
                          }}
                        />
                      </div>
                    )}

                    {/* Bounds */}
                    <div className="border-t border-amber-200 pt-1.5 space-y-1.5">
                      <span className="block text-slate-700 font-extrabold text-[10px] uppercase">Barrier Bounds (Limitless)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <NumberStepper
                          label="X Position"
                          value={barriers[selectedBarrierIdx].x}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], x: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Y Position"
                          value={barriers[selectedBarrierIdx].y}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], y: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Width"
                          value={barriers[selectedBarrierIdx].w}
                          min={8}
                          max={999999}
                          step={2}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], w: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Height"
                          value={barriers[selectedBarrierIdx].h}
                          min={8}
                          max={999999}
                          step={2}
                          onChange={(val) => {
                            setBarriers(prev => {
                              const u = [...prev];
                              u[selectedBarrierIdx] = { ...u[selectedBarrierIdx], h: val };
                              return u;
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : isFinishSelected ? (
                /* VIEW D: FINISH ZONE ALCOVE SELECTED */
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="paper-card bg-emerald-50 p-2 text-xs space-y-2.5 border-2 border-emerald-900">
                    <div className="flex items-center justify-between font-black text-emerald-950">
                      <span className="flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-emerald-700" /> Finish Zone Alcove
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFinishSelected(false)}
                        className="paper-btn bg-white px-2 py-0.5 text-[10px] text-slate-900 select-none"
                      >
                        All Objects
                      </button>
                    </div>
                    <span className="block text-[10px] text-emerald-900 font-bold">
                      Racers that cross this finish line will trigger the win celebration. Drag, resize, or rotate it to match any corridor direction:
                    </span>

                    {/* Rotation Controls for Finish Zone */}
                    <div className="bg-white/90 p-2 rounded border border-emerald-300 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-950">
                          Finish Line Rotation ({finishZone.rotation || 0}°)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            pushSnapshot();
                            setFinishZone(prev => ({
                              ...prev,
                              rotation: ((prev.rotation || 0) + 90) % 360,
                            }));
                          }}
                          className="paper-btn bg-emerald-300 hover:bg-emerald-200 text-slate-950 text-[10px] px-2 py-0.5 font-black cursor-pointer"
                        >
                          Rotate +90° ↻
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { deg: 0, label: '0° (Down)' },
                          { deg: 90, label: '90° (Left)' },
                          { deg: 180, label: '180° (Up)' },
                          { deg: 270, label: '270° (Right)' },
                        ].map(preset => {
                          const isActive = (finishZone.rotation || 0) === preset.deg;
                          return (
                            <button
                              key={preset.deg}
                              type="button"
                              onClick={() => {
                                pushSnapshot();
                                setFinishZone(prev => ({ ...prev, rotation: preset.deg }));
                              }}
                              className={`paper-btn text-[9px] py-1 font-black ${
                                isActive
                                  ? '!bg-emerald-600 !text-white'
                                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                      <NumberStepper
                        label="Custom Rotation Angle"
                        unit="°"
                        value={finishZone.rotation || 0}
                        min={0}
                        max={360}
                        step={15}
                        onChange={(val) => setFinishZone(prev => ({ ...prev, rotation: ((val % 360) + 360) % 360 }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <NumberStepper
                        label="X Position"
                        value={finishZone.x}
                        min={-999999}
                        max={999999}
                        step={5}
                        onChange={(val) => setFinishZone(prev => ({ ...prev, x: val }))}
                      />
                      <NumberStepper
                        label="Y Position"
                        value={finishZone.y}
                        min={-999999}
                        max={999999}
                        step={5}
                        onChange={(val) => setFinishZone(prev => ({ ...prev, y: val }))}
                      />
                      <NumberStepper
                        label="Width"
                        value={finishZone.w}
                        min={20}
                        max={999999}
                        step={5}
                        onChange={(val) => setFinishZone(prev => ({ ...prev, w: val }))}
                      />
                      <NumberStepper
                        label="Height"
                        value={finishZone.h}
                        min={20}
                        max={999999}
                        step={5}
                        onChange={(val) => setFinishZone(prev => ({ ...prev, h: val }))}
                      />
                    </div>
                  </div>
                </div>
              ) : selectedPickupIdx !== null && pickups[selectedPickupIdx] ? (
                /* VIEW E: SPECIFIC PICKUP SELECTED */
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="paper-card bg-rose-50 p-2 text-xs space-y-2 border-2 border-rose-900">
                    <div className="flex items-center justify-between font-black text-rose-950">
                      <span>Pickup #{selectedPickupIdx + 1} ({pickups[selectedPickupIdx].type})</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPickupIdx(null)}
                          className="paper-btn bg-white px-2 py-0.5 text-[10px] text-slate-900 select-none"
                        >
                          All Objects
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPickups(pickups.filter((_, i) => i !== selectedPickupIdx));
                            setSelectedPickupIdx(null);
                          }}
                          className="text-red-600 hover:text-red-800 p-0.5 select-none"
                          title="Delete Pickup"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="block text-slate-700 font-extrabold text-[11px] mb-1">
                          Pickup Item Type:
                        </span>
                        <PaperDropdown
                          value={pickups[selectedPickupIdx].type}
                          options={[
                            { value: 'cherry_clone', label: '🍒 Cherry Clone', badge: 'x2 CLONE', subtitle: 'Duplicates racer on contact' },
                            { value: 'star_dash', label: '⭐ Star Dash', badge: '1.5x SPD', subtitle: 'High-speed turbo boost' },
                            { value: 'shield', label: '🛡️ Shield Bubble', badge: 'ARMOR', subtitle: 'Blocks one knife attack' },
                            { value: 'knife', label: '🔪 Knife Blade', badge: 'WEAPON', subtitle: 'Eliminates rival racer on contact' },
                          ]}
                          onChange={(val) => {
                            pushSnapshot();
                            setPickups(prev => {
                              const u = [...prev];
                              u[selectedPickupIdx] = { ...u[selectedPickupIdx], type: val };
                              return u;
                            });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <NumberStepper
                          label="X Position"
                          value={pickups[selectedPickupIdx].x}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setPickups(prev => {
                              const u = [...prev];
                              u[selectedPickupIdx] = { ...u[selectedPickupIdx], x: val };
                              return u;
                            });
                          }}
                        />
                        <NumberStepper
                          label="Y Position"
                          value={pickups[selectedPickupIdx].y}
                          min={-999999}
                          max={999999}
                          step={5}
                          onChange={(val) => {
                            setPickups(prev => {
                              const u = [...prev];
                              u[selectedPickupIdx] = { ...u[selectedPickupIdx], y: val };
                              return u;
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : isSpawnGroupSelected || (selectedSpawnIdx !== null && baySpawns[selectedSpawnIdx]) ? (
                /* VIEW E2: RACER SPAWN ZONE & INDIVIDUAL SPAWN INSPECTOR */
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  <div className="paper-card bg-sky-50 p-2 text-xs space-y-2.5 border-2 border-sky-900">
                    <div className="flex items-center justify-between font-black text-sky-950">
                      <span className="flex items-center gap-1">
                        🏁 Racer Spawn Setup
                      </span>
                      <button
                        type="button"
                        onClick={() => clearSelection()}
                        className="paper-btn bg-white px-2 py-0.5 text-[10px] text-slate-900 select-none"
                      >
                        All Objects
                      </button>
                    </div>

                    {/* Mode Selector: Group vs Individual Racer Slot */}
                    <div className="space-y-1">
                      <span className="block text-[10px] font-extrabold text-slate-700 uppercase">
                        Select Spawn Target (or drag on canvas):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpawnIdx(null);
                            setIsSpawnGroupSelected(true);
                          }}
                          className={`paper-btn text-[10px] px-2 py-0.5 font-black ${
                            isSpawnGroupSelected && selectedSpawnIdx === null
                              ? '!bg-sky-500 !text-white'
                              : 'bg-white text-slate-800'
                          }`}
                        >
                          All Spawns (Group)
                        </button>
                        {baySpawns.map((sp, idx) => {
                          const team = teamList.find(t => t.id === sp.teamId) || teamList[idx % teamList.length];
                          const isSel = selectedSpawnIdx === idx;
                          return (
                            <button
                              key={`sp_tab_${idx}`}
                              type="button"
                              onClick={() => {
                                setIsSpawnGroupSelected(false);
                                setSelectedSpawnIdx(idx);
                              }}
                              className={`paper-btn text-[10px] px-1.5 py-0.5 font-black flex items-center gap-1 ${
                                isSel ? '!bg-slate-900 !text-white' : 'bg-white text-slate-800'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-xs border border-black inline-block"
                                style={{ backgroundColor: team?.css || '#22d3ee' }}
                              />
                              <span>#{idx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedSpawnIdx !== null && baySpawns[selectedSpawnIdx] ? (
                      /* Individual Racer Spawn Controls */
                      <div className="bg-white border border-sky-200 rounded-md p-2 space-y-2">
                        {(() => {
                          const sp = baySpawns[selectedSpawnIdx];
                          const team = teamList.find(t => t.id === sp.teamId) || teamList[selectedSpawnIdx % teamList.length];
                          return (
                            <>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                <span className="font-black text-[11px] flex items-center gap-1.5 text-slate-900">
                                  <span
                                    className="w-3 h-3 rounded-xs border border-slate-900 inline-block"
                                    style={{ backgroundColor: team?.css || '#22d3ee' }}
                                  />
                                  Spawn #{selectedSpawnIdx + 1} — {team?.name || 'RACER'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500">
                                  Drag marker on map
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <NumberStepper
                                  label="X Position"
                                  value={sp.x}
                                  min={-500}
                                  max={2000}
                                  step={5}
                                  onChange={(val) => {
                                    setBaySpawns(prev => {
                                      const u = [...prev];
                                      u[selectedSpawnIdx] = { ...u[selectedSpawnIdx], x: val };
                                      return u;
                                    });
                                  }}
                                />
                                <NumberStepper
                                  label="Y Position"
                                  value={sp.y}
                                  min={-500}
                                  max={2000}
                                  step={5}
                                  onChange={(val) => {
                                    setBaySpawns(prev => {
                                      const u = [...prev];
                                      u[selectedSpawnIdx] = { ...u[selectedSpawnIdx], y: val };
                                      return u;
                                    });
                                  }}
                                />
                              </div>

                              <div>
                                <span className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                                  Initial Launch Direction:
                                </span>
                                <div className="grid grid-cols-5 gap-1">
                                  {([
                                    { id: 'up', label: '↑ Up' },
                                    { id: 'down', label: '↓ Down' },
                                    { id: 'left', label: '← Left' },
                                    { id: 'right', label: '→ Right' },
                                    { id: 'scatter', label: '🎲 Diag' },
                                  ] as const).map(d => (
                                    <button
                                      key={d.id}
                                      type="button"
                                      onClick={() => handleSetSpawnVelocities(d.id, selectedSpawnIdx)}
                                      className="paper-btn bg-slate-100 hover:bg-sky-200 text-[9px] py-1 font-black text-slate-900"
                                    >
                                      {d.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      /* Group Spawn Controls: Smart Fit, Formations, Group Position & Spread */
                      <div className="space-y-2">
                        {/* 1. Smart Auto-Fit into Track Corridors */}
                        <div className="bg-white border border-sky-200 rounded-md p-2 space-y-1.5">
                          <span className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            1. Quick Snap to Track Corridor
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoFitStartingBays}
                            className="paper-btn w-full bg-emerald-300 hover:bg-emerald-200 text-slate-950 text-[10px] py-1.5 font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            ⚡ Auto-Fit into Starting Bays (Order 1)
                          </button>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-slate-600 shrink-0">Or Fit in:</span>
                            <PaperDropdown
                              value=""
                              compact
                              resetOnSelect
                              placeholder="Choose Corridor #..."
                              className="flex-1"
                              options={corridors.map((c, idx) => ({
                                value: String(idx),
                                label: `Corridor #${idx + 1} (${c.w}×${c.h})`,
                                badge: c.hasMovingWall ? `WALL ${c.wallDirection?.toUpperCase()}` : 'NORMAL',
                              }))}
                              onChange={(val) => {
                                if (val === '') return;
                                handlePlaceSpawnsInCorridor(Number(val));
                              }}
                            />
                          </div>
                        </div>

                        {/* 2. One-Click Formation Presets */}
                        <div className="bg-white border border-sky-200 rounded-md p-2 space-y-1.5">
                          <span className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            2. Spawn Formation Layout
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => handleApplySpawnFormation('grid_2x4')}
                              className="paper-btn bg-slate-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-slate-900"
                            >
                              ⊞ 2×4 Grid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySpawnFormation('grid_4x2')}
                              className="paper-btn bg-slate-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-slate-900"
                            >
                              ⊟ 4×2 Grid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySpawnFormation('circle')}
                              className="paper-btn bg-slate-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-slate-900"
                            >
                              ◎ Circle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySpawnFormation('line_h')}
                              className="paper-btn bg-slate-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-slate-900"
                            >
                              ↔ H-Line
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplySpawnFormation('line_v')}
                              className="paper-btn bg-slate-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-slate-900"
                            >
                              ↕ V-Line
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorMode('spawn')}
                              className={`paper-btn text-[10px] py-1 font-black ${
                                editorMode === 'spawn' ? '!bg-sky-400 !text-slate-950' : 'bg-amber-100 hover:bg-amber-200 text-amber-950'
                              }`}
                              title="Click anywhere on the map to move spawns there"
                            >
                              📍 Click Map
                            </button>
                          </div>
                        </div>

                        {/* 3. Group Center & Spacing */}
                        <div className="bg-white border border-sky-200 rounded-md p-2 space-y-2">
                          <span className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            3. Group Center & Spacing
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <NumberStepper
                              label="Center X"
                              value={spawnBounds.cx}
                              min={-500}
                              max={2000}
                              step={5}
                              onChange={(val) => handleMoveAllSpawnsTo(val, spawnBounds.cy)}
                            />
                            <NumberStepper
                              label="Center Y"
                              value={spawnBounds.cy}
                              min={-500}
                              max={2000}
                              step={5}
                              onChange={(val) => handleMoveAllSpawnsTo(spawnBounds.cx, val)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleScaleSpawnSpread(0.8)}
                              className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] py-1 font-bold text-slate-800"
                            >
                              Tighten Spacing (-20%)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScaleSpawnSpread(1.25)}
                              className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] py-1 font-bold text-slate-800"
                            >
                              Widen Spacing (+25%)
                            </button>
                          </div>
                        </div>

                        {/* 4. Global Launch Direction */}
                        <div className="bg-white border border-sky-200 rounded-md p-2 space-y-1.5">
                          <span className="block text-[10px] font-extrabold text-slate-700 uppercase">
                            4. Launch Bounce Direction (All Racers)
                          </span>
                          <div className="grid grid-cols-5 gap-1">
                            {([
                              { id: 'up', label: '↑ Up' },
                              { id: 'down', label: '↓ Down' },
                              { id: 'left', label: '← Left' },
                              { id: 'right', label: '→ Right' },
                              { id: 'scatter', label: '🎲 Scatter' },
                            ] as const).map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => handleSetSpawnVelocities(d.id, null)}
                                className="paper-btn bg-slate-100 hover:bg-sky-200 text-[9px] py-1 font-black text-slate-900"
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VIEW F: NOTHING SELECTED -> SHOW ALL OBJECTS LIST */
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* Racer Spawn Zone quick card */}
                  <div
                    onClick={() => {
                      clearSelection();
                      setIsSpawnGroupSelected(true);
                    }}
                    className="paper-card bg-sky-50 hover:bg-sky-100 p-1.5 border-2 border-sky-800 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🏁</span>
                      <span className="font-extrabold text-[11px] text-sky-950">Racer Spawn Zone</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-sky-800 font-bold">
                        {spawnBounds.cx},{spawnBounds.cy}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoFitStartingBays();
                        }}
                        className="paper-btn bg-emerald-300 hover:bg-emerald-200 text-[9px] px-1.5 py-0.5 font-black text-slate-950"
                        title="Automatically fit racer spawns into starting bays"
                      >
                        Auto-Fit
                      </button>
                    </div>
                  </div>

                  {/* Finish Zone Alcove quick card */}
                  <div
                    onClick={() => {
                      clearSelection();
                      setIsFinishSelected(true);
                    }}
                    className="paper-card bg-emerald-50 hover:bg-emerald-100 p-1.5 border-2 border-emerald-800 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-extrabold text-[11px] text-emerald-950">Finish Line Alcove</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold">
                      {finishZone.x},{finishZone.y} ({finishZone.w}×{finishZone.h})
                    </span>
                  </div>

                  {/* Global Moving Wall Trigger Strategy Box */}
                  <div className="paper-card bg-amber-50 p-2 border-2 border-amber-900 text-xs space-y-2">
                    <div className="flex items-center justify-between font-black text-amber-950">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-700" />
                        Wall Trigger Condition
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setWallTriggerMode('gate_destroy')}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          wallTriggerMode === 'gate_destroy' ? 'bg-amber-300 !text-slate-950' : 'bg-white text-slate-700'
                        }`}
                        title="Moving walls activate when a designated trigger gate is broken"
                      >
                        Gate Break
                      </button>
                      <button
                        type="button"
                        onClick={() => setWallTriggerMode('immediate')}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          wallTriggerMode === 'immediate' ? 'bg-emerald-300 !text-slate-950' : 'bg-white text-slate-700'
                        }`}
                        title="Moving walls start immediately at race start"
                      >
                        Immediate
                      </button>
                      <button
                        type="button"
                        onClick={() => setWallTriggerMode('timer')}
                        className={`paper-btn text-[10px] py-1 font-bold ${
                          wallTriggerMode === 'timer' ? 'bg-sky-300 !text-slate-950' : 'bg-white text-slate-700'
                        }`}
                        title="Moving walls start after a countdown timer"
                      >
                        Timed
                      </button>
                    </div>

                    {wallTriggerMode === 'timer' && (
                      <div className="pt-1">
                        <NumberStepper
                          label="Countdown Before Wall Activates"
                          unit="s"
                          value={wallTriggerTimer}
                          min={1}
                          max={60}
                          step={1}
                          onChange={(val) => setWallTriggerTimer(val)}
                        />
                      </div>
                    )}

                    {wallTriggerMode === 'gate_destroy' && (
                      <span className="block text-[9px] text-amber-900 font-medium">
                        Wall starts when any gate with 🔥 trigger is shattered.
                      </span>
                    )}

                    {wallTriggerMode === 'immediate' && (
                      <span className="block text-[9px] text-emerald-900 font-medium">
                        Wall moves right away when simulation starts.
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 font-bold flex items-center justify-between">
                    <span>Click any object to edit, or drag directly on map:</span>
                  </div>

                  {/* Corridors Group */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Corridors ({corridors.length})
                      </span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                      {corridors.map((c, idx) => {
                        const orderNum = c.wallOrder !== undefined ? c.wallOrder : (idx + 1);
                        return (
                          <div
                            key={`c_list_${idx}`}
                            onClick={() => setSelectedCorridorIdx(idx)}
                            className="paper-card bg-white hover:bg-amber-50 p-1.5 text-[11px] flex items-center justify-between cursor-pointer border transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900">#{idx + 1}</span>
                              {c.hasMovingWall ? (
                                <span className="bg-sky-100 text-sky-900 border border-sky-300 px-1 rounded text-[9px] font-black">
                                  ORDER {orderNum} · {c.wallDirection?.toUpperCase()}
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 px-1 rounded text-[9px] font-bold">
                                  Normal
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.w}×{c.h}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gates Group */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Obstacle Gates ({gates.length})
                      </span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                      {gates.map((g, idx) => {
                        const keyTeam = g.unlockTeamId ? teamList.find(t => t.id === g.unlockTeamId) : null;
                        const gateColorTeam = teamList.find(t => t.hex === g.color);
                        const swatchCss = keyTeam
                          ? keyTeam.css
                          : gateColorTeam
                          ? gateColorTeam.css
                          : `#${g.color.toString(16).padStart(6, '0')}`;
                        return (
                          <div
                            key={`g_list_${idx}`}
                            onClick={() => setSelectedGateIdx(idx)}
                            className="paper-card bg-white hover:bg-purple-50 p-1 text-[11px] flex items-center justify-between cursor-pointer border"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-xs border border-slate-900 inline-block shrink-0"
                                style={{ backgroundColor: swatchCss }}
                              />
                              <span className="font-bold text-slate-900">Gate #{idx + 1}</span>
                              {keyTeam && (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1 rounded text-[9px] font-black">
                                  🔑 {keyTeam.name}
                                </span>
                              )}
                              {g.triggersFlood && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded text-[9px] font-black flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 text-amber-600" /> TRIGGER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-purple-700 font-bold">{g.hp} Hits</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Barriers Group */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-600" /> Barriers ({barriers.length})
                      </span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                      {barriers.map((b, idx) => (
                        <div
                          key={`b_list_${idx}`}
                          onClick={() => setSelectedBarrierIdx(idx)}
                          className="paper-card bg-white hover:bg-amber-50 p-1 text-[11px] flex items-center justify-between cursor-pointer border"
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900">Barrier #{idx + 1}</span>
                            <span className="bg-slate-200 text-slate-800 px-1 rounded text-[9px] font-black">
                              {b.movement.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {b.w}×{b.h}
                          </span>
                        </div>
                      ))}
                      {barriers.length === 0 && (
                        <span className="text-[10px] text-slate-400 italic block">No barriers placed yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Pickups Group */}
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" /> Pickups ({pickups.length})
                      </span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                      {pickups.map((p, idx) => (
                        <div
                          key={`p_list_${idx}`}
                          onClick={() => setSelectedPickupIdx(idx)}
                          className="paper-card bg-white hover:bg-rose-50 p-1 text-[11px] flex items-center justify-between cursor-pointer border"
                        >
                          <span className="font-bold text-slate-900 capitalize">
                            {p.type.replace('_', ' ')} #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {p.x},{p.y}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}

              {/* Bottom Quick Palette Buttons */}
              <div className="mt-auto pt-2 border-t border-slate-300 flex flex-col gap-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase text-slate-600">Quick Stamp (Placed at View Center):</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddCorridor(undefined, undefined, 90, 60, false)}
                    className="paper-btn bg-emerald-100 hover:bg-emerald-200 text-[10px] py-1 font-bold text-slate-900"
                  >
                    + Hall
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCorridor(undefined, undefined, 70, 200, true, 'up')}
                    className="paper-btn bg-sky-100 hover:bg-sky-200 text-[10px] py-1 font-bold text-sky-950"
                  >
                    + Wall
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddGate(undefined, undefined, 70, 14, 'H')}
                    className="paper-btn bg-purple-100 hover:bg-purple-200 text-[10px] py-1 font-bold text-purple-950"
                  >
                    + Gate (H)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddGate(undefined, undefined, 14, 70, 'V')}
                    className="paper-btn bg-purple-100 hover:bg-purple-200 text-[10px] py-1 font-bold text-purple-950"
                  >
                    + Gate (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBarrier(undefined, undefined, 60, 16, 'horizontal')}
                    className="paper-btn bg-amber-100 hover:bg-amber-200 text-[10px] py-1 font-bold text-amber-950"
                  >
                    + Bar (H)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBarrier(undefined, undefined, 16, 60, 'vertical')}
                    className="paper-btn bg-amber-100 hover:bg-amber-200 text-[10px] py-1 font-bold text-amber-950"
                  >
                    + Bar (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBarrier(undefined, undefined, 16, 55, 'static')}
                    className="paper-btn bg-slate-200 hover:bg-slate-300 text-[10px] py-1 font-bold text-slate-950"
                  >
                    + Static (V)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPickup('cherry_clone')}
                    className="paper-btn bg-rose-100 hover:bg-rose-200 text-[10px] py-1 font-bold text-rose-950"
                  >
                    🍒 +Cherry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RACER SELECTION & STATS */}
        {activeTab === 'roster' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-200 gap-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800">
                  Competitor Roster ({activeRacersCount}/8 Active)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectAllRacers(true)}
                  className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] px-2 py-0.5 font-bold"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllRacers(false)}
                  className="paper-btn bg-slate-100 hover:bg-slate-200 text-[10px] px-2 py-0.5 font-bold"
                >
                  Deselect All
                </button>
                <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5"></div>
                <button
                  type="button"
                  onClick={() => setTeamList(prev => prev.map(t => ({ ...t, shape: 'square' })))}
                  className="paper-btn bg-slate-50 hover:bg-slate-100 text-[10px] px-1.5 py-0.5 font-bold"
                  title="Set all racers to Square body"
                >
                  All ⬛
                </button>
                <button
                  type="button"
                  onClick={() => setTeamList(prev => prev.map(t => ({ ...t, shape: 'rounded' })))}
                  className="paper-btn bg-slate-50 hover:bg-slate-100 text-[10px] px-1.5 py-0.5 font-bold"
                  title="Set all racers to Rounded body"
                >
                  All 🟤
                </button>
                <button
                  type="button"
                  onClick={() => setTeamList(prev => prev.map(t => ({ ...t, shape: 'circle' })))}
                  className="paper-btn bg-slate-50 hover:bg-slate-100 text-[10px] px-1.5 py-0.5 font-bold"
                  title="Set all racers to Circle body"
                >
                  All 🟢
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-3 lg:grid-cols-4 gap-2.5 p-1">
              {teamList.map((team, idx) => {
                const isSelected = team.enabled !== false;
                const shape = team.shape || 'square';
                const elasticity = team.elasticity !== undefined ? team.elasticity : 1.0;

                return (
                  <div
                    key={team.id}
                    className={`paper-card p-2.5 space-y-2 border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-slate-900 shadow-md'
                        : 'bg-slate-100 border-slate-300 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Top Row: Enable, Color Swatch with Eyes, Name */}
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTeamEnabled(team.id)}
                          className={`w-5 h-5 rounded border-2 border-slate-900 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer ${
                            isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-white text-slate-400'
                          }`}
                          title={isSelected ? 'Deselect racer' : 'Select racer for race'}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div
                          className={`w-7 h-7 border-2 border-slate-900 relative shrink-0 flex items-center justify-center cursor-pointer shadow-xs ${
                            shape === 'circle' ? 'rounded-full' : shape === 'rounded' ? 'rounded-md' : 'rounded-none'
                          }`}
                          style={{ backgroundColor: team.css }}
                          title="Click to customize racer color"
                        >
                          <input
                            type="color"
                            value={team.css}
                            onChange={(e) => {
                              const hexStr = e.target.value;
                              const hexNum = parseInt(hexStr.replace('#', ''), 16);
                              const oldHex = teamList[idx].hex;
                              const updated = [...teamList];
                              updated[idx] = { ...updated[idx], css: hexStr, hex: hexNum };
                              setTeamList(updated);
                              // Keep any gate using this racer's color synced with the racer's new color
                              setGates(prev =>
                                prev.map(g =>
                                  g.color === oldHex || g.unlockTeamId === team.id
                                    ? { ...g, color: hexNum }
                                    : g
                                )
                              );
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="flex gap-0.5 pointer-events-none">
                            <div className="w-1.5 h-1.5 bg-white border border-black rounded-[0.5px]"></div>
                            <div className="w-1.5 h-1.5 bg-white border border-black rounded-[0.5px]"></div>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => {
                            const updated = [...teamList];
                            updated[idx] = { ...updated[idx], name: e.target.value.toUpperCase() };
                            setTeamList(updated);
                          }}
                          className="paper-btn px-2 py-0.5 text-xs font-black text-slate-900 flex-1 min-w-0 focus:outline-none"
                        />
                      </div>

                      {/* Shape Selector */}
                      <div className="pt-2">
                        <span className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                          Body Shape:
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {(['square', 'rounded', 'circle'] as const).map((s) => {
                            const isCur = shape === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                disabled={!isSelected}
                                onClick={() => {
                                  const updated = [...teamList];
                                  updated[idx] = { ...updated[idx], shape: s };
                                  setTeamList(updated);
                                }}
                                className={`paper-btn text-[10px] py-1 font-bold capitalize select-none ${
                                  isCur
                                    ? '!bg-slate-900 !text-white'
                                    : '!bg-slate-100 !text-slate-800 hover:!bg-slate-200'
                                }`}
                              >
                                {s === 'square' ? '⬛ Square' : s === 'rounded' ? '🟤 Soft' : '🟢 Round'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Speed & Elasticity Sliders */}
                      <div className="text-[11px] font-bold text-slate-700 pt-2 space-y-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Speed Multiplier</span>
                            <span className="mono-num text-slate-900">{team.speed.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="2.0"
                            max="4.5"
                            step="0.25"
                            value={team.speed}
                            disabled={!isSelected}
                            onChange={(e) => {
                              const updated = [...teamList];
                              updated[idx] = { ...updated[idx], speed: Number(e.target.value) };
                              setTeamList(updated);
                            }}
                            className="w-full accent-rose-500 cursor-pointer disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-0.5">
                            <span>Bounciness / Elasticity</span>
                            <span className="mono-num text-slate-900">{elasticity.toFixed(2)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.6"
                            max="1.6"
                            step="0.1"
                            value={elasticity}
                            disabled={!isSelected}
                            onChange={(e) => {
                              const updated = [...teamList];
                              updated[idx] = { ...updated[idx], elasticity: Number(e.target.value) };
                              setTeamList(updated);
                            }}
                            className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SYNTHESIZER & SOUND ENGINE */}
        {activeTab === 'sound' && (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 landscape:grid-cols-2 lg:grid-cols-2 gap-3 max-w-5xl mx-auto w-full py-1 pr-1 content-start">
            {/* 1. Scale Selection */}
            <div className="paper-card bg-indigo-50 p-3 space-y-2 border-2 border-indigo-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-indigo-600" /> 1. Musical Arpeggio Scale
                </span>
                <span className="text-[10px] text-indigo-700 font-bold">
                  Harmonic notes triggered on every wall bounce
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['ragtime', 'pentatonic', 'major', 'minor'] as const).map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      setScaleType(sc);
                      Sound.config.scaleType = sc;
                    }}
                    className={`paper-btn text-xs py-1.5 capitalize font-black ${
                      scaleType === sc ? '!bg-indigo-600 !text-white' : '!bg-white !text-slate-900 hover:!bg-slate-100'
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Waveforms, Envelope & Master Volume */}
            <div className="paper-card bg-indigo-50 p-3 space-y-2.5 border-2 border-indigo-900">
              <span className="text-xs font-black uppercase text-indigo-950 block">
                2. Dual Waveform Oscillators & Master Envelope
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Primary Oscillator
                  </label>
                  <PaperDropdown
                    value={waveform}
                    options={[
                      { value: 'triangle', label: 'Triangle (Warm Piano)', badge: 'SOFT', subtitle: 'Rich acoustic-style bounce tone' },
                      { value: 'sine', label: 'Sine (Pure Mellow)', badge: 'PURE', subtitle: 'Clean fundamental frequency' },
                      { value: 'sawtooth', label: 'Sawtooth (Buzzy Lead)', badge: 'BRIGHT', subtitle: 'Crisp synth lead harmonics' },
                      { value: 'square', label: 'Square (Retro 8-Bit)', badge: 'RETRO', subtitle: 'Classic arcade chiptune timbre' },
                    ]}
                    onChange={(val) => {
                      const wf = val as any;
                      setWaveform(wf);
                      Sound.config.waveform = wf;
                    }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Secondary Harmonic Oscillator
                  </label>
                  <PaperDropdown
                    value={secondaryWaveform}
                    options={[
                      { value: 'sine', label: 'Sine (Sub Octave)', badge: 'SUB', subtitle: 'Adds warm low-end body' },
                      { value: 'triangle', label: 'Triangle (Smooth Tone)', badge: 'WARM', subtitle: 'Gentle harmonic reinforcement' },
                      { value: 'sawtooth', label: 'Sawtooth (Bright Overtone)', badge: 'SHARP', subtitle: 'Sparkling upper harmonics' },
                      { value: 'square', label: 'Square (Chiptune Crunch)', badge: '8-BIT', subtitle: 'Hollow retro overtone layer' },
                    ]}
                    onChange={(val) => {
                      const wf = val as any;
                      setSecondaryWaveform(wf);
                      Sound.config.secondaryWaveform = wf;
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Envelope Decay</span>
                    <span className="mono-num">{decayTime.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.55"
                    step="0.02"
                    value={decayTime}
                    onChange={(e) => {
                      const dt = Number(e.target.value);
                      setDecayTime(dt);
                      Sound.config.decayTime = dt;
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>Master Synth Volume</span>
                    <span className="mono-num">{Math.round(masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={masterVolume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMasterVolume(v);
                      Sound.config.volume = v;
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 3. Interactive Piano Keyboard Test Notes */}
            <div className="paper-card bg-indigo-50 p-3 space-y-2 border-2 border-indigo-900 landscape:col-span-2 lg:col-span-2">
              <span className="text-xs font-black uppercase text-indigo-950 block">
                3. Interactive Scale Notes & Sound FX Tests
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1 bg-white p-2 border border-slate-300 rounded shadow-inner">
                {['Do (C)', 'Re (D)', 'Mi (E)', 'Fa (F)', 'Sol (G)', 'La (A)', 'Si (B)', 'High Do'].map((noteName, nIdx) => (
                  <button
                    key={noteName}
                    type="button"
                    onClick={() => {
                      Sound.init();
                      Sound.playBounceNote(1.0 + nIdx * 0.1);
                    }}
                    className="paper-btn bg-slate-50 hover:bg-indigo-100 active:bg-indigo-300 text-[10px] px-2.5 py-3 font-bold text-slate-900 border flex flex-col items-center min-w-[50px] shadow-xs"
                  >
                    <span className="text-[9px] text-slate-500 font-normal">#{nIdx + 1}</span>
                    <span className="font-black text-indigo-950">{noteName}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    Sound.init();
                    Sound.playBounceNote(1.2);
                  }}
                  className="paper-btn bg-amber-200 hover:bg-amber-300 text-amber-950 text-[11px] py-1.5 font-black flex items-center justify-center gap-1 shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Bounce Note
                </button>
                <button
                  type="button"
                  onClick={() => {
                    Sound.init();
                    Sound.play('gate_break');
                  }}
                  className="paper-btn bg-purple-200 hover:bg-purple-300 text-purple-950 text-[11px] py-1.5 font-black flex items-center justify-center gap-1 shadow-xs"
                >
                  <Shield className="w-3.5 h-3.5" /> Gate Shatter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    Sound.init();
                    Sound.play('win_fanfare');
                  }}
                  className="paper-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 text-[11px] py-1.5 font-black flex items-center justify-center gap-1 shadow-xs"
                >
                  <Flag className="w-3.5 h-3.5" /> Win Fanfare
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </HistoryContext.Provider>
  );
};
