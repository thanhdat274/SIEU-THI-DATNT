import type { Product } from '../data/products';
import { productPixels } from '../data/productPixels';

/** Ảnh sản phẩm pixel-art: hình theo loại hàng, tô theo màu hộp của món. */
export function ProductIcon({ product, size = 22, tile = false }: { product: Product; size?: number; tile?: boolean }) {
  const rects = productPixels(product);
  const svg = (
    <svg
      width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true"
      style={{ verticalAlign: 'middle', flexShrink: 0, imageRendering: 'pixelated' }}
    >
      {rects.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
    </svg>
  );
  if (!tile) return svg;
  return (
    <span style={{
      display: 'inline-grid', placeItems: 'center', width: size + 10, height: size + 10, borderRadius: 8, verticalAlign: 'middle',
      background: 'linear-gradient(#ffffff1f, #ffffff0a)', border: '1px solid #ffffff1a', marginRight: 6, flexShrink: 0,
    }}>{svg}</span>
  );
}
