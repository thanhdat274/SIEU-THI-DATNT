# Spec Delta

## Purpose

Quy định pha ban đêm chơi được trong một ngày game: cửa hàng đóng nhưng đồng hồ vẫn chạy, khách không sinh, nhịp thời gian nhanh hơn, người chơi có thể chốt ngày sớm; đồng bộ tuyệt đối giữa các máy trong hẻm chung và không làm hỏng chế độ sinh hoạt ngày hiện có.

## ADDED Requirements

### Requirement: Playable night phase

Ngày game SHALL có pha ban đêm từ 22:00 đến 06:00. Lúc 22:00 hệ thống SHALL tự đóng cửa hàng và chuyển sang pha đêm; trong pha đêm đồng hồ SHALL tiếp tục chạy dù cửa hàng đóng; lúc 06:00 hệ thống SHALL chốt ngày (sang ngày kế, 07:00) đúng một lần.

#### Scenario: Entering night

- **WHEN** đồng hồ chạm 22:00 ở chế độ thường
- **THEN** cửa hàng đóng, pha đêm bật, đồng hồ tiếp tục chạy (không nhảy ngày ngay)

#### Scenario: Leaving night

- **WHEN** đồng hồ chạm 06:00 trong pha đêm ở chế độ thường
- **THEN** ngày tăng đúng một, giờ là 07:00, cửa hàng mở lại như hành vi ngày hiện có, pha đêm tắt

#### Scenario: Night runs while store closed

- **WHEN** đang 23:00 và cửa hàng đóng
- **THEN** thời gian vẫn trôi và người chơi vẫn đi lại được

### Requirement: No trade during night

Trong pha đêm SHALL không sinh khách mới và SHALL không phát sinh doanh thu bán hàng; khách còn trong tiệm khi đóng cửa SHALL được xử lý như hiện tại (rời đi/hoàn giỏ theo luật sang ngày cũ). Người chơi SHALL không thể tự mở cửa hàng ngoài giờ bán.

#### Scenario: No customers at night

- **WHEN** pha đêm đang bật
- **THEN** không có khách mới vào tiệm và không có giao dịch nào phát sinh

#### Scenario: Open store at night rejected

- **WHEN** người chơi bấm mở cửa lúc 23:00
- **THEN** bị từ chối với lý do ngoài giờ bán, trạng thái cửa hàng không đổi

#### Scenario: Day opening still works

- **WHEN** người chơi mở cửa lúc 09:00
- **THEN** cửa hàng mở như hiện tại

### Requirement: Night pacing and early end

Thời gian ban đêm SHALL trôi nhanh hơn ban ngày theo hằng số cấu hình (không ghi vào save). Người chơi SHALL có thể "Ngủ/Qua đêm" để chốt ngày sớm bất kỳ lúc nào trong pha đêm, dùng đúng đường `advance_day`/bỏ phiếu thời gian hiện có; các việc chốt ngày (lương, hao mòn, trộm đêm, bản tin) SHALL chạy đúng một lần.

#### Scenario: Fast night

- **WHEN** so sánh số phút game trôi qua trong cùng số giây thực giữa pha ngày và pha đêm
- **THEN** pha đêm trôi nhanh hơn theo hệ số cấu hình (đề xuất ×3)

#### Scenario: Sleep early

- **WHEN** người chơi bấm "Ngủ/Qua đêm" lúc 23:00
- **THEN** ngày tăng đúng một, giờ 07:00, lương/hao mòn/trộm đêm của đêm đó chạy đúng một lần

### Requirement: Day belongs to N until 06:00

Đêm của ngày N SHALL là 22:00 N → 06:00 N+1. `worldTime.day` SHALL giữ nguyên = N suốt 00:00–06:00; ngày N chỉ được chốt tại 06:00 (hoặc khi người chơi ngủ/qua đêm sớm). Theo quy ước này: nhân viên `hiredOnDay = N` SHALL làm được ca đêm của ngày N; lương ca đêm SHALL trả trong bản lương ngày N đúng một lần; trộm đêm của đêm N SHALL chạy đúng một lần lúc chốt ngày và sự kiện/ledger ghi vào ngày N+1 như hành vi hiện có.

#### Scenario: Midnight still day N

- **WHEN** đồng hồ ở 00:30 ngày kế tiếp sau 22:00 của ngày N (chưa chốt)
- **THEN** `worldTime.day` vẫn là N

#### Scenario: Night of hire day

- **WHEN** nhân viên được tuyển ngày N và xét lúc 23:30 ngày N
- **THEN** nhân viên tính là đang trong ca đêm của ngày N

#### Scenario: Night wage paid once for day N

- **WHEN** nhân viên ca đêm làm 22:00 N → 06:00 N+1 rồi ngày được chốt
- **THEN** lương ca đêm nằm trong bản lương ngày N và không bị trả lần hai khi tải lại

#### Scenario: One night burglary per night

- **WHEN** qua đêm N sang ngày N+1
- **THEN** `runNightBurglary` chỉ chạy một lần cho đêm N và sự kiện ghi ngày N+1

