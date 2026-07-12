export class Input {
  private readonly keys = new Set<string>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private pointerLocked = false;

  constructor(private readonly targetElement: HTMLElement) {
    targetElement.addEventListener("click", this.requestPointerLock);
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("pointerlockchange", this.handlePointerLockChange);
    window.addEventListener("blur", this.clearKeys);
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = {
      x: this.mouseDeltaX,
      y: this.mouseDeltaY,
    };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  private readonly requestPointerLock = (): void => {
    try {
      void this.targetElement.requestPointerLock().catch(() => undefined);
    } catch {
      this.pointerLocked = false;
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return;
    }

    this.mouseDeltaX += event.movementX;
    this.mouseDeltaY += event.movementY;
  };

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.targetElement;

    if (!this.pointerLocked) {
      this.clearKeys();
    }
  };

  private readonly clearKeys = (): void => {
    this.keys.clear();
  };
}
