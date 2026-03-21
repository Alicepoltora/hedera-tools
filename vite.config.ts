import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

// Resolves optional/missing deps from hedera-wallet-connect to empty shims.
// The library ships Reown/AppKit adapters as optional features we don't use.
// List of packages that hedera-wallet-connect imports optionally
// but which are not installed / not needed for our demo.
// In demo mode (browser build) we shim ALL @walletconnect/* because
// @walletconnect/core imports Node's `crypto` module which is not available
// in browsers and causes a runtime crash (blank/dark screen).
// The demo app uses demoMode={true} so wallet-connect is never actually called.
const OPTIONAL_SHIMS = [
  '@reown/',
  '@walletconnect/',   // shim ALL walletconnect — core imports Node.js `crypto`
  'ethers',            // only needed by reown adapter
];

const shimOptionalDeps: Plugin = {
  name: 'shim-optional-deps',
  enforce: 'pre', // run before vite:resolve so we intercept before crypto warning
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
          // Auto-shim any missing named export from optional deps we shimmed
          shimMissingExports: true,
        },
      },
    }),
  };
});
