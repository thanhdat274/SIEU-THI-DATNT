import { useGame } from '../../core/store';
import { buyHomeItem, buyService, buyPet, buyUpgrade, buyVehicle, feedPet } from '../../core/biz';
import { hasUpgrade, UPGRADES } from '../../data/upgrades';
import { Callout } from './shared';
import { BREAKFAST, HOME_ITEMS, petActive, PETS, VEHICLES } from '../../data/biz';
import { formatMoney, productById } from '../../data/products';
import { BILL_RUSH_DAYS, dayOfMonth, SERVICE_BUY_ALONG, SERVICES } from '../../data/services';
import { roiOf } from '../../data/serviceRoi';
import { catPayoff, dogPayoff, CAT_PITCH_MIN } from '../../data/petPayoff';
import { theftRisk, THEFT_LEAK_HIGH, THEFT_LEAK_MODERATE, THEFT_UNLOCK } from '../../data/theftRisk';
import { maintenancePayoff, MAINT_RISK_HIGH, MAINT_RISK_MODERATE, MAINT_UNLOCK } from '../../data/maintenancePayoff';
import { posPayoff, POS_RISK_HIGH, POS_RISK_MODERATE, POS_UNLOCK } from '../../data/posPayoff';
import { avgPerVisit } from '../../data/repMoney';
import { brokenShelfLoss } from '../../data/brokenShelfLoss';
import { itemHealthList, shelfCount } from '../../data/analytics';
import { card, title, pill, iconTile, btn, sub, row } from './businessStyles';

