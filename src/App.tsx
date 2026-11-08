/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useCallback } from 'react';
import { RaceSimulation } from './simulation/RaceSimulation';
import { LoadingScene } from './components/scenes/LoadingScene';
import { EditorScene } from './components/scenes/EditorScene';
import { SimulationScene } from './components/scenes/SimulationScene';
import type { TeamConfig, MapData } from './types/game';

export type SceneState = 'loading' | 'editor' | 'simulation';

export default function App() {
  const simulation = useMemo(() => new RaceSimulation(), []);
  const [currentScene, setCurrentScene] = useState<SceneState>('loading');

  const handleLoadingComplete = useCallback(() => {
    setCurrentScene('editor');
  }, []);

  const handleStartSimulation = useCallback((finalizedMap: MapData, teams: TeamConfig[]) => {
    simulation.teams = teams;
    simulation.loadRace(finalizedMap.id, finalizedMap);
    setCurrentScene('simulation');
  }, [simulation]);

  const handleBackToEditor = useCallback(() => {
    simulation.paused = true;
    setCurrentScene('editor');
  }, [simulation]);

  return (
    <div className="w-screen h-dvh overflow-hidden bg-[#9bb8e8] relative select-none">
      {currentScene === 'loading' && (
        <LoadingScene onLoaded={handleLoadingComplete} />
      )}

      {currentScene === 'editor' && (
        <EditorScene
          currentMap={simulation.currentMap}
          teams={simulation.teams}
          onStartSimulation={handleStartSimulation}
        />
      )}

      {currentScene === 'simulation' && (
        <SimulationScene
          simulation={simulation}
          onBackToEditor={handleBackToEditor}
        />
      )}
    </div>
  );
}
