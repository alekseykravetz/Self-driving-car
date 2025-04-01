class WorldEditor {
  constructor(canvas, miniMapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;

    this.world = null;
    this.viewport = null;
    this.miniMap = null;
    this.miniMapViewport = null;
    this.tools = null;
    this.oldGraphHash = null;

    this.generateWorld = true;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;

      this.#initializeWorldEditor(worldInfo);
    } else {
      this.#initializeWorldEditor(world); // global world info
    }
  }

  #addEventListeners() {
    this.worldGenerationInput = document.getElementById('worldGenerationInput');
    this.worldGenerationInput.checked = this.generateWorld;
    this.worldGenerationInput.addEventListener(
      'change',
      this.toggleWorldGeneration.bind(this),
    );

    this.saveBtn = document.getElementById('saveBtn');
    this.disposeBtn = document.getElementById('disposeBtn');
    this.loadWorldInput = document.getElementById('loadWorldInput');

    this.openOsmPanelBtn = document.getElementById('openOsmPanelBtn');
    this.osmPanel = document.getElementById('osmPanel');
    this.closeOsmPanelBtn = document.getElementById('closeOsmPanelBtn');
    this.parseOsmDataBtn = document.getElementById('parseOsmDataBtn');
    this.osmDataContainer = document.getElementById('osmDataContainer');

    this.graphBtn = document.getElementById('graphBtn');
    this.markingBtn = document.getElementById('markingBtn');
    this.startBtn = document.getElementById('startBtn');
    this.targetBtn = document.getElementById('targetBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.crossingBtn = document.getElementById('crossingBtn');
    this.yieldBtn = document.getElementById('yieldBtn');
    this.parkingBtn = document.getElementById('parkingBtn');
    this.lightBtn = document.getElementById('lightBtn');

    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.disposeBtn.addEventListener('click', this.dispose.bind(this));
    this.loadWorldInput.addEventListener(
      'change',
      this.loadWorldFromFile.bind(this),
    );

    this.openOsmPanelBtn.addEventListener(
      'click',
      this.openOsmPanel.bind(this),
    );
    this.closeOsmPanelBtn.addEventListener(
      'click',
      this.closeOsmPanel.bind(this),
    );
    this.parseOsmDataBtn.addEventListener(
      'click',
      this.parseOsmData.bind(this),
    );

    this.graphBtn.addEventListener('click', this.setMode.bind(this, 'graph'));
    this.markingBtn.addEventListener(
      'click',
      this.setMode.bind(this, 'marking'),
    );
    this.startBtn.addEventListener('click', this.setMode.bind(this, 'start'));
    this.targetBtn.addEventListener('click', this.setMode.bind(this, 'target'));
    this.stopBtn.addEventListener('click', this.setMode.bind(this, 'stop'));
    this.crossingBtn.addEventListener(
      'click',
      this.setMode.bind(this, 'crossing'),
    );
    this.yieldBtn.addEventListener('click', this.setMode.bind(this, 'yield'));
    this.parkingBtn.addEventListener(
      'click',
      this.setMode.bind(this, 'parking'),
    );
    this.lightBtn.addEventListener('click', this.setMode.bind(this, 'light'));
  }

  #initializeWorldEditor(worldInfo) {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    this.viewport = new Viewport(
      this.canvas,
      this.world.zoom,
      this.world.offset,
    );
    this.tools = this.initializeEditors(this.viewport, this.world);
    this.oldGraphHash = this.world.graph.hash();
    this.setMode('graph');

    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width,
      0.03,
    );

    this.miniMapViewport = new Viewport(this.miniMapCanvas);
  }

  initializeEditors(viewport, world) {
    return {
      graph: {
        button: this.graphBtn,
        editor: new GraphEditor(viewport, world.graph),
      },
      marking: {
        button: this.markingBtn,
        editor: new MarkingEditor(viewport, world),
      },
      stop: {
        button: this.stopBtn,
        editor: new StopEditor(viewport, world),
      },
      crossing: {
        button: this.crossingBtn,
        editor: new CrossingEditor(viewport, world),
      },
      start: {
        button: this.startBtn,
        editor: new StartEditor(viewport, world),
      },
      parking: {
        button: this.parkingBtn,
        editor: new ParkingEditor(viewport, world),
      },
      light: {
        button: this.lightBtn,
        editor: new LightEditor(viewport, world),
      },
      target: {
        button: this.targetBtn,
        editor: new TargetEditor(viewport, world),
      },
      yield: {
        button: this.yieldBtn,
        editor: new YieldEditor(viewport, world),
      },
    };
  }

  setMode(mode) {
    this.disableEditors();
    this.tools[mode].button.style.backgroundColor = 'white';
    this.tools[mode].button.style.filter = '';
    this.tools[mode].editor.enable();
  }

  disableEditors() {
    for (const tool of Object.values(this.tools)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  save() {
    this.world.zoom = this.viewport.zoom;
    this.world.offset = this.viewport.offset;

    const worldString = JSON.stringify(this.world);

    try {
      localStorage.setItem('world', worldString);
    } catch (error) {
      console.error('World is to big to save in local storage', error);
    }

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' +
        encodeURIComponent(`const world = World.load(${worldString});`),
    );
    element.setAttribute('download', 'name.world');
    element.click();
  }

  dispose() {
    this.tools['graph'].editor.dispose();
    this.world.markings.length = 0;
  }

  loadWorldFromFile(e) {
    const worldFile = e.target.files[0];

    if (!worldFile) {
      alert('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = this.#onLoadWorldFromFileRead.bind(this);
  }

  #onLoadWorldFromFileRead(e) {
    const worldFileContent = e.target.result;

    const removeWorldVariableDeclaration = worldFileContent
      ? worldFileContent.substring(
          worldFileContent.indexOf('(') + 1,
          worldFileContent.lastIndexOf(')'),
        )
      : null;

    if (!removeWorldVariableDeclaration) {
      alert('Wrong file content. use .world extension');
      return;
    }

    const worldInfo = JSON.parse(removeWorldVariableDeclaration);

    this.#initializeWorldEditor(worldInfo);
  }

  openOsmPanel() {
    this.osmPanel.style.display = 'block';
  }

  closeOsmPanel() {
    this.osmPanel.style.display = 'none';
  }

  parseOsmData() {
    const osmData = this.osmDataContainer.value;
    if (!osmData) {
      alert('No OSM data provided');
      return;
    }

    let osmDataJson;
    try {
      osmDataJson = JSON.parse(osmData);
    } catch (error) {
      alert('Invalid OSM data');
      console.log(error);
      return;
    }

    const result = Osm.parseRoads(osmDataJson);
    this.world.graph.points = result.points;
    this.world.graph.segments = result.segments;
    this.closeOsmPanel();
  }

  toggleWorldGeneration() {
    this.generateWorld = !this.generateWorld;
    this.worldGenerationInput.checked = this.generateWorld;
  }

  draw(ctx) {
    this.viewport.reset();
    if (this.world.graph.hash() !== this.oldGraphHash) {
      this.world.generate(this.generateWorld);
      this.oldGraphHash = this.world.graph.hash();
    }
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.world.draw(ctx, viewPoint);
    ctx.globalAlpha = 0.3;
    for (const tool of Object.values(this.tools)) {
      tool.editor.display();
    }

    this.miniMapViewport.reset();
    this.miniMap.update(viewPoint);
  }

  animate() {
    this.draw(this.ctx);
    requestAnimationFrame(this.animate.bind(this));
  }
}
