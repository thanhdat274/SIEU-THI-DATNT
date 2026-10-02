import { defineConfig, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// React Fast Refresh preserves refs, including the running simulation and Pixi
// viewport. Reload game code so every edit creates a fresh runtime instead.
function reloadGameOnChange(): Plugin {
  const sourceRoots = [
    './src/',
    '../../packages/game-core/src/',
    '../../packages/game-data/src/',
    '../../packages/game-renderer/src/',
    '../../packages/shared/src/',
  ].map((path) => normalizePath(fileURLToPath(new URL(path, import.meta.url))));

  return {
    name: 'reload-game-on-change',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      const path = normalizePath(file);
      if (sourceRoots.some((root) => path.startsWith(root)) && /\.(?:[cm]?[jt]sx?|json)$/.test(path)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  plugins: [reloadGameOnChange(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Tách thư viện lớn để tải song song và cache lâu dài; mã game đổi thường xuyên không làm mất cache.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pixi')) return 'vendor-pixi';
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (/node_modules[\/]dexie[\/]/.test(id)) return 'vendor-dexie';
          // Chỉ react, react-dom, scheduler (lõi, không phụ thuộc thư viện khác) nên không tạo vòng với chunk khác.
          if (/node_modules[\/](?:react|react-dom|scheduler)[\/]/.test(id)) return 'vendor-react';
          // Không gom react/vendor chung: chunk "vendor" gom cả thư viện phụ thuộc react
          // gây phụ thuộc vòng với vendor-react, khiến React undefined khi chạy production.
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
});
