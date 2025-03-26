class CameraControls {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.tilt = 0;
    this.forward = true;
    this.reverse = false;

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
          this.#loop();
        };
      })
      .catch((err) => {
        alert(err);
      });
  }

  #processMarkers({ leftMarker, rightMarker }) {
    this.tilt = Math.atan2(
      rightMarker.centroid.y - leftMarker.centroid.y,
      rightMarker.centroid.x - leftMarker.centroid.x
    );

    const wheelCenter = average(leftMarker.centroid, rightMarker.centroid);
    const wheelRadius = distance(wheelCenter, leftMarker.centroid);

    this.ctx.beginPath();
    this.ctx.fillStyle = 'red';
    this.ctx.arc(wheelCenter.x, wheelCenter.y, wheelRadius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  #loop() {
    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    const result = this.markerDetector.detect(imageData);

    if (result) {
      this.#processMarkers(result);
    }

    requestAnimationFrame(() => this.#loop());
  }
}
