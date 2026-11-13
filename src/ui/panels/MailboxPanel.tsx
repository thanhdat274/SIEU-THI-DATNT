import { useEffect, useState } from 'react';
import { useGame } from '../../core/store';
import { useSession } from '../../net/session';
import { listInbox, type InboxItem } from '../../net/socialApi';
import { formatMoney } from '../../data/products';
import { localMail } from '../../data/mailbox';
import { Footer, styles } from './shared';

const KIND: Record<string, string> = { flower: '🎀 Lẵng hoa', praise: '💬 Lời khen', lot_sold: '💵 Đã bán lô chợ' };

/** Hòm thư: quà chờ nhận (suy từ trạng thái) + thư từ bạn bè/chợ (server, khi đã đăng nhập). */
export function MailboxPanel() {
  const { closePanel, openPanel, claimInbox, day, giftLastDay, wheelLastDay } = useGame();
  const account = useSession((s) => s.account);
  const [inbox, setInbox] = useState<InboxItem[] | null>(null);
  const mails = localMail({ day, giftLastDay, wheelLastDay });
  const load = () => { listInbox().then((r) => setInbox(r.items)).catch(() => setInbox([])); };
  useEffect(() => { if (account) load(); }, [account]);
  const total = mails.length + (inbox?.length ?? 0);
  // Chuẩn nút dự án: nhận thứ có giá trị = vàng đặc; mở điều hướng giữ nút mặc định.
  const gold = { ...styles.btn, background: '#f1c40f', color: '#222', fontWeight: 700 } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 'none' }}>
        <h2 style={styles.title}>✉️ Hòm thư</h2>
        <p style={styles.sub}>Quà và thư đang chờ bạn. {total ? `Có ${total} thứ chưa nhận.` : 'Hiện không có gì chờ nhận.'}</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mails.map((m) => (
          <div key={m.id} style={styles.card}>
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <div style={{ flex: 1 }}><b>{m.title}</b><div style={{ fontSize: 12, opacity: 0.8 }}>{m.body}</div></div>
            <button style={styles.btn} onClick={() => openPanel({ type: m.panel } as never)}>Mở</button>
          </div>
        ))}
        {account && inbox && inbox.length > 0 && (
          <div style={{ ...styles.card, display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <b style={{ flex: 1 }}>Thư từ bạn bè và chợ ({inbox.length})</b>
              <button style={gold} onClick={() => { claimInbox(inbox); load(); }}>Nhận tất cả</button>
            </div>
            {inbox.slice(0, 12).map((i) => (
              <div key={i.id} style={{ fontSize: 13, marginTop: 4 }}>
                {KIND[i.kind] ?? '📦 Đã mua lô chợ'}{i.payload?.money ? ` +${formatMoney(i.payload.money)}` : ''}
              </div>
            ))}
          </div>
        )}
        {!account && <p style={{ ...styles.card, opacity: 0.8 }}>Đăng nhập để nhận thư và quà từ bạn bè.</p>}
        {total === 0 && account && <p style={{ ...styles.card, opacity: 0.8 }}>Chưa có thư nào. Khi có quà hoặc lời nhắn, thư sẽ xuất hiện ở đây.</p>}
      </div>
      <Footer onClose={closePanel} />
    </div>
  );
}
