window.InputController = class InputController {
  constructor(camera, getClickableNodes, onNodeSelected, orbitSystem) {
    this.camera = camera;
    this.getClickableNodes = getClickableNodes;
    this.onNodeSelected = onNodeSelected;
    this.orbitSystem = orbitSystem;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.isPointerDown = false;
    this.wasDragged = false;

    document.body.classList.add('is-dragging-orbits');

    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;

    this.dragThreshold = 6;

  }

  init() {
    window.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', (event) => this.onPointerUp(event));
    window.addEventListener('pointercancel', () => this.onPointerCancel());
  }

  onPointerDown(event) {
    if (this.isUiInteraction(event)) {
      return;
    }

    this.isPointerDown = true;
    this.wasDragged = false;

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    if (this.orbitSystem) {
      this.orbitSystem.startDrag();
    }
  }

  onPointerMove(event) {
    if (!this.isPointerDown || this.isUiInteraction(event)) {
      return;
    }

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;

    const totalDeltaX = event.clientX - this.startX;
    const totalDeltaY = event.clientY - this.startY;
    const dragDistance = Math.hypot(totalDeltaX, totalDeltaY);

    if (dragDistance > this.dragThreshold) {
      this.wasDragged = true;
    }

    if (this.wasDragged && this.orbitSystem) {
      this.orbitSystem.drag(deltaX, deltaY);
    }

    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onPointerUp(event) {
    if (!this.isPointerDown) {
      return;
    }

    this.isPointerDown = false;

    document.body.classList.remove('is-dragging-orbits');

    if (this.orbitSystem) {
      this.orbitSystem.endDrag();
    }

    if (this.isUiInteraction(event)) {
      return;
    }

    if (this.wasDragged) {
      return;
    }

    this.handleNodeClick(event);
  }

  onPointerCancel() {
    this.isPointerDown = false;
    this.wasDragged = false;

    document.body.classList.remove('is-dragging-orbits');

    if (this.orbitSystem) {
      this.orbitSystem.endDrag();
    }
  }

  handleNodeClick(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const clickableNodes = this.getClickableNodes();
    const intersects = this.raycaster.intersectObjects(clickableNodes);

    if (intersects.length === 0) {
      return;
    }

    this.onNodeSelected(intersects[0].object);
  }

  isUiInteraction(event) {
    return Boolean(
      event.target.closest('.ui-panel') ||
      event.target.closest('.question-dialog') ||
      event.target.closest('.language-wrapper') ||
      event.target.closest('.status-bar')
    );
  }
};