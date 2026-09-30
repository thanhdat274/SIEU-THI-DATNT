import React, { useEffect, useId, useRef } from 'react';
import { PRODUCT_MAP, productPixels } from '@game/data';
import { getModalReturnFocus } from '../../store/useGameStore';

export type IconName = 'sun' | 'clock' | 'coin' | 'warehouse' | 'bag' | 'truck' | 'save' | 'book' | 'close' | 'plus' | 'minus' | 'door' | 'person' | 'heart' | 'star' | 'check' | 'warning' | 'speed' | 'hand' | 'moon' | 'cold';
const glyphs: Record<IconName, string[]> = {
  sun: ['...x.x...', '....x....', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '....x....', '...x.x...'],
  clock: ['..xxxxx..','.xx...xx.','xx..x..xx','x...x...x','x...xxx.x','x.......x','xx.....xx','.xx...xx.','..xxxxx..'],
  coin: ['..xxxxx..','.xx...xx.','xx.xxx.xx','x.x.x...x','x..xxx..x','x...x.x.x','xx.xxx.xx','.xx...xx.','..xxxxx..'],
  warehouse: ['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxxxxxxx','x.......x','x.xx.xx.x','x.xx.xx.x','xxxxxxxxx'],
  bag: ['...xxx...','..x...x..','..x...x..','.xxxxxxx.','.x.....x.','.x.....x.','.x..x..x.','.x.....x.','.xxxxxxx.'],
  truck: ['xxxxxx...','x....x...','x....xxxx','x....x..x','xxxxxx..x','xxxxxxxxx','.xx...xx.','.xx...xx.','.........'],
  save: ['xxxxxxxx.','x.xxxx.xx','x.x..x..x','x.xxxx..x','x.......x','x.xxxxx.x','x.x...x.x','x.x...x.x','xxxxxxxxx'],
  book: ['xxxxxxxx.','x.x....xx','x.x.....x','x.x.xxx.x','x.x.....x','x.x.xxx.x','x.x.....x','x.x.....x','xxxxxxxxx'],
  close: ['xx.....xx','xxx...xxx','.xxx.xxx.','..xxxxx..','...xxx...','..xxxxx..','.xxx.xxx.','xxx...xxx','xx.....xx'],
  plus: ['...xxx...','...xxx...','...xxx...','xxxxxxxxx','xxxxxxxxx','xxxxxxxxx','...xxx...','...xxx...','...xxx...'],
  minus: ['.........','.........','.........','xxxxxxxxx','xxxxxxxxx','xxxxxxxxx','.........','.........','.........'],
  door: ['.xxxxxxx.','.x.....x.','.x.....x.','.x.....x.','.x...x.x.','.x.....x.','.x.....x.','.x.....x.','xxxxxxxxx'],
  person: ['...xxx...','..xxxxx..','..xxxxx..','...xxx...','..xxxxx..','.xxxxxxx.','.xxxxxxx.','..xx.xx..','..xx.xx..'],
  heart: ['.xx...xx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....','.........'],
  star: ['....x....','...xxx...','...xxx...','xxxxxxxxx','.xxxxxxx.','..xxxxx..','.xxxxxxx.','.xx...xx.','xx.....xx'],
  check: ['.........','.......xx','......xxx','.....xxx.','xx..xxx..','xxxxxx...','.xxxx....','..xx.....','.........'],
  warning: ['....x....','...xxx...','..xxxxx..','..xx.xx..','.xxx.xxx.','.xxx.xxx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx'],
  speed: ['xx.......','xxxx.....','xxxxxx...','xxxxxxxx.','xxxxxxxxx','xxxxxxxx.','xxxxxx...','xxxx.....','xx.......'],
  hand: ['...xx....','.x.xx.x..','.x.xx.x.x','.xxxxxx.x','.xxxxxxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..'],
  moon: ['..xxxx...','.xxxx....','xxxx.....','xxxx.....','xxxx....x','xxxxx..xx','.xxxxxxxx','..xxxxxx.','...xxxx..'],
  cold: ['x...x...x','.x..x..x.','..x.x.x..','...xxx...','xxxxxxxxx','...xxx...','..x.x.x..','.x..x..x.','x...x...x'],
};
export function PixelIcon({ name, size = 20 }: {name: IconName; size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true" focusable="false" className={`pixel-icon icon-${name}`}>
    {glyphs[name].flatMap((row, y) => [...row].map((v, x) => v === 'x' ? <rect key={`${x}-${y}`} x={x+1} y={y+1} width="1" height="1" fill="currentColor"/> : null))}
  </svg>;
}
export const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
export function PixelButton({icon, variant = 'paper', className = '', children, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {icon?: IconName; variant?: 'paper'|'teal'|'brick'|'wood'}) {
  return <button type="button" {...props} className={`pixel-button button-${variant} ${className}`}>{icon && <PixelIcon name={icon}/>} {children}</button>;
}
export function PixelPanel({children, className = ''}: React.PropsWithChildren<{className?: string}>) {return <section className={`pixel-panel ${className}`}>{children}</section>;}
export function PixelStat({label, value, icon}: {label: string; value: React.ReactNode; icon: IconName}) {return <div className="pixel-stat"><PixelIcon name={icon} size={22}/><div className="pixel-stat-body"><span className="muted">{label}</span><strong>{value}</strong></div></div>;}
export function PixelProgress({value, max, label}: {value: number; max: number; label: string}) {
  const safeMax = Math.max(1, max), safeValue = Math.max(0, Math.min(safeMax, value));
  return <div className="pixel-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax} aria-valuenow={safeValue}><span style={{width:`${safeValue / safeMax * 100}%`}}/></div>;
}
export function ProductIcon({productId, size = 40}: {productId?: string; size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" className="product-icon">{productPixels(productId ? PRODUCT_MAP[productId] : undefined).map((p, i) => <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.color}/>)}</svg>;
}
export function ProductSlot({productId, quantity}: {productId?: string; quantity?: number}) {return <div className="product-slot"><ProductIcon productId={productId}/>{quantity !== undefined && <strong className="slot-count">{quantity}</strong>}</div>;}
export function QuantityStepper({value, min = 1, max = 99, onChange, label, disabled = false}: {value: number; min?: number; max?: number; onChange: (n:number)=>void; label: string; disabled?:boolean}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.trunc(n) : min));
  const id = useId();
  return <div className="quantity-stepper"><PixelButton icon="minus" aria-label={`Giảm ${label}`} disabled={disabled || value <= min} onClick={()=>onChange(clamp(value-1))}/><label className="sr-only" htmlFor={id}>{label}</label><input id={id} type="number" min={min} max={max} value={value} disabled={disabled} inputMode="numeric" onChange={e=>onChange(clamp(Number(e.target.value)))}/><PixelButton icon="plus" aria-label={`Tăng ${label}`} disabled={disabled || value >= max} onClick={()=>onChange(clamp(value+1))}/></div>;
}
export function EmptyState({title, children, icon = 'warehouse'}: React.PropsWithChildren<{title:string;icon?:IconName}>) {return <div className="empty-state"><PixelIcon name={icon} size={36}/><strong>{title}</strong><p className="muted">{children}</p></div>;}
export function PixelDialog({title, subtitle, icon, onClose, children, footer}: React.PropsWithChildren<{title:string;subtitle?:string;icon:IconName;onClose:()=>void;footer?:React.ReactNode}>) {
  const id = useId(), ref = useRef<HTMLElement>(null), closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(()=>{
    const previous = getModalReturnFocus() ?? document.activeElement as HTMLElement | null;
    const node = ref.current!;
    node.querySelector<HTMLElement>('[data-dialog-close]')?.focus();
    const focusable = () => [...node.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el=>el.getClientRects().length > 0);
    const keys = (e:KeyboardEvent) => {
      if(e.key==='Escape') {e.preventDefault();e.stopPropagation();closeRef.current();}
      if(e.key==='Tab') {
        const els=focusable(), first=els[0], last=els[els.length-1];
        if (!first) {e.preventDefault(); node.focus();}
        else if(e.shiftKey && (document.activeElement===first || !node.contains(document.activeElement))) {e.preventDefault(); last.focus();}
        else if(!e.shiftKey && (document.activeElement===last || !node.contains(document.activeElement))) {e.preventDefault(); first.focus();}
      }
    };
    const focus = (e:FocusEvent) => {if(!node.contains(e.target as Node)) (focusable()[0] ?? node).focus();};
    document.addEventListener('keydown',keys,true); document.addEventListener('focusin',focus);
    return ()=>{document.removeEventListener('keydown',keys,true);document.removeEventListener('focusin',focus); if(previous?.isConnected) previous.focus();};
  }, []);
  return <div className="dialog-backdrop"><section ref={ref} className="pixel-panel pixel-dialog" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><header className="dialog-header"><div className="dialog-heading"><PixelIcon name={icon} size={28}/><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div><PixelButton icon="close" variant="wood" aria-label="Đóng" data-dialog-close onClick={onClose}/></header><div className="dialog-content">{children}</div><footer className="dialog-footer">{footer ?? <><span className="muted">Esc để trở về tiệm</span><PixelButton onClick={onClose}>Trở về tiệm</PixelButton></>}</footer></section></div>;
}
