import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager';
import { createActorSprite } from './actor-atlas';

// Hệ tay phải vẽ sprite lật ngang → helper phải bật invertU; hệ tay trái thì không.
for (const rightHanded of [true, false]) {
  const scene = new Scene(new NullEngine());
  scene.useRightHandedSystem = rightHanded;
  const manager = new SpriteManager('t', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 4, { width: 1, height: 1 }, scene);
  const sprite = createActorSprite('s', manager);
  assert.equal(sprite.invertU, rightHanded, `invertU theo hệ tay ${rightHanded ? 'phải' : 'trái'}`);
  scene.dispose();
}
console.log('PASS actor-sprite: invertU theo hệ tay phải');
