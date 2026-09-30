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
  console.log('✓ Input: held controls, modal gate, queued actions and resume.');
}
