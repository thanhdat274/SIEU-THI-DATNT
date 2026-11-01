import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * GLTFLoader + DRACOLoader nạp LƯỜI (import động): chỉ cần khi tải GLB, không nằm trong gói tải ban đầu.
 * Decoder để local (public/decoders/draco, copy từ node_modules/three) — không phụ thuộc CDN,
 * trình duyệt tải đúng một lần rồi cache cho mọi model nén sau này.
 */
let loaderP: Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader> | null = null;
const real = () => (loaderP ??= Promise.all([
  import('three/examples/jsm/loaders/GLTFLoader.js'),
  import('three/examples/jsm/loaders/DRACOLoader.js'),
]).then(([{ GLTFLoader }, { DRACOLoader }]) => new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/decoders/draco/'))));

/** Cùng chữ ký `load` của GLTFLoader (callback), nhưng loader thật chỉ được nạp khi gọi lần đầu. */
export function lazyGltfLoader() {
  return {
    load(url: string, onLoad: (g: GLTF) => void, onProgress?: (e: ProgressEvent) => void, onError?: (e: unknown) => void) {
      real().then((l) => l.load(url, onLoad, onProgress, onError)).catch((e) => onError?.(e));
    },
  };
}
