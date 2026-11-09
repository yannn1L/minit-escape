import { World } from '../core/ecs/World';
import { GlobalRegistry } from '../core/registry/StrategyRegistry';
import '../core/registry/MapRegistry';
import '../core/registry/PickupRegistry';
import { Sound } from '../core/audio/SoundEngine';
import { PhysicsSystem } from '../core/systems/PhysicsSystem';
import { PickupSystem } from '../core/systems/PickupSystem';
import { HazardSystem } from '../core/systems/HazardSystem';
import { ProgressSystem } from '../core/systems/ProgressSystem';
import { RenderSystem } from '../core/systems/RenderSystem';
import { Geometry } from '../core/math/Geometry';
import type {
  MapData,
  TeamConfig,
  TeamLiveStats,
  CorridorRect,
  CameraConfig,
  SimulationLayoutConfig
} from '../types/game';
import { DEFAULT_TEAMS, DEFAULT_CAMERA_CONFIG, DEFAULT_LAYOUT_CONFIG } from '../types/game';

export interface Splatter {
  x: number;
  y: number;
  radius: number;
  colorCss: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  message: string;
  color: string;
  life: number;
}

export class RaceSimulation {
  public world = new World();
  public virtualWidth = 500;
  public virtualHeight = 800;

  // In-Game Dynamic Smooth Camera & Layout Config
  public cameraConfig: CameraConfig = { ...DEFAULT_CAMERA_CONFIG };
  public layoutConfig: SimulationLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG };
  public camX = 250;
  public camY = 400;
  public camZoom = 1.0;
  public targetCamX = 250;
  public targetCamY = 400;
  public targetCamZoom = 1.0;

  public canvas: HTMLCanvasElement | null = null;
  public ctx: CanvasRenderingContext2D | null = null;


  public currentMapKey = 'classic_serpentine';
  public currentMap: MapData;

  public teams: TeamConfig[] = JSON.parse(JSON.stringify(DEFAULT_TEAMS));

  public paused = false;
  public speedMultiplier = 1.0;
  public hitStopTimer = 0;
  public shakeIntensity = 0;
  public winnerDeclared = false;
  public winningTeam: TeamConfig | null = null;

  public floodActive = false;
  public floodDist = 0;
  public floodRects: CorridorRect[] = [];
  private floodRectPool: CorridorRect[] = [];
  public wallTriggerTimerRemaining = 0;

  public splatters: Splatter[] = [];
  public dirtySplatters: Splatter[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public trackCacheDirty = true;

  public allEliminatedDeclared = false;

  // Automatic Adaptive HiDPI Scaling state
  public containerCssWidth = 500;
  public containerCssHeight = 800;
  public adaptiveDprScale = 1.0;
  private smoothedFrameMs = 16.6;
  private slowFrameStreak = 0;
  private fastFrameStreak = 0;

  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private lastStatsSignature = '';
  private cachedWallStages: Array<{ maxDuration: number; corridors: CorridorRect[] }> = [];
  private cachedFirstWallCorridor: CorridorRect | null = null;
  private cachedSpawnCenter: { x: number; y: number } = { x: 250, y: 400 };

  // React listener for stats change
  public onStatsUpdate: ((stats: TeamLiveStats[]) => void) | null = null;
  public onWinnerDeclared: ((team: TeamConfig) => void) | null = null;
  public onAllEliminated: (() => void) | null = null;

  constructor() {
    this.currentMap = GlobalRegistry.get<MapData>('map', this.currentMapKey)!;
    this.loadSavedWorkspace();
    this.initSystems();
  }

  public static readonly WORKSPACE_STORAGE_KEY = 'minit_escape_saved_inspector_state_v1';

  public loadSavedWorkspace(): void {
    try {
      const raw = localStorage.getItem(RaceSimulation.WORKSPACE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.mapData && Array.isArray(parsed.mapData.corridors)) {
        const savedMap: MapData = {
          ...this.currentMap,
          ...parsed.mapData,
          cameraConfig: {
            ...DEFAULT_CAMERA_CONFIG,
            ...(parsed.mapData.cameraConfig || {}),
          },
          layoutConfig: {
            ...DEFAULT_LAYOUT_CONFIG,
            ...(parsed.mapData.layoutConfig || {}),
          },
        };
        this.currentMap = savedMap;
        this.currentMapKey = savedMap.id || 'saved_workspace';
        this.cameraConfig = { ...savedMap.cameraConfig! };
        this.layoutConfig = { ...savedMap.layoutConfig! };
      }
      if (parsed && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
        this.teams = parsed.teams;
      }
      if (parsed && parsed.synthConfig) {
        Sound.config = { ...Sound.config, ...parsed.synthConfig };
      }
    } catch (e) {
      console.warn('Failed to restore saved inspector state:', e);
    }
  }

  public saveWorkspace(mapData: MapData, teams?: TeamConfig[]): void {
    const mergedMap: MapData = {
      ...this.currentMap,
      ...mapData,
      cameraConfig: {
        ...DEFAULT_CAMERA_CONFIG,
        ...(mapData.cameraConfig || this.cameraConfig),
      },
      layoutConfig: {
        ...DEFAULT_LAYOUT_CONFIG,
        ...(mapData.layoutConfig || this.layoutConfig),
      },
    };
    this.currentMap = mergedMap;
    this.cameraConfig = { ...mergedMap.cameraConfig! };
    this.layoutConfig = { ...mergedMap.layoutConfig! };
    if (teams && teams.length > 0) {
      this.teams = teams;
    }
    try {
      localStorage.setItem(
        RaceSimulation.WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          mapData: mergedMap,
          teams: this.teams,
          synthConfig: Sound.config,
          savedAt: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Failed to save inspector workspace:', e);
    }
  }

  private initSystems(): void {
    this.world.addSystem(new PhysicsSystem(this));
    this.world.addSystem(new PickupSystem(this));
    this.world.addSystem(new HazardSystem(this));
    this.world.addSystem(new ProgressSystem(this));
    this.world.addSystem(new RenderSystem(this));
  }

  private getMaxInitialDpr(): number {
    if (typeof window === 'undefined') return 2;
    const rawDpr = window.devicePixelRatio || 1;
    return Math.max(1.75, Math.min(rawDpr, 2.25));
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.adaptiveDprScale = this.getMaxInitialDpr();
    this.smoothedFrameMs = 16.6;
    this.slowFrameStreak = 0;
    this.fastFrameStreak = 0;
    this.syncCanvasBufferResolution();
    if (this.world.query('RacerState').length === 0) {
      this.loadRace(this.currentMapKey, this.currentMap);
    } else {
      this.notifyStatsChanged(true);
    }
    this.startLoop();
  }

  detachCanvas(): void {
    this.stopLoop();
    this.canvas = null;
    this.ctx = null;
  }

  public syncCanvasBufferResolution(): void {
    if (!this.canvas) return;
    const cssW = this.containerCssWidth > 0 ? this.containerCssWidth : this.virtualWidth;
    const cssH = this.containerCssHeight > 0 ? this.containerCssHeight : this.virtualHeight;
    const targetWidth = Math.max(
      Math.round(this.virtualWidth * 1.5),
      Math.round(cssW * this.adaptiveDprScale)
    );
    const targetHeight = Math.max(
      Math.round(this.virtualHeight * 1.5),
      Math.round(cssH * this.adaptiveDprScale)
    );
    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }
    if (
      this.cameraConfig?.type === 'auto_moving' &&
      !this.floodActive &&
      this.floodDist === 0 &&
      this.cachedFirstWallCorridor
    ) {
      const fwd = this.getForwardWallCameraPos(
        this.cachedFirstWallCorridor,
        false,
        this.camZoom || this.cameraConfig.defaultZoom || 1.0
      );
      this.camX = this.targetCamX = fwd.x;
      this.camY = this.targetCamY = fwd.y;
    }
  }

  startLoop(): void {
    this.stopLoop();
    this.lastTimestamp = performance.now();
    const maxDpr = this.getMaxInitialDpr();
    const loop = (timestamp: number) => {
      const deltaMs = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      // Automatic Adaptive HiDPI Scaling: preserves crispness (never drops below 1.5x)
      if (!this.paused && deltaMs > 0 && deltaMs < 150) {
        this.smoothedFrameMs = this.smoothedFrameMs * 0.85 + deltaMs * 0.15;

        if (this.smoothedFrameMs > 22.0 && this.adaptiveDprScale > 1.5) {
          this.slowFrameStreak++;
          this.fastFrameStreak = 0;
          if (this.slowFrameStreak >= 18) {
            this.adaptiveDprScale = Math.max(1.5, Math.round((this.adaptiveDprScale - 0.2) * 100) / 100);
            this.slowFrameStreak = 0;
            this.syncCanvasBufferResolution();
          }
        } else if (this.smoothedFrameMs < 15.0 && this.adaptiveDprScale < maxDpr) {
          this.fastFrameStreak++;
          this.slowFrameStreak = Math.max(0, this.slowFrameStreak - 1);
          if (this.fastFrameStreak >= 90) {
            this.adaptiveDprScale = Math.min(maxDpr, Math.round((this.adaptiveDprScale + 0.2) * 100) / 100);
            this.fastFrameStreak = 0;
            this.syncCanvasBufferResolution();
          }
        } else {
          this.slowFrameStreak = Math.max(0, this.slowFrameStreak - 1);
        }
      }

      // Allow up to 65ms (~15 FPS) catch-up so WebView frame drops never cause slow-motion gameplay
      const rawDt = Math.min(0.065, Math.max(0.001, deltaMs / 1000));
      this.tick(rawDt);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  loadRace(mapKey: string, customMapData?: MapData): void {
    this.currentMapKey = mapKey;
    if (customMapData) {
      this.currentMap = customMapData;
      GlobalRegistry.register('map', customMapData.id, customMapData);
    } else {
      const map = GlobalRegistry.get<MapData>('map', mapKey);
      if (map) this.currentMap = map;
    }

    this.world.clear();
    this.splatters.length = 0;
    this.dirtySplatters.length = 0;
    this.particles.length = 0;
    this.floatingTexts.length = 0;
    this.floodRects.length = 0;
    this.floodDist = 0;
    this.winnerDeclared = false;
    this.winningTeam = null;
    this.allEliminatedDeclared = false;
    this.trackCacheDirty = true;
    this.lastStatsSignature = '';
    Sound.resetNoteIndex();

    this.rebuildWallStagesCache();

    // Setup Camera & Layout Config (cloned so runtime mutations never overwrite map defaults)
    this.cameraConfig = {
      ...DEFAULT_CAMERA_CONFIG,
      ...(customMapData?.cameraConfig || this.currentMap.cameraConfig),
    };
    this.layoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      ...(customMapData?.layoutConfig || this.currentMap.layoutConfig),
    };

    const activeTeams = this.teams.filter(t => t.enabled !== false);
    const finalTeams = activeTeams.length > 0 ? activeTeams : this.teams.slice(0, 2);
    const rawSpawns = this.currentMap.baySpawns && this.currentMap.baySpawns.length > 0
      ? this.currentMap.baySpawns
      : finalTeams.map((t, i) => {
          const c0 = this.currentMap.corridors?.[0] || { x: 100, y: 400, w: 120, h: 80 };
          const cols = Math.min(4, finalTeams.length);
          const col = i % cols;
          const row = Math.floor(i / cols);
          const totalRows = Math.ceil(finalTeams.length / cols);
          return {
            x: Math.round(c0.x + ((col + 1) / (cols + 1)) * c0.w),
            y: Math.round(c0.y + ((row + 1) / (totalRows + 1)) * c0.h),
            vx: (i % 2 === 0 ? 1 : -1) * 3.0,
            vy: (row % 2 === 0 ? -1 : 1) * 2.0,
            teamId: t.id,
          };
        });

    const resolvedSpawns = finalTeams.map((team, idx) => {
      const teamIdx = this.teams.findIndex(t => t.id === team.id);
      const sp =
        rawSpawns.find(s => s.teamId === team.id) ||
        (teamIdx >= 0 && teamIdx < rawSpawns.length ? rawSpawns[teamIdx] : rawSpawns[idx % rawSpawns.length]);
      return { team, sp };
    });

    const startZoom = Number(this.cameraConfig.defaultZoom);
    const validStartZoom = !isNaN(startZoom) && startZoom > 0 ? startZoom : 1.0;

    let initX = 250;
    let initY = 400;
    if (this.cameraConfig.type === 'auto_moving') {
      if (this.cachedFirstWallCorridor) {
        const fwd = this.getForwardWallCameraPos(this.cachedFirstWallCorridor, false, validStartZoom);
        initX = fwd.x;
        initY = fwd.y;
      } else if (resolvedSpawns.length > 0) {
        initX = resolvedSpawns.reduce((sum, item) => sum + item.sp.x, 0) / resolvedSpawns.length;
        initY = resolvedSpawns.reduce((sum, item) => sum + item.sp.y, 0) / resolvedSpawns.length;
      }
    } else if (this.cameraConfig.type === 'selected_racer' && resolvedSpawns.length > 0) {
      const targetSpawn =
        this.cameraConfig.targetRacerId && this.cameraConfig.targetRacerId !== 'leader'
          ? resolvedSpawns.find(r => r.team.id === this.cameraConfig.targetRacerId) || resolvedSpawns[0]
          : resolvedSpawns[0];
      initX = targetSpawn.sp.x;
      initY = targetSpawn.sp.y;
    } else if (resolvedSpawns.length > 0) {
      initX = resolvedSpawns.reduce((sum, item) => sum + item.sp.x, 0) / resolvedSpawns.length;
      initY = resolvedSpawns.reduce((sum, item) => sum + item.sp.y, 0) / resolvedSpawns.length;
    } else if (this.currentMap.corridors && this.currentMap.corridors.length > 0) {
      const c0 = this.currentMap.corridors[0];
      initX = c0.x + c0.w / 2;
      initY = c0.y + c0.h / 2;
    }

    this.camX = this.targetCamX = initX;
    this.camY = this.targetCamY = initY;
    this.camZoom = this.targetCamZoom = validStartZoom;

    // Setup wall trigger mode
    const mode = this.currentMap.wallTriggerMode || 'gate_destroy';
    if (mode === 'immediate') {
      this.floodActive = true;
      this.wallTriggerTimerRemaining = 0;
    } else if (mode === 'timer') {
      this.floodActive = false;
      this.wallTriggerTimerRemaining = this.currentMap.wallTriggerTimer !== undefined ? this.currentMap.wallTriggerTimer : 5.0;
    } else {
      this.floodActive = false;
      this.wallTriggerTimerRemaining = 0;
    }

    // Spawn gates
    for (const gDef of this.currentMap.gates) {
      this.spawnGate(gDef);
    }

    // Spawn static and moving barriers
    if (this.currentMap.barriers) {
      for (const bDef of this.currentMap.barriers) {
        this.spawnBarrier(bDef);
      }
    }

    // Spawn pickups
    for (const pDef of this.currentMap.pickups) {
      this.spawnPickup(pDef.type, pDef.x, pDef.y, 0);
    }

    // Spawn selected Racers at their configured spawn positions
    resolvedSpawns.forEach(({ team, sp }) => {
      this.spawnRacer(team, sp.x, sp.y, sp.vx, sp.vy);
    });

    this.notifyStatsChanged(true);
  }

  private rebuildWallStagesCache(): void {
    this.cachedWallStages = [];
    this.cachedFirstWallCorridor = null;

    if (this.currentMap.baySpawns && this.currentMap.baySpawns.length > 0) {
      const avgX = this.currentMap.baySpawns.reduce((sum, s) => sum + s.x, 0) / this.currentMap.baySpawns.length;
      const avgY = this.currentMap.baySpawns.reduce((sum, s) => sum + s.y, 0) / this.currentMap.baySpawns.length;
      this.cachedSpawnCenter = { x: avgX, y: avgY };
    } else if (this.currentMap.corridors && this.currentMap.corridors.length > 0) {
      const c0 = this.currentMap.corridors[0];
      this.cachedSpawnCenter = { x: c0.x + c0.w / 2, y: c0.y + c0.h / 2 };
    }

    if (!this.currentMap.corridors) return;

    const orderGroups = new Map<number, CorridorRect[]>();
    for (let i = 0; i < this.currentMap.corridors.length; i++) {
      const c = this.currentMap.corridors[i];
      if (!c.hasMovingWall) continue;
      const order = c.wallOrder !== undefined ? c.wallOrder : i + 1;
      let list = orderGroups.get(order);
      if (!list) {
        list = [];
        orderGroups.set(order, list);
      }
      list.push(c);
    }

    const sortedOrders = Array.from(orderGroups.keys()).sort((a, b) => a - b);
    for (let i = 0; i < sortedOrders.length; i++) {
      const corridors = orderGroups.get(sortedOrders[i])!;
      if (i === 0 && corridors.length > 0) {
        this.cachedFirstWallCorridor = corridors[0];
      }
      let maxDuration = 0;
      for (let j = 0; j < corridors.length; j++) {
        const c = corridors[j];
        const speed = c.wallSpeed || 55;
        const dist = c.wallDirection === 'left' || c.wallDirection === 'right' ? c.w : c.h;
        const dur = dist / speed + (c.wallDelay || 0);
        if (dur > maxDuration) maxDuration = dur;
      }
      this.cachedWallStages.push({ maxDuration, corridors });
    }
  }

  spawnRacer(team: TeamConfig, x: number, y: number, vx: number, vy: number): number {
    const id = this.world.createEntity();
    const size = 20;

    this.world.addComponent(id, 'Transform', { x, y });
    this.world.addComponent(id, 'Velocity', { vx: vx * 60, vy: vy * 60 });
    this.world.addComponent(id, 'Collider', { size });
    this.world.addComponent(id, 'RacerState', {
      team,
      alive: true,
      progress: 0,
      weapon: null,
      weaponCooldown: 0,
      shield: false,
      speedBoostTimer: 0,
      invulnTimer: 0.2,
      petrifiedBy: null,
    });
    this.world.addComponent(id, 'PaperRender', {
      scaleX: 1,
      scaleY: 1,
      trail: [],
    });

    return id;
  }

  spawnGate(gDef: any): number {
    const id = this.world.createEntity();
    this.world.addComponent(id, 'Transform', { x: gDef.x, y: gDef.y });
    this.world.addComponent(id, 'Gate', {
      id: gDef.id,
      w: gDef.w,
      h: gDef.h,
      hp: gDef.hp,
      maxHp: gDef.hp,
      color: gDef.color,
      orientation: gDef.orientation,
      triggersFlood: !!gDef.triggersFlood,
      unlockTeamId: gDef.unlockTeamId,
      lastHitTime: 0,
      hitFlash: 0,
    });
    return id;
  }

  spawnBarrier(bDef: any): number {
    const id = this.world.createEntity();
    this.world.addComponent(id, 'Transform', { x: bDef.x, y: bDef.y });
    this.world.addComponent(id, 'Barrier', {
      id: bDef.id,
      w: bDef.w,
      h: bDef.h,
      baseX: bDef.x,
      baseY: bDef.y,
      movement: bDef.movement || 'static',
      speed: bDef.speed || 40,
      distance: bDef.distance || 60,
      phase: 0,
      color: bDef.color || 0x475569,
    });
    return id;
  }

  spawnPickup(strategyKey: string, x: number, y: number, spawnDelay = 0): number {
    const id = this.world.createEntity();
    this.world.addComponent(id, 'Transform', { x, y });
    this.world.addComponent(id, 'Pickup', {
      strategyKey,
      bobPhase: Math.random() * Math.PI * 2,
      spawnDelay,
    });
    return id;
  }

  private pushFloodRect(x: number, y: number, w: number, h: number, wallDirection: 'right' | 'left' | 'up' | 'down'): void {
    const idx = this.floodRects.length;
    let slot = this.floodRectPool[idx];
    if (!slot) {
      slot = { x, y, w, h, wallDirection };
      this.floodRectPool[idx] = slot;
    } else {
      slot.x = x;
      slot.y = y;
      slot.w = w;
      slot.h = h;
      slot.wallDirection = wallDirection;
    }
    this.floodRects.push(slot);
  }

  updateFloodRects(): void {
    this.floodRects.length = 0;
    if (!this.floodActive || this.cachedWallStages.length === 0) return;

    let budgetTime = this.floodDist / 52; // Total active flood seconds available

    for (let o = 0; o < this.cachedWallStages.length; o++) {
      const stage = this.cachedWallStages[o];
      const group = stage.corridors;

      for (let i = 0; i < group.length; i++) {
        const c = group[i];
        const speed = c.wallSpeed || 55;
        const delay = c.wallDelay || 0;
        const dir = c.wallDirection || 'right';

        if (budgetTime > delay) {
          const activeTime = budgetTime - delay;

          if (dir === 'right') {
            const fillW = Math.min(c.w, activeTime * speed);
            if (fillW > 0) this.pushFloodRect(c.x, c.y, fillW, c.h, 'right');
          } else if (dir === 'left') {
            const fillW = Math.min(c.w, activeTime * speed);
            if (fillW > 0) this.pushFloodRect(c.x + c.w - fillW, c.y, fillW, c.h, 'left');
          } else if (dir === 'up') {
            const fillH = Math.min(c.h, activeTime * speed);
            if (fillH > 0) this.pushFloodRect(c.x, c.y + c.h - fillH, c.w, fillH, 'up');
          } else if (dir === 'down') {
            const fillH = Math.min(c.h, activeTime * speed);
            if (fillH > 0) this.pushFloodRect(c.x, c.y, c.w, fillH, 'down');
          }
        }
      }

      if (budgetTime < stage.maxDuration) {
        break;
      }
      budgetTime -= stage.maxDuration;
    }
  }

  isPointInFlood(x: number, y: number): boolean {
    for (let i = 0; i < this.floodRects.length; i++) {
      const r = this.floodRects[i];
      if (Geometry.pointInRect(x, y, r.x, r.y, r.w, r.h)) {
        return true;
      }
    }
    return false;
  }

  spawnInkSplatter(x: number, y: number, colorHex: number): void {
    if (this.splatters.length > 72) return;
    const colorCss = `#${colorHex.toString(16).padStart(6, '0')}`;
    const mainSplat: Splatter = { x, y, radius: 13, colorCss };
    this.splatters.push(mainSplat);
    this.dirtySplatters.push(mainSplat);
    for (let i = 0; i < 4; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 18;
      const drop: Splatter = {
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        radius: 2.5 + Math.random() * 3,
        colorCss,
      };
      this.splatters.push(drop);
      this.dirtySplatters.push(drop);
    }
  }

  spawnConfetti(x: number, y: number, colorHex: number, count = 14): void {
    const color = `#${colorHex.toString(16).padStart(6, '0')}`;
    const available = Math.max(0, 120 - this.particles.length);
    const toSpawn = Math.min(count, available);
    for (let i = 0; i < toSpawn; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 30,
        size: 3.5 + Math.random() * 4.5,
        color,
        life: 0.42 + Math.random() * 0.3,
      });
    }
  }

  spawnFloatingText(x: number, y: number, message: string, colorHex: number): void {
    if (this.floatingTexts.length > 20) this.floatingTexts.shift();
    const color = `#${colorHex.toString(16).padStart(6, '0')}`;
    this.floatingTexts.push({
      x,
      y,
      vy: -42,
      message,
      color,
      life: 0.85,
    });
  }

  triggerHitStop(duration: number): void {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  addScreenShake(amount: number): void {
    this.shakeIntensity = Math.min(14, this.shakeIntensity + amount);
  }

  declareWinner(team: TeamConfig): void {
    this.winnerDeclared = true;
    this.winningTeam = team;
    Sound.play('win_fanfare');
    this.addScreenShake(10);

    const fz = this.currentMap.finishZone;
    this.spawnConfetti(fz.x + fz.w / 2, fz.y + fz.h / 2, team.hex, 36);
    this.spawnConfetti(fz.x + fz.w / 2, fz.y + fz.h / 2, 0xfacc15, 24);

    if (this.onWinnerDeclared) {
      this.onWinnerDeclared(team);
    }
  }

  triggerCloneWave(): void {
    Sound.init();
    const racers = this.world.query('Transform', 'Velocity', 'RacerState');
    if (racers.length > 40) return; // Performance cap for low-end devices

    let cloned = 0;
    for (let i = 0; i < racers.length; i++) {
      const id = racers[i];
      const st = this.world.getComponent(id, 'RacerState')!;
      if (!st.alive) continue;
      const pos = this.world.getComponent(id, 'Transform')!;
      const vel = this.world.getComponent(id, 'Velocity')!;
      this.spawnRacer(st.team, pos.x, pos.y, -vel.vx / 60, vel.vy / 60);
      this.spawnConfetti(pos.x, pos.y, st.team.hex, 6);
      cloned++;
    }

    if (cloned > 0) {
      Sound.play('cherry_clone');
      this.addScreenShake(4);
    }
  }

  notifyStatsChanged(force = false): void {
    if (!this.onStatsUpdate) return;
    const racers = this.world.query('RacerState');

    const activeTeams = this.teams.filter(t => t.enabled !== false);
    const targetTeams = activeTeams.length > 0 ? activeTeams : this.teams.slice(0, 2);

    const stats: TeamLiveStats[] = targetTeams.map(team => {
      let maxProgress = 0;
      let anyAlive = false;
      let aliveCount = 0;

      for (let i = 0; i < racers.length; i++) {
        const id = racers[i];
        const st = this.world.getComponent(id, 'RacerState')!;
        if (st.team.id === team.id) {
          if (st.progress > maxProgress) maxProgress = st.progress;
          if (st.alive) {
            anyAlive = true;
            aliveCount++;
          }
        }
      }
      return { team, maxProgress, anyAlive, aliveCount };
    });

    stats.sort((a, b) => {
      if (b.maxProgress !== a.maxProgress) return b.maxProgress - a.maxProgress;
      if (a.anyAlive !== b.anyAlive) return a.anyAlive ? -1 : 1;
      return 0;
    });

    let sig = '';
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      sig += `${s.team.id}:${s.maxProgress}:${s.aliveCount}|`;
    }
    if (!force && sig === this.lastStatsSignature) return;
    this.lastStatsSignature = sig;

    this.onStatsUpdate(stats);
  }

  tick(rawDt: number): void {
    if (this.paused) return;

    let dt = Math.min(0.065, rawDt) * this.speedMultiplier;

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDt;
      dt *= 0.08;
    }

    // Countdown wall trigger timer if mode is 'timer'
    if (!this.floodActive && this.currentMap.wallTriggerMode === 'timer') {
      if (this.wallTriggerTimerRemaining > 0) {
        this.wallTriggerTimerRemaining -= rawDt;
        if (this.wallTriggerTimerRemaining <= 0) {
          this.floodActive = true;
          this.spawnFloatingText(250, 400, 'MOVING WALL ACTIVATED!', 0x06f9f9);
        }
      }
    }

    this.world.update(dt);

    // Check if all racers are eliminated and race has not completed
    if (!this.winnerDeclared && !this.allEliminatedDeclared) {
      const racers = this.world.query('RacerState');
      if (racers.length > 0) {
        let anyAlive = false;
        for (let i = 0; i < racers.length; i++) {
          const st = this.world.getComponent(racers[i], 'RacerState')!;
          if (st.alive) {
            anyAlive = true;
            break;
          }
        }
        if (!anyAlive) {
          this.allEliminatedDeclared = true;
          Sound.play('game_over');
          this.addScreenShake(8);
          this.spawnFloatingText(250, 380, 'ALL RACERS ELIMINATED!', 0xef4444);
          if (this.onAllEliminated) {
            this.onAllEliminated();
          }
        }
      }
    }

    // Update particles with O(1) swap-and-pop removal
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= rawDt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      p.x += p.vx * rawDt;
      p.y += p.vy * rawDt;
      p.vy += 260 * rawDt;
    }

    // Update floating texts with O(1) swap-and-pop removal
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= rawDt;
      if (ft.life <= 0) {
        this.floatingTexts[i] = this.floatingTexts[this.floatingTexts.length - 1];
        this.floatingTexts.pop();
        continue;
      }
      ft.y += ft.vy * rawDt;
    }

    // Screen shake decay
    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= 0.85;
    } else {
      this.shakeIntensity = 0;
    }

    // Smooth In-Game Dynamic Camera Update
    this.updateCamera(rawDt);
  }

  private getForwardWallCameraPos(
    rect: CorridorRect,
    isFloodRect: boolean,
    zoom: number
  ): { x: number; y: number } {
    const dir = rect.wallDirection || 'right';
    const z = Math.max(0.25, zoom || 1.0);
    const forwardX = (this.virtualWidth / z) * 0.32;
    const forwardY = (this.virtualHeight / z) * 0.32;

    if (dir === 'right') {
      const edgeX = isFloodRect ? rect.x + rect.w : rect.x;
      return { x: edgeX + forwardX, y: rect.y + rect.h / 2 };
    }
    if (dir === 'left') {
      const edgeX = isFloodRect ? rect.x : rect.x + rect.w;
      return { x: edgeX - forwardX, y: rect.y + rect.h / 2 };
    }
    if (dir === 'up') {
      const edgeY = isFloodRect ? rect.y : rect.y + rect.h;
      return { x: rect.x + rect.w / 2, y: edgeY - forwardY };
    }
    // dir === 'down'
    const edgeY = isFloodRect ? rect.y + rect.h : rect.y;
    return { x: rect.x + rect.w / 2, y: edgeY + forwardY };
  }

  private getStageCorridorCameraPos(
    c: CorridorRect,
    stageBudgetTime: number,
    zoom: number
  ): { x: number; y: number } {
    const speed = c.wallSpeed || 55;
    const delay = c.wallDelay || 0;
    const dir = c.wallDirection || 'right';
    const activeTime = Math.max(0, stageBudgetTime - delay);
    const z = Math.max(0.25, zoom || 1.0);
    const forwardX = (this.virtualWidth / z) * 0.32;
    const forwardY = (this.virtualHeight / z) * 0.32;

    if (dir === 'right') {
      const fillW = Math.min(c.w, activeTime * speed);
      return { x: c.x + fillW + forwardX, y: c.y + c.h / 2 };
    }
    if (dir === 'left') {
      const fillW = Math.min(c.w, activeTime * speed);
      return { x: c.x + c.w - fillW - forwardX, y: c.y + c.h / 2 };
    }
    if (dir === 'up') {
      const fillH = Math.min(c.h, activeTime * speed);
      return { x: c.x + c.w / 2, y: c.y + c.h - fillH - forwardY };
    }
    // dir === 'down'
    const fillH = Math.min(c.h, activeTime * speed);
    return { x: c.x + c.w / 2, y: c.y + fillH + forwardY };
  }

  updateCamera(dt: number): void {
    const config = this.cameraConfig || DEFAULT_CAMERA_CONFIG;

    if (config.type === 'auto_moving') {
      const activeZoom = this.camZoom || config.defaultZoom || 1.0;
      // Auto Moving Cam: Position camera forward ahead of the moving wall's leading edge
      // and smoothly predict/pan toward the next wall order when progress reaches predictNextOrderAt%
      if (this.floodActive && this.cachedWallStages.length > 0) {
        let budgetTime = this.floodDist / 52;
        let activeStageIdx = 0;

        for (let o = 0; o < this.cachedWallStages.length; o++) {
          const stage = this.cachedWallStages[o];
          if (budgetTime < stage.maxDuration || o === this.cachedWallStages.length - 1) {
            activeStageIdx = o;
            break;
          }
          budgetTime -= stage.maxDuration;
        }

        const activeStage = this.cachedWallStages[activeStageIdx];
        const activeCorridor = activeStage.corridors[activeStage.corridors.length - 1];
        const currPos = this.getStageCorridorCameraPos(activeCorridor, budgetTime, activeZoom);

        const nextStage = this.cachedWallStages[activeStageIdx + 1];
        const predictPct = Math.max(10, Math.min(100, config.predictNextOrderAt ?? 75));
        const threshold = predictPct / 100;
        const stageProgress =
          activeStage.maxDuration > 0
            ? Math.max(0, Math.min(1, budgetTime / activeStage.maxDuration))
            : 1;

        if (
          nextStage &&
          nextStage.corridors.length > 0 &&
          threshold < 1 &&
          stageProgress >= threshold
        ) {
          const nextCorridor = nextStage.corridors[nextStage.corridors.length - 1];
          const nextPos = this.getStageCorridorCameraPos(nextCorridor, 0, activeZoom);
          const rawBlend = Math.max(
            0,
            Math.min(1, (stageProgress - threshold) / (1 - threshold))
          );
          const smoothBlend = rawBlend * rawBlend * (3 - 2 * rawBlend);
          this.targetCamX = currPos.x + (nextPos.x - currPos.x) * smoothBlend;
          this.targetCamY = currPos.y + (nextPos.y - currPos.y) * smoothBlend;
        } else {
          this.targetCamX = currPos.x;
          this.targetCamY = currPos.y;
        }
      } else {
        if (this.cachedFirstWallCorridor) {
          const fwd = this.getForwardWallCameraPos(this.cachedFirstWallCorridor, false, activeZoom);
          this.targetCamX = fwd.x;
          this.targetCamY = fwd.y;
        } else {
          this.targetCamX = this.cachedSpawnCenter.x;
          this.targetCamY = this.cachedSpawnCenter.y;
        }
      }
      this.targetCamZoom = config.defaultZoom || 1.0;
    } else if (config.type === 'selected_racer') {
      // Selected Racer Cam: Follow specific designated racer or current leader
      const racers = this.world.query('Transform', 'RacerState');
      let targetPos: { x: number; y: number } | null = null;

      if (config.targetRacerId && config.targetRacerId !== 'leader') {
        for (let i = 0; i < racers.length; i++) {
          const id = racers[i];
          const st = this.world.getComponent(id, 'RacerState')!;
          if (st.team.id === config.targetRacerId && st.alive) {
            targetPos = this.world.getComponent(id, 'Transform')!;
            break;
          }
        }
      }

      // If specific racer is eliminated or 'leader' is selected, track the highest progress alive racer
      if (!targetPos) {
        let bestProgress = -1;
        for (let i = 0; i < racers.length; i++) {
          const id = racers[i];
          const st = this.world.getComponent(id, 'RacerState')!;
          if (st.alive && st.progress > bestProgress) {
            bestProgress = st.progress;
            targetPos = this.world.getComponent(id, 'Transform')!;
          }
        }
      }

      if (targetPos) {
        this.targetCamX = targetPos.x;
        this.targetCamY = targetPos.y;
      }
      this.targetCamZoom = config.defaultZoom || 1.0;
    } else if (config.type === 'manual') {
      // Manual Cam: Position and zoom are adjusted by player dragging & scrolling
      const minZ = config.minZoom || 0.4;
      const maxZ = config.maxZoom || 2.5;
      this.targetCamZoom = Math.max(minZ, Math.min(maxZ, this.targetCamZoom));
    }

    // Buttery-smooth exponential lerp (frame-rate independent damping)
    const speed = Math.max(1, config.smoothSpeed || 4.5);
    const lerpFactor = 1 - Math.exp(-speed * dt);
    this.camX += (this.targetCamX - this.camX) * lerpFactor;
    this.camY += (this.targetCamY - this.camY) * lerpFactor;
    this.camZoom += (this.targetCamZoom - this.camZoom) * lerpFactor;
  }

  pan(dx: number, dy: number): void {
    if (this.cameraConfig.type !== 'manual') return;
    const z = Math.max(0.1, this.camZoom);
    this.targetCamX -= dx / z;
    this.targetCamY -= dy / z;
  }

  zoomBy(factor: number): void {
    const minZ = this.cameraConfig.minZoom || 0.35;
    const maxZ = this.cameraConfig.maxZoom || 2.5;
    const nextZoom = Math.max(minZ, Math.min(maxZ, this.targetCamZoom * factor));
    this.targetCamZoom = nextZoom;
    this.cameraConfig.defaultZoom = nextZoom;
  }

  findRacerAt(x: number, y: number, radius = 30): { id: number; team: TeamConfig; x: number; y: number } | null {
    const racers = this.world.query('Transform', 'RacerState', 'Collider');
    let closest: { id: number; team: TeamConfig; x: number; y: number; dist: number } | null = null;
    for (let i = 0; i < racers.length; i++) {
      const id = racers[i];
      const st = this.world.getComponent(id, 'RacerState')!;
      if (!st.alive) continue;
      const pos = this.world.getComponent(id, 'Transform')!;
      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist <= radius) {
        if (!closest || dist < closest.dist) {
          closest = { id, team: st.team, x: pos.x, y: pos.y, dist };
        }
      }
    }
    return closest ? { id: closest.id, team: closest.team, x: closest.x, y: closest.y } : null;
  }
}



