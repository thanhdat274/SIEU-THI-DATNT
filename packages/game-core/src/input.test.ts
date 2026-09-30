import { InputManager } from './input';

export function runInputTests() {
  const input = new InputManager();
  const expect = (ok: boolean, description: string) => { if(!ok) throw new Error(`Input regression: ${description}`); };
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