### Requirement: Night speed parity across runtimes

Hệ số tốc độ ban đêm SHALL được áp tại một nguồn duy nhất (`GameClock`) và không ghi vào save. Cùng một lượng giây thực SHALL cho cùng số phút game, cùng ngày/giờ và cùng trạng thái cửa hàng dù mô phỏng chạy ở client (`update` theo bước thực) hay ở `WorldRuntime` (tick 250 ms, bước cố định 1/60 s); điều này SHALL đúng khi vắt qua ranh giới 22:00 và 06:00. Pause/checkpoint của `WorldRuntime` SHALL không đổi (không thêm nhịp wall-clock riêng cho ban đêm).

#### Scenario: Parity crossing 22:00

- **WHEN** cùng một save được chạy cùng tổng thời gian thực qua 21:59→22:00 bằng hai kiểu tick client và server
- **THEN** hai bên cho cùng `day`, `hour`, `minute`, `isStoreOpen`

#### Scenario: Parity crossing 06:00

- **WHEN** cùng một save được chạy cùng tổng thời gian thực qua 05:59→06:00 bằng hai kiểu tick client và server
- **THEN** hai bên cho cùng ngày mới, cùng giờ 07:00 và cùng việc chốt ngày một lần

#### Scenario: Pause stops night clock

- **WHEN** `WorldRuntime` pause vì không còn session
- **THEN** ban đêm không trôi thêm phút game và checkpoint vẫn theo chu kỳ cũ

### Requirement: Co-op consistent night

Pha đêm SHALL do mô phỏng phía máy chủ quyết định và đi theo save chung (`worldTime`), nên mọi máy trong hẻm SHALL thấy cùng pha, cùng giờ và cùng ngày. Việc chuyển ngày lúc 06:00 SHALL phát snapshot/revision như các lần chuyển ngày hiện có; bỏ phiếu `advance_day`/`change_speed` SHALL tiếp tục hoạt động trong pha đêm.

#### Scenario: Two clients same phase

- **WHEN** hai máy đang chơi chung ở 23:00
- **THEN** cả hai thấy pha đêm và giờ giống nhau; không máy nào tự chốt ngày riêng

#### Scenario: Server auto advance at 06:00

- **WHEN** máy chủ chạy tới 06:00 trong pha đêm
- **THEN** ngày tăng đúng một lần trên save chung và cả hai máy nhận ngày mới qua snapshot

#### Scenario: Time vote during night

- **WHEN** một thành viên bỏ phiếu qua đêm lúc 23:00
- **THEN** luật bỏ phiếu hiện có áp dụng (một người: qua ngay; hai người: chờ đủ phiếu)

### Requirement: Daily routine mode night

Chế độ sinh hoạt ngày SHALL giữ mốc 22:00 đóng cửa/kiểm kê và 23:30 nhân vật tự về nhà đi ngủ (khoá điều khiển), nhưng việc đi ngủ SHALL **không** đen màn và SHALL **không** chốt ngày. Đồng hồ SHALL tiếp tục chạy (ban đêm nhanh ×3) từ 23:30 tới 06:00; tới 06:00 màn hình SHALL mờ dần sang đen rồi chốt ngày, nhân vật thức dậy 07:00 ở cửa nhà và cửa hàng chờ 08:00 mở như cũ.

#### Scenario: Sleep at 23:30 does not end the day

- **WHEN** nhân vật về tới nhà và đi ngủ lúc 23:30
- **THEN** ngày không tăng, đồng hồ vẫn chạy, màn hình chưa đen

#### Scenario: Midnight still day N

- **WHEN** đồng hồ ở 00:30 sau khi nhân vật đã ngủ
- **THEN** `worldTime.day` vẫn là ngày cũ

#### Scenario: Fade and finalize at 06:00

- **WHEN** đồng hồ tới 05:50–06:00 khi nhân vật đang ngủ
- **THEN** màn hình mờ đen dần, đúng 06:00 ngày tăng một lần, thức dậy 07:00 ở cửa nhà, cửa hàng vẫn đóng tới 08:00

#### Scenario: Co-op both asleep

- **WHEN** hai người cùng ngủ từ 23:30 trong hẻm chung
- **THEN** ngày chỉ chốt khi máy chủ chạy tới 06:00, không chốt lúc 23:30

### Requirement: Night UI feedback

Giao diện SHALL cho biết đang là ban đêm, khoá/hiện lý do khi mở cửa ngoài giờ, và có nút "Ngủ/Qua đêm" trong pha đêm. Thông báo 22:00 (đóng cửa) và 06:00 (ngày mới) SHALL hiện cho người chơi.

#### Scenario: Night HUD

- **WHEN** pha đêm bật
- **THEN** HUD hiện dấu hiệu ban đêm, nút mở cửa bị khoá kèm lý do, và nút "Ngủ/Qua đêm" dùng được

#### Scenario: Morning after sleep

- **WHEN** người chơi bấm ngủ lúc nửa đêm
- **THEN** màn ngày mới/bản tin sáng hiện như mọi lần sang ngày hiện có
