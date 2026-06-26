window.MobilePanelController = class MobilePanelController {
  constructor(panelSelector, handleSelector) {
    this.panel = document.querySelector(panelSelector);
    this.handle = document.querySelector(handleSelector);

    this.isPointerDown = false;
    this.startY = 0;
    this.currentY = 0;
    this.deltaY = 0;

    this.dragThreshold = 45;
    this.mobileBreakpoint = 768;
  }

  init() {
    if (!this.panel || !this.handle) {
      return;
    }

    this.handle.addEventListener('click', () => this.toggle());

    this.handle.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', () => this.onPointerUp());
    window.addEventListener('pointercancel', () => this.onPointerCancel());
  }

  isMobile() {
    return window.innerWidth <= this.mobileBreakpoint;
  }

  open() {
    if (!this.panel) {
      return;
    }

    this.panel.classList.add('is-open');
  }

  close() {
    if (!this.panel) {
      return;
    }

    this.panel.classList.remove('is-open');
  }

  toggle() {
    if (!this.isMobile()) {
      return;
    }

    this.panel.classList.toggle('is-open');
  }

  onPointerDown(event) {
    if (!this.isMobile()) {
      return;
    }

    this.isPointerDown = true;
    this.startY = event.clientY;
    this.currentY = event.clientY;
    this.deltaY = 0;

    this.panel.classList.add('is-dragging');

    if (this.handle.setPointerCapture) {
      this.handle.setPointerCapture(event.pointerId);
    }
  }

  onPointerMove(event) {
    if (!this.isPointerDown || !this.isMobile()) {
      return;
    }

    this.currentY = event.clientY;
    this.deltaY = this.currentY - this.startY;
  }

  onPointerUp() {
    if (!this.isPointerDown) {
      return;
    }

    this.isPointerDown = false;
    this.panel.classList.remove('is-dragging');

    if (this.deltaY < -this.dragThreshold) {
      this.open();
      return;
    }

    if (this.deltaY > this.dragThreshold) {
      this.close();
      return;
    }
  }

  onPointerCancel() {
    this.isPointerDown = false;

    if (this.panel) {
      this.panel.classList.remove('is-dragging');
    }
  }
};