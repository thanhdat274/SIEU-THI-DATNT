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

// /api và /ws chuyển sang server lưu cloud + chơi 2 người (cổng 3002)
export default defineConfig({
  plugins: [react(), gameServer()],
  build: {
    rollupOptions: {
      output: {
        // Tách vendor thành chunk riêng (GĐ174, học từ Xóm Nông Trại): thư viện ít đổi ở lại
        // nguyên trong cache trình duyệt qua các bản update code game, và tải song song.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]three[\\/]examples[\\/]jsm[\\/]loaders[\\/]/.test(id)) return undefined; // GLTF/Draco nạp lười (gltfLoader.ts)
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
