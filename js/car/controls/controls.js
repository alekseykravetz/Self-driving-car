export var ControlType;
(function (ControlType) {
    ControlType["KEYS"] = "KEYS";
    ControlType["DUMMY"] = "DUMMY";
    ControlType["AI"] = "AI";
    // CAMERA = 'CAMERA', // Assuming possibility
    // PHONE = 'PHONE', // Assuming possibility
})(ControlType || (ControlType = {}));
export class Controls {
    forward;
    left;
    right;
    reverse;
    constructor(type) {
        this.forward = false;
        this.left = false;
        this.right = false;
        this.reverse = false;
        switch (type) {
            case ControlType.KEYS:
            case 'KEYS': // Allow string comparison too
                this.#addKeyboardListeners();
                break;
            case ControlType.DUMMY:
            case 'DUMMY':
                this.forward = true; // Dummy cars always move forward
                break;
            case ControlType.AI:
            case 'AI':
                // AI controls are typically set externally (e.g., by the Car class update method)
                // No listeners needed here, properties will be updated.
                break;
            // Add cases for CAMERA, PHONE if those directly integrate here
            // case ControlType.CAMERA:
            //    // Potentially initialize or link camera controls
            //    break;
            // case ControlType.PHONE:
            //    // Potentially initialize or link phone controls
            //    break;
        }
    }
    #addKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                    this.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.right = true;
                    break;
                case 'ArrowUp':
                case 'w':
                    this.forward = true;
                    break;
                case 'ArrowDown':
                case 's':
                    this.reverse = true;
                    break;
            }
        });
        document.addEventListener('keyup', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                    this.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.right = false;
                    break;
                case 'ArrowUp':
                case 'w':
                    this.forward = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.reverse = false;
                    break;
            }
        });
    }
}
