import { Vector2D, Direction } from '@game/shared';

export class InputManager {
  private keysDown: Set<string> = new Set();
  private joystickVector: Vector2D = { x: 0, y: 0 };
  private interactRequested: boolean = false;
  private inventoryToggleRequested: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  public attachListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
    }
  }

  public detachListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Avoid capturing inputs if typing inside an input field
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return;
    }

    this.keysDown.add(e.code);

    if (e.code === 'KeyE' || e.code === 'Space') {
      this.interactRequested = true;
    }

    if (e.code === 'KeyI' || e.code === 'Tab') {
      e.preventDefault();
      this.inventoryToggleRequested = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  public setJoystickVector(x: number, y: number): void {
    this.joystickVector = { x, y };
  }

  public triggerInteract(): void {
    this.interactRequested = true;
  }

  public triggerInventoryToggle(): void {
    this.inventoryToggleRequested = true;
  }

  public consumeInteract(): boolean {
    const val = this.interactRequested;
    this.interactRequested = false;
    return val;
  }

  public consumeInventoryToggle(): boolean {
    const val = this.inventoryToggleRequested;
    this.inventoryToggleRequested = false;
    return val;
  }

  public getMovementVector(): Vector2D {
    let dx = 0;
    let dy = 0;

    // Keyboard inputs
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) dy -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) dy += 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) dx -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) dx += 1;

    // Combine with virtual joystick
    dx += this.joystickVector.x;
    dy += this.joystickVector.y;

    // Normalize if length > 1
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }

    return { x: dx, y: dy };
  }

  public static vectorToDirection(vec: Vector2D, currentDirection: Direction): Direction {
    if (Math.abs(vec.x) < 0.1 && Math.abs(vec.y) < 0.1) {
      return currentDirection;
    }
    if (Math.abs(vec.x) > Math.abs(vec.y)) {
      return vec.x > 0 ? 'right' : 'left';
    } else {
      return vec.y > 0 ? 'down' : 'up';
    }
  }
}
