export const EDITOR_TOOLBAR_TEMPLATE = `
    <div class="controls-group">
      <span class="controls-group-label">Graph</span>
      <div class="border-mode-group">
        <button id="graphBtn" class="toolbar-btn editor-mode-btn active" data-mode="graph" data-tooltip="Graph Editor — Add/remove road points and segments (Left-click: add, Right-click: connect, Drag: move)">
          <app-icon name="graph"></app-icon>
        </button>
      </div>
    </div>
    <div class="controls-separator"></div>
    <div class="controls-group">
      <span class="controls-group-label">Inspect</span>
      <div class="border-mode-group">
        <button id="inspectBtn" class="toolbar-btn editor-mode-btn" data-mode="inspect" data-tooltip="Inspect — Click a road segment to view and edit its metadata (road type, lanes, name, etc.)">
          <app-icon name="inspect"></app-icon>
        </button>
      </div>
    </div>
    <div class="controls-separator" id="editorMarkingsDivider"></div>
    <div class="controls-group" id="editorMarkingsGroup">
      <span class="controls-group-label">Markings</span>
      <div class="border-mode-group">
        <button id="markingBtn" class="toolbar-btn editor-mode-btn" data-mode="marking" data-tooltip="Marking Editor — Place generic road markings (Left-click: place, Right-click: remove)"><app-icon name="marking"></app-icon></button>
        <button id="startBtn" class="toolbar-btn editor-mode-btn" data-mode="start" data-tooltip="Start — Place car spawn point (Left-click on road)"><app-icon name="car"></app-icon></button>
        <button id="targetBtn" class="toolbar-btn editor-mode-btn" data-mode="target" data-tooltip="Target — Place race destination (Left-click on road)"><app-icon name="target"></app-icon></button>
        <button id="stopBtn" class="toolbar-btn editor-mode-btn" data-mode="stop" data-tooltip="Stop — Place stop line marking (Left-click on road)"><app-icon name="stop"></app-icon></button>
        <button id="crossingBtn" class="toolbar-btn editor-mode-btn" data-mode="crossing" data-tooltip="Crossing — Place pedestrian crosswalk (Left-click on road)"><app-icon name="crossing"></app-icon></button>
        <button id="yieldBtn" class="toolbar-btn editor-mode-btn" data-mode="yield" data-tooltip="Yield — Place yield sign marking (Left-click on road)"><app-icon name="yield"></app-icon></button>
        <button id="parkingBtn" class="toolbar-btn editor-mode-btn" data-mode="parking" data-tooltip="Parking — Place parking spot (Left-click on road)"><app-icon name="parking"></app-icon></button>
        <button id="lightBtn" class="toolbar-btn editor-mode-btn" data-mode="light" data-tooltip="Traffic Light — Place traffic light (Left-click on road)"><app-icon name="traffic-light"></app-icon></button>
        <button id="corridorBtn" class="toolbar-btn editor-mode-btn" data-mode="corridor" data-tooltip="Corridor — Build a corridor between two graph points (Left-click start, then end). Hold/latch T for an open tunnel."><app-icon name="corridor"></app-icon></button>
      </div>
    </div>
`;
