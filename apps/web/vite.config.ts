import { defineConfig, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// React Fast Refresh preserves refs, including the running simulation and Pixi
// viewport. Reload game code so every edit creates a fresh runtime instead.
function reloadGameOnChange(): Plugin {
  const sourceRoots = [
    './src/',
    '../../packages/game-core/src/',
    '../../packages/game-data/src/',
    '../../packages/game-renderer/src/',
    '../../packages/shared/src/',
  ].map((p) => normalizePath(fileURLToPath(new URL(p, import.meta.url))));

  return {
    name: 'reload-game-on-change',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      const p = normalizePath(file);
      if (sourceRoots.some((root) => p.startsWith(root)) && /\.(?:[cm]?[jt]sx?|json)$/.test(p)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

/**
 * Inject build timestamp vào sw.js mỗi lần build production.
 * Thay placeholder __SW_VERSION__ bằng chuỗi như "v-20261002-084700"
 * để Service Worker luôn được browser coi là "mới" sau mỗi deploy → tránh
 * stale SW cache serving assets đã đổi hash tên file.
 */
function injectSwVersion(): Plugin {
  return {
    name: 'inject-sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(import.meta.dirname, 'dist', 'sw.js');
      if (!fs.existsSync(swPath)) return;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13); // "202610020847"
      const version = `v-${ts}`;
      const src = fs.readFileSync(swPath, 'utf8');
      fs.writeFileSync(swPath, src.replaceAll('__SW_VERSION__', version), 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [reloadGameOnChange(), react(), tailwindcss(), injectSwVersion()],
  build: {
    rollupOptions: {
      output: {
        // Tách thư viện lớn để tải song song và cache lâu dài; mã game đổi thường xuyên không làm mất cache.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pixi')) return 'vendor-pixi';
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (/node_modules[/]dexie[/]/.test(id)) return 'vendor-dexie';
          // Chỉ react, react-dom, scheduler (lõi, không phụ thuộc thư viện khác) nên không tạo vòng với chunk khác.
          if (/node_modules[/](?:react|react-dom|scheduler)[/]/.test(id)) return 'vendor-react';
          // Không gom react/vendor chung: chunk "vendor" gom cả thư viện phụ thuộc react
          // gây phụ thuộc vòng với vendor-react, khiến React undefined khi chạy production.
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    // Không tự nhảy sang 3001 (cổng của BE) khi 3000 đang bị tiến trình cũ giữ; báo lỗi rõ ràng thay vì chạy sai cổng.
    strictPort: true,
    host: true,
    open: true,
  },
});
