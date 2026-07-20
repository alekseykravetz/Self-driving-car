export const EDITOR_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <button id="graphBtn" class="editor-mode-btn active" data-mode="graph" data-tooltip="Graph Editor — Add/remove road points and segments (Left-click: add, Right-click: connect, Drag: move)">
        🌐
      </button>
      <button id="markingBtn" class="editor-mode-btn" data-mode="marking" data-tooltip="Marking Editor — Place generic road markings (Left-click: place, Right-click: remove)">
        🔲
      </button>
    </div>
    <div class="controls-divider"></div>
    <div class="controls-group">
      <button id="startBtn" class="editor-mode-btn" data-mode="start" data-tooltip="Start — Place car spawn point (Left-click on road)">🚙</button>
      <button id="targetBtn" class="editor-mode-btn" data-mode="target" data-tooltip="Target — Place race destination (Left-click on road)">🎯</button>
      <button id="stopBtn" class="editor-mode-btn" data-mode="stop" data-tooltip="Stop — Place stop line marking (Left-click on road)">🛑</button>
      <button id="crossingBtn" class="editor-mode-btn" data-mode="crossing" data-tooltip="Crossing — Place pedestrian crosswalk (Left-click on road)">🚶</button>
      <button id="yieldBtn" class="editor-mode-btn" data-mode="yield" data-tooltip="Yield — Place yield sign marking (Left-click on road)">⚠️</button>
      <button id="parkingBtn" class="editor-mode-btn" data-mode="parking" data-tooltip="Parking — Place parking spot (Left-click on road)">🅿️</button>
      <button id="lightBtn" class="editor-mode-btn" data-mode="light" data-tooltip="Traffic Light — Place traffic light (Left-click on road)">🚦</button>
      <button id="corridorBtn" class="editor-mode-btn" data-mode="corridor" data-tooltip="Corridor — Build a corridor between two graph points (Left-click start, then end). Hold/latch T for an open tunnel.">
        🛤️
      </button>
    </div>
`;
