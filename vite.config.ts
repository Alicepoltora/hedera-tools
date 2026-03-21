import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

// Shim only the Reown/AppKit adapters — optional features of hedera-wallet-connect
// that we never use. @walletconnect/core is NO LONGER shimmed so real wallet
// connection works; the Node.js `crypto` module is polyfilled via nodePolyfills().
const OPTIONAL_SHIMS = [
  '@reown/',
  'ethers', // only needed by reown adapter
];

const shimOptionalDeps: Plugin = {
  name: 'shim-optional-deps',
  enforce: 'pre',
  resolveId(id, importer) {
    const emptyShim = resolve(__dirname, 'src/shims/empty.ts');

    // Shim everything imported FROM the reown adapter (its own deps)
    if (importer?.includes('/hedera-wallet-connect/dist/reown/')) {
      return emptyShim;
    }
    // Shim the reown adapter file itself
    if (id.includes('reown/adapter')) {
      return emptyShim;
    }
    // Shim optional package prefixes
    if (OPTIONAL_SHIMS.some((p) => id.startsWith(p))) {
      return emptyShim;
    }
    return null;
  },
};

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    plugins: [
      react(),
      shimOptionalDeps,
      // Polyfill Node.js built-ins (crypto, buffer, etc.) for browser builds
      ...(!isLib ? [nodePolyfills({ include: ['crypto', 'buffer', 'stream', 'util'] })] : []),
      ...(isLib
        ? [
            dts({
              include: ['src/lib'],
              outDir: 'dist',
              rollupTypes: false,
              tsconfigPath: './tsconfig.app.json',
              cleanVueFileName: false,
            }),
          ]
        : []),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    // ── Library build mode ──
    ...(isLib && {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/lib/index.ts'),
          name: 'HederaUIKit',
          formats: ['es', 'umd'],
          fileName: (format) =>
            format === 'es' ? 'hedera-ui-kit.js' : 'hedera-ui-kit.umd.cjs',
        },
        rollupOptions: {
          external: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            '@hiero-ledger/sdk',
            '@hashgraph/hedera-wallet-connect',
            /^@walletconnect\//,
            /^@hashgraph\//,
            /^@reown\//,
          ],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
      },
    }),

    // ── Demo app build ──
    ...(!isLib && {
      build: {
        outDir: 'dist-demo',
        sourcemap: true,
        rollupOptions: {
          shimMissingExports: true,
        },
      },
    }),
  };
});