export function Pets() {
  const { biz, day, level, storage, analytics, riskTrend } = useGame();
  // GĐ157: "Con này đáng bữa cơm không?" — quy công nuôi ra tiền, đối chiếu tiền thức ăn (thuần đọc).
  const cat = catPayoff(analytics, biz.pets, day, storage);
  const dog = dogPayoff(riskTrend);
  return (
    <>
      {PETS.map((p) => {
        const pet = biz.pets[p.kind];
        const fed = petActive(pet, day);
        return (
          <div key={p.kind} style={card}>
            <div style={row}>
              <b>{p.icon} {p.name}</b>
              {!pet ? (level < p.unlock ? <span style={sub}>Cấp {p.unlock}</span> : <button style={btn} onClick={() => buyPet(p.kind)}>Nuôi · {formatMoney(p.price)}</button>)
                : <button style={btn} disabled={pet.fedDay === day} onClick={() => feedPet(p.kind)}>{pet.fedDay === day ? 'Đã cho ăn' : 'Cho ăn'}</button>}
            </div>
            <div style={sub}>{p.desc}</div>
            {pet && (
              <div style={{ fontSize: 12, marginTop: 2, color: fed ? '#2ecc71' : '#e67e22' }}>
                {fed ? 'No bụng, đang làm việc' : 'Đói, không chịu làm việc'} · kho còn {storage[p.food] ?? 0} {productById(p.food).name} (không có thì mua lẻ giá gấp đôi)
              </div>
            )}
            {/* GĐ157: payoff thú cưng — số tiền là ƯỚC từ sổ hỏng hàng / sổ rủi ro có sẵn. */}
            {p.kind === 'cat' && pet && cat.verdict !== 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                <div>
                  Hôm qua cứu <b>~{formatMoney(cat.savedYesterday)}</b> hàng hỏng · bữa cơm hôm nay ~{formatMoney(cat.foodCostToday)} →{' '}
                  <b style={{ color: cat.savedYesterday >= cat.foodCostToday ? '#2ecc71' : '#e67e22' }}>
                    {cat.savedYesterday >= cat.foodCostToday ? `đang lời ~${formatMoney(cat.savedYesterday - cat.foodCostToday)}` : `đang lỗ ~${formatMoney(cat.foodCostToday - cat.savedYesterday)}`}
                  </b>
                </div>
                <div style={{ marginTop: 2 }}>
                  7 ngày: cứu <b>~{formatMoney(cat.savedWeek)}</b> —{' '}
                  {cat.verdict === 'saved' && <b style={{ color: '#2ecc71' }}>lời ~{formatMoney(cat.savedWeek - cat.foodWeek)}</b>}
                  {cat.verdict === 'breakeven' && <b style={{ color: '#f1c40f' }}>vừa đủ ăn</b>}
                  {cat.verdict === 'losing' && <b style={{ color: '#e67e22' }}>lỗ cơm ~{formatMoney(cat.foodWeek - cat.savedWeek)}</b>}
                  {' '}(thức ăn ~{formatMoney(cat.foodWeek)}).
                </div>
                {!fed && <div style={{ color: '#e67e22', marginTop: 2 }}>😾 Đói 1 ngày mất công dụng — cho ăn đều.</div>}
              </div>
            )}
            {p.kind === 'cat' && pet && cat.verdict === 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                7 ngày qua kho sạch, không hỏng gì — chưa thấy công, thức ăn vẫn ~{formatMoney(cat.foodCostToday)}/ngày.
              </div>
            )}
            {p.kind === 'cat' && !pet && cat.weekSpoilCost >= CAT_PITCH_MIN && (
              <Callout tone="danger" strong style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12 }}>
                  🥀 Tuần này hàng hỏng <b>~{formatMoney(cat.weekSpoilCost)}</b> — nuôi mèo cứu được ~1/4 (~{formatMoney(Math.round(cat.weekSpoilCost * 0.25))}) với ~{formatMoney(cat.foodCostToday)}/ngày thức ăn.
                </div>
              </Callout>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked > 0 && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                🛡️ Tuần này chặn/thu lại <b>~{formatMoney(dog.weekBlocked)}</b> trộm & tiền giả.
                <div style={{ ...sub, marginTop: 2 }}>Sổ rủi ro chung cả tiệm (gồm cả camera, mắt tinh) — không tách riêng được công con chó.</div>
              </div>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked <= 0 && dog.weekLeak > 0 && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                🛡️ Tuần này lọt <b>~{formatMoney(dog.weekLeak)}</b>, chưa chặn được gì — chó giữ cửa giúp giảm nguy cơ.
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Dịch vụ ở quầy: mua thiết bị một lần, khách ghé dùng dịch vụ và hay mua kèm. */
export function Services() {
  const { biz, level, day, stats } = useGame();
  const owned = biz.services ?? [];
  return (
    <>
      <div style={card}>
        <b>🧾 Dịch vụ ở quầy</b>
        <div style={sub}>
          Không cần kệ: khách đi thẳng tới quầy, lãi mỗi lượt ít nhưng {Math.round(SERVICE_BUY_ALONG * 100)}% khách tiện tay mua kèm 1–2 món.
          Phải có người đứng quầy mới phục vụ được.
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Hôm nay lời từ dịch vụ: <b>{formatMoney(stats.services ?? 0)}</b></div>
      </div>
      {SERVICES.map((sv) => (
        <div key={sv.id} style={{ ...card, opacity: level < sv.unlock ? 0.5 : 1 }}>
          <div style={row}>
            <b>{sv.icon} {sv.name}</b>
            {owned.includes(sv.id) ? <span style={{ ...sub, color: '#2ecc71' }}>Đang chạy</span>
              : level < sv.unlock ? <span style={sub}>Cấp {sv.unlock}</span>
                : <button style={btn} onClick={() => buyService(sv.id)}>Mở · {formatMoney(sv.price)}</button>}
          </div>
          <div style={sub}>{sv.desc}</div>
          {owned.includes(sv.id) && (() => {
            const roi = roiOf(sv, biz.serviceLife, stats.byService);
            const goal = roi.paidBack
              ? <span style={{ color: '#2ecc71' }}>đã hoàn vốn ✓</span>
              : <span style={{ color: '#f1c40f' }}>còn kém {formatMoney(roi.deficit)} nữa là hoàn vốn{roi.daysToRecoup ? ` (~${roi.daysToRecoup} ngày theo nhịp hôm nay)` : ''}</span>;
            return (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Đã lời {formatMoney(roi.life)} · hôm nay {roi.today >= 0 ? '+' : ''}{formatMoney(roi.today)} · {goal}
              </div>
            );
          })()}
          {sv.id === 'bills' && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Hôm nay ngày {dayOfMonth(day)} trong tháng{dayOfMonth(day) <= BILL_RUSH_DAYS ? ' · 🔥 đầu tháng, khách đóng tiền đông gấp 4' : ` · đợt đông tới sau ${30 - dayOfMonth(day) + 1} ngày`}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function Life() {
  const { biz, level, day } = useGame();
  return (
    <>
      <div style={card}>
        <b>🏡 Sắm đồ cho nhà riêng</b>
        <div style={sub}>Nhà đẹp ngủ ngon: mỗi món giúp sáng hôm sau đi nhanh hơn.</div>
        {HOME_ITEMS.map((h) => (
          <div key={h.id} style={{ ...row, marginTop: 4, opacity: level < h.unlock ? 0.5 : 1 }}>
            <span>{h.icon} {h.name} <span style={sub}>+{Math.round(h.rest * 100)}% tốc độ</span></span>
            {biz.home.includes(h.id) ? <span style={{ ...sub, color: '#2ecc71' }}>Đã có</span>
              : level < h.unlock ? <span style={sub}>Cấp {h.unlock}</span>
                : <button style={btn} onClick={() => buyHomeItem(h.id)}>{formatMoney(h.price)}</button>}
          </div>
        ))}
      </div>
      <div style={card}>
        <b>🍜 Bữa sáng</b>
        <div style={sub}>Bước tới cạnh tủ đầu giường là tự ăn sáng ({formatMoney(BREAKFAST.price)}, trước 11:00): đi nhanh hơn {Math.round(BREAKFAST.speed * 100)}% cả ngày, thức khuya thêm {BREAKFAST.lateMinutes} phút mới ngất.</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>{biz.breakfastDay === day ? '✅ Sáng nay đã ăn' : 'Hôm nay chưa ăn'}</div>
      </div>
      <div style={card}>
        <b>🛵 Xe cộ</b>
        <div style={sub}>Ngoài đường đi nhanh hơn, nút đi lại nhà ↔ tiệm tốn ít giờ hơn, giao đơn gọi điện kịp hơn.</div>
        {VEHICLES.map((v) => (
          <div key={v.id} style={{ ...row, marginTop: 4, opacity: level < v.unlock ? 0.5 : 1 }}>
            <span>{v.icon} {v.name} <span style={sub}>+{Math.round(v.speed * 100)}% ngoài đường, đi lại còn {Math.round(v.travel * 100)}% thời gian</span></span>
            {biz.vehicle === v.id || (biz.vehicle === 'moto' && v.id === 'bike') ? <span style={{ ...sub, color: '#2ecc71' }}>Đã có</span>
              : level < v.unlock ? <span style={sub}>Cấp {v.unlock}</span>
                : <button style={btn} onClick={() => buyVehicle(v.id)}>{formatMoney(v.price)}</button>}
          </div>
        ))}
      </div>
    </>
  );
}

/** Tab nâng cấp: thiết bị mua một lần dùng vĩnh viễn. */
export function Upgrades() {
  const { level, money, biz, stats, day, furniture, analytics, storage, demand } = useGame();
  return (
    <>
      <div style={{ ...card, marginBottom: 8 }}>
        <b>🔧 Thiết bị của tiệm</b>
        <div style={sub}>Mua một lần dùng vĩnh viễn — tiền đốt cho giai đoạn về sau, mỗi món gắn với một hệ thống đã có.</div>
      </div>
      {UPGRADES.map((u) => {
        const owned = hasUpgrade(biz, u.id);
        const cameraRisk = u.id === 'camera' && level >= THEFT_UNLOCK
          ? theftRisk({
              level, customers: stats.customers, revenue: stats.revenue,
              hasCamera: owned, hasDog: !!petActive(biz.pets?.dog, day),
            })
          : null;
        const maintPayoff = u.id === 'maintenance' && level >= MAINT_UNLOCK
          ? maintenancePayoff({ level, furniture, hasContract: owned })
          : null;
        const shelfLoss = u.id === 'maintenance'
          ? brokenShelfLoss(furniture, itemHealthList(analytics, level, storage, shelfCount(furniture), demand))
          : null;
        const posValue = u.id === 'pos' && level >= POS_UNLOCK
          ? posPayoff({
              level, hasPos: owned,
              waitMissed: stats.missed?.wait ?? 0,
              avgRevenuePerBuyer: avgPerVisit(stats.revenue, stats.customers),
            })
          : null;
        return (
          <div key={u.id} style={card}>
            <div style={row}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={iconTile}>{u.icon}</div>
                <div>
                  <b>{u.name}</b>
                  <div style={sub}>{u.desc}</div>
                  {owned
                    ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>✓ Đã lắp</span>
                    : <div style={sub}>Giá {formatMoney(u.price)} · mở ở cấp {u.unlock}</div>}
                </div>
              </div>
              {!owned && (
                <button style={btn} disabled={level < u.unlock || money < u.price} onClick={() => buyUpgrade(u.id)}>
                  {level < u.unlock ? `Cần cấp ${u.unlock}` : `Mua ${formatMoney(u.price)}`}
                </button>
              )}
            </div>
            {cameraRisk && (
              <Callout
                tone={cameraRisk.hasCamera ? 'ok' : cameraRisk.leakExposureToday >= THEFT_LEAK_HIGH ? 'danger' : cameraRisk.leakExposureToday >= THEFT_LEAK_MODERATE ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={cameraRisk.hasCamera
                  ? '📹 Đã lắp camera — kẻ trộm né tiệm'
                  : `🦹 Mỗi ngày trộm rút ~${formatMoney(cameraRisk.leakExposureToday)} hàng`}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {cameraRisk.hasCamera
                    ? 'Đã lắp: kẻ trộm né tiệm (mất bớt ~30% vụ trộm).'
                    : `~${Math.round(cameraRisk.expectedThievesToday * 10) / 10} khách/ngày là kẻ trộm (giỏ trung bình ${formatMoney(cameraRisk.avgBasketRetail)}). Lắp camera kìm còn 70% → tiết kiệm ước ~${formatMoney(cameraRisk.cameraSavesPerDay)}/ngày, hoàn vốn sau ~${cameraRisk.cameraPaybackDays ?? '?'} ngày.`}
                </div>
              </Callout>
            )}
            {maintPayoff && (
              <Callout
                tone={maintPayoff.hasContract ? 'ok' : maintPayoff.nightlyRepairSpend >= MAINT_RISK_HIGH ? 'danger' : maintPayoff.nightlyRepairSpend >= MAINT_RISK_MODERATE ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={maintPayoff.hasContract
                  ? '🔧 Đã ký hợp đồng — thợ chăm kệ mỗi sáng'
                  : `🔧 Mỗi đêm kệ hỏng rủi ro ~${formatMoney(maintPayoff.nightlyRepairSpend)} tiền sửa`}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {maintPayoff.hasContract
                    ? 'Kệ mòn ≥40 được thợ chăm về 10 mỗi sáng → gần như không bao giờ hỏng. Tiền sửa/đêm ~0 (mất lợi chỉ còn khi kệ đang hỏng sẵn).'
                    : `~${Math.round(maintPayoff.expectedBreaksPerNight * 10) / 10} kệ/đêm có nguy cơ hỏng trên ${maintPayoff.nbWearing} đồ hao mòn. Ký hợp đồng tiết kiệm ước ~${formatMoney(maintPayoff.savingPerDay)}/ngày (nửa giá + chăm kệ tránh hỏng), hoàn vốn sau ~${maintPayoff.paybackDays ?? '?'} ngày — chưa tính hàng lỡ bán khi kệ hỏng.`}
                </div>
                {shelfLoss && shelfLoss.hasBroken && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#e74c3c' }}
                    title={`Kệ hỏng đang chặn hẳn: ${shelfLoss.lines.map((l) => `${l.typeName} (${l.itemNames.join(', ')})`).join(' · ')}`}>
                    🔧 Kệ hỏng đang chặn hẳn {shelfLoss.lines.length} đồ — lỡ TỚI ~{formatMoney(shelfLoss.lostPerDay)}/ngày, sửa để bán lại.
                  </div>
                )}
              </Callout>
            )}
            {posValue && (owned || posValue.estRevenueLostPerDay > 0) && (
              <Callout
                tone={owned ? 'ok' : posValue.verdict === 'high' ? 'danger' : posValue.verdict === 'modest' ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={owned
                  ? '🖥️ Đã lắp POS — quầy quét nhanh gấp rưỡi'
                  : `🖥️ Mỗi ngày lỡ ~${formatMoney(posValue.estRevenueLostPerDay)} vì khách chờ quầy`}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {owned
                    ? 'Quét mã tự động mọi quầy, khách chờ ít hẳn — giờ đông không còn nghẽn ở máy tính tiền.'
                    : `~${posValue.waitMissed} khách/ngày bỏ về vì chờ quầy. POS kìm ~80% chờ do tốc độ quầy → tiết kiệm ước ~${formatMoney(posValue.savingPerDay)}/ngày, hoàn vốn sau ~${posValue.paybackDays ?? '?'} ngày (ước lượng, chưa tính giờ đông).`}
                </div>
              </Callout>
            )}
          </div>
        );
      })}
    </>
  );
}
