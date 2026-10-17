# Tasks: civic-population-demand

- [x] 1.1 `RESIDENTS_PER_TILE` 0,5 (PROVISIONAL — chưa có dữ liệu "lô nhà dân", sức chứa = diện tích lô của đợt đã mở).
- [x] 1.2 `game-core/civic-population.ts`: `districtCapacity`, `targetPopulation`, `baselinePop`, `stepPopulation`, `populationTrafficFactor`, `computePopulationSnapshot`, `stepAllPopulations` + test (±3%, ít nhất 1, hội tụ, tất định, số nguyên).
- [x] 1.3 Schema 11 `civic.populationByDistrict`; migration 10→11 chỉ nâng số schema; `isSaveGameData` nhận schema 10; dân số hỏng → baseline. Test qua `validateSaveGameData` + nạp lại sim.
- [x] 1.4 Hệ số kênh `traffic` (`civic_population`) trong `demand.ts`, chịu kẹp chung; khóa đệm có hệ số; save không công trình → hệ số đúng 1 (test + golden).
- [ ] 1.5 Sweep 90 ngày — ĐÃ CHẠY (cấp 25 × 3 seed, cấp 15 × 2 seed), **CHƯA ĐẠT tiêu chí**: hệ số 1,067–1,085 nhưng doanh thu −0,3% / +0,1% (trần `trafficAtLevel` ≤ 6 ở cấp cao + nút thắt khác chưa rõ). Chờ chủ dự án quyết định hướng sửa. Số liệu: `tổng hợp.md` khối "BƯỚC 2".
- [x] 1.6 Tab Xóm phố: dân số / mục tiêu, ▲▼ xu hướng, hệ số; bản tin sáng + báo cáo ngày có dân số khu tiệm chính. QA 375×812.
- [x] 1.7 `yarn typecheck` PASS; `yarn --cwd packages/game-core test` EXIT 0 (16/10/2026); `yarn --cwd apps/web test` PASS.
- [~] 1.8 Co-op: dân số chỉ đổi trong bước chốt ngày; QA 2 client 17/10/2026 (Bước C): hai thẻ Browser pane cùng localhost, thẻ B ép id khách `b` bằng shim `Storage.getItem` ở thẻ đó (giao diện thật cả hai; hẻm "QA BuocC" gieo save qua DB: cấp 25, 20tr, sổ gần đủ). ĐÃ KIỂM CHỨNG: dân số 164 giữ nguyên khi QoL đổi giữa ngày, sang ngày đổi 164 → 169 (target 175, hệ số 1,0305) và hash giống hệt hai máy. Chưa đối chiếu `hashSimulationState` (không có hook trên window; dùng hash FNV tự viết trên phần dân sự của save). CHƯA đo hệ số khách giữa hai máy.

- [x] BƯỚC C (17/10/2026): QA 2 giao diện thật (2 tab, khách dev b/a) — kết quả của change này xem `tổng hợp.md` mục BƯỚC C (C3).
