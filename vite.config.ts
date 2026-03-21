import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  return {
    plugins: [
      react(),
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
      },
    }),
  };
});
