import { defineConfig, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [reloadGameOnChange(), react()],
  build: {
    rollupOptions: {
      output: {
        // Tách thư viện lớn để tải song song và cache lâu dài; mã game đổi thường xuyên không làm mất cache.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('pixi')) return 'vendor-pixi';
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('react')) return 'vendor-react';
          return 'vendor';
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
