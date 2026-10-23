---
name: grocery-game-core-loop
description: "Core gameplay/story of the 3D grocery game (Three.js+TS web): Stardew-like day loop, tiệm tạp hóa grows to supermarket, other shop types later"
metadata:
  node_type: memory
  type: project
  originSessionId: 095807b7-1636-414c-adfc-aed398da7348
  modified: 2026-10-22T10:55:10.359Z
---

User's 3D web game (Three.js + TypeScript, chosen 2026-10-22). Story/core loop:
- Player character has own house; walks from home to the tiệm tạp hóa, sells during the day, goes home to sleep at night (Stardew Valley style day cycle).
- Start as a tiny grocery → earn money, level up → expand shop, buy more shelves → grow into a supermarket.
- Progression must be MANY levels (user rejected only 5 tiers): each level unlocks something — more customers, new products, furniture, staff; high levels unlock building other shop types and freer city building.
- Later: other shop types (food, drinks, barber, ...) and free-form CS2-like building on non-fixed lots (do after shop gameplay is fun).

**Why:** Grocery gameplay comes first; city/other shops are future scope.
**How to apply:** Prioritize single-shop + player/day loop; keep data-driven shop types so new ones are easy. See [[multi-shop-supply-chain-vision]].
