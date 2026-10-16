# Tasks: civic-population-demand

- [ ] 1.1 Dữ liệu `RESIDENTS_PER_TILE`; đánh dấu lô nhà dân trong dữ liệu khai hoang.
- [ ] 1.2 `game-core/civic-population.ts`: `targetPopulation`, `stepPopulation` + test (giới hạn ±3%, hội tụ, tất định).
- [ ] 1.3 Schema kế tiếp + migration `civic.populationByDistrict`; test `isSaveGameData`, tải save cũ.
- [ ] 1.4 Nối `populationTrafficFactor` vào `demand.ts` dưới trần chung; golden: save cũ factor = 1.0.
- [ ] 1.5 Script sweep kinh tế 90 ngày; ghi số thật vào `tổng hợp.md`.
- [ ] 1.6 Tổng kết ngày + tab Xóm phố hiển thị dân số (QA 7 viewport).
- [ ] 1.7 `yarn typecheck`, `yarn test`, QA trình duyệt + co-op 2 client.

- [ ] 1.8 Co-op: dân số chỉ tính ở server đầu ngày, có trong snapshot; QA 2 client thấy cùng số.
