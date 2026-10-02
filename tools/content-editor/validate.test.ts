import assert from 'node:assert/strict';
import test from 'node:test';
import { RECIPES, STALLS } from '@game/data';
import { validateContent } from './validate';

test('nội dung game hiện tại hợp lệ', () => {
  assert.deepEqual(validateContent(), []);
});

test('bắt được công thức trỏ tới nguyên liệu hoặc trạm không tồn tại', () => {
  const recipe = RECIPES[0];
  const originalInputs = recipe.inputs;
  const originalStation = recipe.stationShopId;
  try {
    recipe.inputs = [...originalInputs, { productId: 'khong_ton_tai', quantity: 1 }];
    recipe.stationShopId = 'tram_ma';
    const errors = validateContent();
    assert.ok(errors.some(e => e.includes('khong_ton_tai')), 'báo nguyên liệu lạ');
    assert.ok(errors.some(e => e.includes('tram_ma')), 'báo trạm lạ');
  } finally {
    recipe.inputs = originalInputs;
    recipe.stationShopId = originalStation;
  }
  assert.deepEqual(validateContent(), []);
});

test('bắt được quầy có công suất tối đa nhỏ hơn nhu cầu', () => {
  const stall = STALLS[0] as { maxServings: number; baseServings: number };
  const original = stall.maxServings;
  try {
    stall.maxServings = stall.baseServings - 1;
    assert.ok(validateContent().some(e => e.includes('công suất')));
  } finally {
    stall.maxServings = original;
  }
});
