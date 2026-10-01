import assert from 'node:assert/strict';
import { addRecommendation, setCartQuantity } from './components/supplier-cart';
assert.deepEqual(addRecommendation({}, 'a', 2, 1), { a: 1 });
assert.deepEqual(addRecommendation({ a: 3 }, 'a', 4, 5), { a: 5 });
assert.deepEqual(addRecommendation({}, 'a', 2, 0), {});
assert.deepEqual(setCartQuantity({ a: 1 }, 'a', 9, 5), { a: 5 });
assert.deepEqual(setCartQuantity({ a: 1 }, 'a', 0, 5), {});
console.log('supplier-cart OK');
