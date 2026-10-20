import { InputManager } from './input';

export function runInputTests() {
  const input = new InputManager();
  const expect = (ok: boolean, description: string) => { if(!ok) throw new Error(`Input regression: ${description}`); };
  const keys = (input as unknown as { keysDown: Set<string> }).keysDown;
  keys.add('ArrowUp');
  expect(input.getMovementVector().y === -1, 'arrow up moves upward');
  keys.clear(); keys.add('ArrowDown');
  expect(input.getMovementVector().y === 1, 'arrow down moves downward');
  keys.clear(); keys.add('ArrowLeft');
  expect(input.getMovementVector().x === -1, 'arrow left moves left');
  keys.clear(); keys.add('ArrowRight');
  expect(input.getMovementVector().x === 1, 'arrow right moves right');
  keys.clear(); keys.add('ArrowUp'); keys.add('ArrowRight');
  expect(Math.abs(input.getMovementVector().x - Math.SQRT1_2) < 1e-9 && Math.abs(input.getMovementVector().y + Math.SQRT1_2) < 1e-9, 'diagonal arrow movement is normalized');
  keys.clear();
  input.setJoystickVector(1, 0);
  input.setEnabled(true);
  expect(input.getMovementVector().x === 1, 'state synchronization must not release a held joystick');
  input.triggerInteract(); input.triggerInventoryToggle();
  input.setEnabled(false);
  expect(input.getMovementVector().x === 0, 'opening a modal releases movement');
  expect(!input.consumeInteract() && !input.consumeInventoryToggle(), 'opening modal clears queued actions');
  input.setJoystickVector(0, 1); input.triggerInteract(); input.triggerInventoryToggle();
  expect(input.getMovementVector().y === 0 && !input.consumeInteract() && !input.consumeInventoryToggle(), 'modal blocks all world input');
  input.setEnabled(true);
  expect(input.getMovementVector().y === 0, 'closing modal does not replay held movement');
  input.setJoystickVector(0, 1); input.triggerInteract();
  expect(input.getMovementVector().y === 1 && input.consumeInteract(), 'world input works after closing');

  // --- View-basis (camera rotation) support ---
  input.setJoystickVector(0, 0);
  const approx = (actual: number, expected: number) => Math.abs(actual - expected) < 1e-9;

  // (a) Default basis is unchanged.
  keys.clear(); keys.add('ArrowLeft');
  const defL = input.getMovementVector();
  expect(approx(defL.x, -1) && approx(defL.y, 0), 'default: ArrowLeft -> {-1, 0}');
  keys.clear(); keys.add('KeyW');
  const defW = input.getMovementVector();
  expect(approx(defW.x, 0) && approx(defW.y, -1), 'default: KeyW -> {0, -1}');

  // (b) 90-degree rotation: right={0,1}, down={-1,0}.
  input.setViewBasis({ x: 0, y: 1 }, { x: -1, y: 0 });
  keys.clear(); keys.add('KeyD');
  const rotD = input.getMovementVector();
  expect(approx(rotD.x, 0) && approx(rotD.y, 1), 'rotated: KeyD -> ~{0, 1}');
  keys.clear(); keys.add('KeyS');
  const rotS = input.getMovementVector();
  expect(approx(rotS.x, -1) && approx(rotS.y, 0), 'rotated: KeyS -> ~{-1, 0}');

  // (c) 45-degree diagonal basis: right={1,-1}, down={1,1} (each normalized).
  input.setViewBasis({ x: 1, y: -1 }, { x: 1, y: 1 });
  keys.clear(); keys.add('KeyD');
  const diagD = input.getMovementVector();
  expect(
    approx(diagD.x, Math.SQRT1_2) && approx(diagD.y, -Math.SQRT1_2),
    'diagonal: KeyD length 1 and direction (1,-1)/sqrt(2)'
  );
  const diagLen = Math.sqrt(diagD.x * diagD.x + diagD.y * diagD.y);
  expect(approx(diagLen, 1), 'diagonal: KeyD length ~1');
  keys.clear(); keys.add('KeyW'); keys.add('KeyD');
  const diagWD = input.getMovementVector();
  const diagWDLen = Math.sqrt(diagWD.x * diagWD.x + diagWD.y * diagWD.y);
  expect(diagWDLen <= 1 + 1e-9, 'diagonal: W+D length <= 1 (+1e-9)');

  // (d) Invalid basis (zero-length or NaN) leaves the basis unchanged.
  input.setViewBasis({ x: 1, y: -1 }, { x: 1, y: 1 });
  input.setViewBasis({ x: 0, y: 0 }, { x: 1, y: 1 });
  keys.clear(); keys.add('KeyD');
  const afterZero = input.getMovementVector();
  expect(
    approx(afterZero.x, Math.SQRT1_2) && approx(afterZero.y, -Math.SQRT1_2),
    'zero-length basis ignored, basis unchanged'
  );
  input.setViewBasis({ x: NaN, y: 1 }, { x: 1, y: 1 });
  keys.clear(); keys.add('KeyD');
  const afterNaN = input.getMovementVector();
  expect(
    approx(afterNaN.x, Math.SQRT1_2) && approx(afterNaN.y, -Math.SQRT1_2),
    'NaN basis ignored, basis unchanged'
  );

  // (e) resetViewBasis restores the default.
  input.resetViewBasis();
  keys.clear(); keys.add('KeyW');
  const resetW = input.getMovementVector();
  expect(approx(resetW.x, 0) && approx(resetW.y, -1), 'reset: KeyW -> {0, -1}');

  console.log('✓ Input: held controls, modal gate, queued actions and resume.');
}
