class CameraControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = this.canvas.width;
    this.tempCanvas.height = this.canvas.height;
    this.tempCtx = this.tempCanvas.getContext('2d');

    this.tilt = 0;
    this.forward = true;
    this.reverse = false;

    this.initializing = true;
    this.expectedSize = 0;

    this.markerDetector = new MarkerDetector();

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((rawData) => {
        this.video = document.createElement('video');
        this.video.srcObject = rawData;
        this.video.play();
        this.video.onloadeddata = () => {
          this.canvas.width = this.video.videoWidth / 4; // to increase performance
          this.canvas.height = this.video.videoHeight / 4; // to increase performance
          this.tempCanvas.width = this.canvas.width;
          this.tempCanvas.height = this.canvas.height;
          this.#loop();
        };
      })
      .catch((err) => {
        alert(err);
      });

    this.canvas.addEventListener('wheel', (e) => {
      this.markerDetector.updateThreshold(-Math.sign(e.deltaY));
    });
  }

  #processMarkers({ leftMarker, rightMarker }) {
    this.tilt = Math.atan2(
      rightMarker.centroid.y - leftMarker.centroid.y,
      rightMarker.centroid.x - leftMarker.centroid.x
    );

    if (this.initializing) {
      this.expectedSize = (leftMarker.radius + rightMarker.radius) / 2;
    }
    const size = (leftMarker.radius + rightMarker.radius) / 2;
    if (size < this.expectedSize * 0.8) {
      this.forward = false;
      this.reverse = true;
    } else {
      this.forward = true;
      this.reverse = false;
    }

    const wheelCenter = average(leftMarker.centroid, rightMarker.centroid);
    const wheelRadius = distance(wheelCenter, leftMarker.centroid);

    this.ctx.beginPath();
    this.ctx.fillStyle = this.forward ? 'blue' : 'red';
    this.ctx.arc(wheelCenter.x, wheelCenter.y, wheelRadius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  #loop() {
    this.initializing = !started; // global variable in Race game

    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    const result = this.markerDetector.detect(imageData);

    if (result) {
      this.#processMarkers(result);

      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i + 3] = 0; // transparent, disable alpha bit
      }

      for (const point of [...result.leftMarker.points, ...result.rightMarker.points]) {
        const index = (point.y * imageData.width + point.x) * 4;
        imageData.data[index + 3] = 255; // alpha
      }

      this.tempCtx.putImageData(imageData, 0, 0);
      this.ctx.drawImage(this.tempCanvas, 0, 0);
    }

    requestAnimationFrame(() => this.#loop());
  }
}
