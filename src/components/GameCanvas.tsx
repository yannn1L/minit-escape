import React, { useRef, useEffect } from 'react';
import type { RaceSimulation } from '../simulation/RaceSimulation';
import { Sound } from '../core/audio/SoundEngine';

interface GameCanvasProps {
  simulation: RaceSimulation;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ simulation }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const updateCanvasResolution = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width > 0 ? rect.width : container.clientWidth || 500;
      const height = rect.height > 0 ? rect.height : container.clientHeight || 800;
      const aspect = width / Math.max(1, height);

      // Keep world scale consistent while matching exact container aspect ratio
      let vW = 500;
      let vH = 800;
      if (aspect >= 1) {
        // Landscape or square container
        vH = 600;
        vW = Math.round(vH * aspect);
      } else {
        // Portrait container
        vW = 500;
        vH = Math.round(vW / aspect);
      }

      simulation.virtualWidth = vW;
      simulation.virtualHeight = vH;
      simulation.containerCssWidth = width;
      simulation.containerCssHeight = height;
      simulation.syncCanvasBufferResolution();
    };

    simulation.attachCanvas(canvas);
    updateCanvasResolution();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasResolution();
    });
    resizeObserver.observe(container);

    // Mouse wheel zoom gesture
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      simulation.zoomBy(factor);
    };

    // Touch pinch gesture
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDistRef.current !== null && lastPinchDistRef.current > 0) {
          const factor = dist / lastPinchDistRef.current;
          simulation.zoomBy(factor);
        }
        lastPinchDistRef.current = dist;
      }
    };

    const handleTouchEnd = () => {
      lastPinchDistRef.current = null;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      simulation.detachCanvas();
    };
  }, [simulation]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    Sound.init();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current || !canvasRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 5) {
      dragStartRef.current.moved = true;
      if (simulation.cameraConfig?.type === 'manual') {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = simulation.virtualWidth / Math.max(1, rect.width);
        const scaleY = simulation.virtualHeight / Math.max(1, rect.height);
        simulation.pan(dx * scaleX, dy * scaleY);
        dragStartRef.current.x = e.clientX;
        dragStartRef.current.y = e.clientY;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const startInfo = dragStartRef.current;
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    // If it was a click/tap without dragging: check if player clicked a racer to follow them!
    if (!startInfo || !startInfo.moved) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = simulation.virtualWidth / Math.max(1, rect.width);
      const scaleY = simulation.virtualHeight / Math.max(1, rect.height);
      const screenX = (e.clientX - rect.left) * scaleX;
      const screenY = (e.clientY - rect.top) * scaleY;

      // Transform screen coordinates to world coordinates via camera
      const cx = simulation.virtualWidth / 2;
      const cy = simulation.virtualHeight / 2;
      const camZ = simulation.camZoom || 1.0;
      const worldX = (simulation.camX || 250) + (screenX - cx) / camZ;
      const worldY = (simulation.camY || 400) + (screenY - cy) / camZ;

      // Check if a racer was clicked (within generous radius of 36px)
      const clickedRacer = simulation.findRacerAt(worldX, worldY, 36);
      if (clickedRacer) {
        simulation.cameraConfig.type = 'selected_racer';
        simulation.cameraConfig.targetRacerId = clickedRacer.team.id;
        simulation.spawnFloatingText(
          clickedRacer.x,
          clickedRacer.y - 18,
          `FOLLOWING ${clickedRacer.team.name}!`,
          clickedRacer.team.hex
        );
        Sound.play('button_click');
      }
    }
  };

  const isManualCam = simulation.cameraConfig?.type === 'manual';

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      className="relative w-full h-full flex-1 min-h-0 overflow-hidden rounded-lg border-2 border-slate-900/30"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStartRef.current = null; }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        className={`w-full h-full block select-none touch-none ${
          isManualCam ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
        title={
          isManualCam
            ? 'Drag to pan around track, scroll wheel or pinch to zoom.'
            : 'Click any racer to follow them, or pinch/scroll to zoom!'
        }
      />
    </div>
  );
};


