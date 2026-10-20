import { Vector2D, Direction } from '@game/shared';

export interface GameInputSource {
  getMovementVector(): Vector2D;
  consumeInteract(): boolean;
  consumeInventoryToggle(): boolean;
}

export function vectorToDirection(vec: Vector2D, currentDirection: Direction): Direction {
  if (Math.abs(vec.x) < 0.1 && Math.abs(vec.y) < 0.1) return currentDirection;
  if (Math.abs(vec.x) > Math.abs(vec.y)) return vec.x > 0 ? 'right' : 'left';
  return vec.y > 0 ? 'down' : 'up';
}

export class InputManager {
  private keysDown: Set<string> = new Set();
  private joystickVector: Vector2D = { x: 0, y: 0 };
  private interactRequested: boolean = false;
  private inventoryToggleRequested: boolean = false;
  private enabled = true;
  private viewRight: Vector2D = { x: 1, y: 0 };
  private viewDown: Vector2D = { x: 0, y: 1 };

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.keysDown.clear();
    this.joystickVector = { x: 0, y: 0 };
    this.interactRequested = false;
    this.inventoryToggleRequested = false;
  }

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  public attachListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
    }
  }

  public detachListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }

  private handleBlur = (): void => {
    this.keysDown.clear();
    this.joystickVector = { x: 0, y: 0 };
    this.interactRequested = false;
    this.inventoryToggleRequested = false;
  };

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    // Avoid capturing inputs if typing inside an input field
    const activeEl = document.activeElement;
    if (activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || (activeEl.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code)) || (activeEl as HTMLElement).isContentEditable)) {
      return;
    }

    this.keysDown.add(e.code);

    // Keep arrow-key movement from scrolling the page while the game is active.
    if (e.code.startsWith('Arrow')) e.preventDefault();

    if (e.code === 'KeyE' || e.code === 'Space') {
      this.interactRequested = true;
    }

    if (e.code === 'KeyI') {
      e.preventDefault();
      this.inventoryToggleRequested = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  public setJoystickVector(x: number, y: number): void {
    if (!this.enabled) return;
    this.joystickVector = { x, y };
  }

  public triggerInteract(): void {
    if (!this.enabled) return;
    this.interactRequested = true;
  }

  public triggerInventoryToggle(): void {
    if (!this.enabled) return;
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

  /**
   * Hướng bản đồ ứng với phải/xuống của màn hình (renderer 3D xoay camera); mặc định trục bản đồ nên 2D không đổi.
   */
  public setViewBasis(right: Vector2D, down: Vector2D): void {
    const rightLength = Math.sqrt(right.x * right.x + right.y * right.y);
    const downLength = Math.sqrt(down.x * down.x + down.y * down.y);
    if (
      !Number.isFinite(right.x) || !Number.isFinite(right.y) ||
      !Number.isFinite(down.x) || !Number.isFinite(down.y) ||
      rightLength < 1e-6 || downLength < 1e-6
    ) {
      return;
    }
    this.viewRight = { x: right.x / rightLength, y: right.y / rightLength };
    this.viewDown = { x: down.x / downLength, y: down.y / downLength };
  }

  public resetViewBasis(): void {
    this.viewRight = { x: 1, y: 0 };
    this.viewDown = { x: 0, y: 1 };
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

    // Convert from screen space to map space using the view basis.
    const sx = dx;
    const sy = dy;
    const x = sx * this.viewRight.x + sy * this.viewDown.x;
    const y = sx * this.viewRight.y + sy * this.viewDown.y;

    // Normalize if length > 1
    const length = Math.sqrt(x * x + y * y);
    if (length > 1) {
      return { x: x / length, y: y / length };
    }

    return { x, y };
  }

  public static vectorToDirection(vec: Vector2D, currentDirection: Direction): Direction {
    return vectorToDirection(vec, currentDirection);
  }
}
