import { spawn, type ChildProcess } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** `dev` bật luôn server lưu cloud + chơi 2 người (như `npm run server`), tắt Vite thì tắt theo. */
function gameServer(): Plugin {
  // Vite nạp lại file cấu hình khi nó đổi: giữ tiến trình trên global để khỏi bật server thứ hai
  const g = globalThis as { gameServer?: ChildProcess };
  return {
    name: 'game-server',
    apply: 'serve',
    configureServer() {
      if (g.gameServer) return;
      const child = (g.gameServer = spawn('npx', ['tsx', 'watch', 'server/index.ts'], { stdio: 'inherit', shell: true }));
      // Windows: shell bọc ngoài nên phải diệt cả cây tiến trình, không thì tsx còn chạy ngầm
      const stop = () => {
        if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
        else child.kill();
      };
      process.once('exit', stop);
      process.once('SIGINT', () => { stop(); process.exit(); });
    },
  };
}

/**
 * GĐ1197 — bỏ bản decoder Draco CHẾT khỏi bản build (không thổi phồng / no bloat).
 * Ba file `three/examples/jsm/libs/draco/*` mà DRACOLoader giữ làm mặc định FALLBACK ở dòng 17–19 + 67–70
 * (chỉ dùng khi KHÔNG gọi setDecoderPath). Nhưng app LUÔN gọi `.setDecoderPath('/decoders/draco/')`
 * (gltfLoader.ts:12) — setDecoderPath ghi đè cả ba decoderPaths sang public (dòng 113–115), và
 * `_getDecoderModule` (387–401) chỉ nạp theo decoderPaths. Nên mấy bản assets/draco_* không bao giờ
 * được nạp: ~1.3 MB chất chết chở theo mỗi build. Xoá ở generateBundle; DRACOLoader giữ chuỗi URL cũ
 * nhưng vô hại (không bao giờ đọc tới vì path đã bị ghi đè). check-bundle có guard xác nhận không còn
 * `draco_decoder-*.wasm` VÀ chuỗi `/decoders/draco/` vẫn còn trong bản build → tự bảo vệ nếu three lên
 * đời mà đổi cách dùng libs/draco.
 */
function dropDeadDraco(): Plugin {
  return {
    name: 'drop-dead-draco',
    apply: 'build',
    generateBundle(_o, bundle) {
      for (const key of Object.keys(bundle)) {
        // Key có tiền tố `assets/` trong rolldown — khớp chứa `draco_decoder-` / `draco_wasm_wrapper-`
        if (/draco_(decoder|wasm_wrapper)-/.test(key)) delete bundle[key];
      }
    },
  };
}

// /api và /ws chuyển sang server lưu cloud + chơi 2 người (cổng 3002)
export default defineConfig({
  plugins: [react(), gameServer(), dropDeadDraco()],
  build: {
    rollupOptions: {
      output: {
        // Tách vendor thành chunk riêng (GĐ174, học từ Xóm Nông Trại): thư viện ít đổi ở lại
        // nguyên trong cache trình duyệt qua các bản update code game, và tải song song.
        manualChunks(id: string) {
          // SPEC-TOI-UU §T2-f: dữ liệu công thức/sản phẩm có tên chunk ổn định (trước đây tên nhầm 'surpriseArcs').
          if (/[\/]src[\/]data[\/](recipes|products)\.ts$/.test(id)) return 'data-recipes';
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]three[\\/]examples[\\/]jsm[\\/]loaders[\\/]/.test(id)) return undefined; // GLTF/Draco nạp lười (gltfLoader.ts)
          // Tách WebGPU/TSL (three.webgpu.js + three.tsl.js) khỏi three lõi (GĐ1196): trình shader
          // tĩnh nạp lúc khởi động nhưng giờ rơi vào 2 tệp tải song song thay vì một chunk 253 KB
          // sát biên ngân sách 255 — cứng hóa biên dựa cho lớn nhất, không đổi hành vi runtime.
          if (/[\\/]three[\\/]build[\\/]three\.(webgpu|tsl)\.js$/.test(id)) return 'vendor-wgpu';
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'vendor-three';
          if (/[\\/]node_modules[\\/](zustand|dexie)[\\/]/.test(id)) return 'vendor-data';
          if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'vendor-firebase';
          return 'vendor-misc';
        },
      },
    },
  },
  server: {
    // Mở cho máy khác cùng mạng (điện thoại) vào được qua IP của máy tính
    host: true,
    proxy: {
      '/api': 'http://localhost:3002',
      '/ws': { target: 'ws://localhost:3002', ws: true },
    },
  },
});
