/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import macros from "unplugin-parcel-macros";
import optimizeLocales from "@react-aria/optimize-locales-plugin";

const S2_STYLE = "@react-spectrum/s2/style";
const S2_STYLE_STUB = `\0${S2_STYLE}`;

function parcelMacrosWithNormalizedIds() {
  const plugin = macros.vite();
  const plugins = Array.isArray(plugin) ? plugin : [plugin];
  return plugins.map((p) => ({
    ...p,
    name: `${p.name}-normalized-ids`,
    transform(code: string, id: string) {
      const transform = p.transform;
      if (transform == null) return null;
      const normalizedId = id.replace(/\?.*$/, "");
      const handler = typeof transform === "function" ? transform : transform.handler;
      return Reflect.apply(handler, this, [code, normalizedId]);
    },
  }));
}

/**
 * `@react-spectrum/s2/style` is only exported under the `node` condition for
 * build-time macros. Vite's dependency scanner resolves with browser conditions
 * and fails; provide a client stub. Macros still load the real package via Node.
 */
function s2StyleMacroShim(): Plugin {
  return {
    name: "s2-style-macro-shim",
    enforce: "pre",
    resolveId(id) {
      if (id === S2_STYLE) return S2_STYLE_STUB;
    },
    load(id) {
      if (id === S2_STYLE_STUB) {
        return 'export function style() { return "" }\nexport function css() { return "" }\n';
      }
    },
  };
}

const isVitest = Boolean(process.env.VITEST);

const apiOrigin = process.env.VITE_API_URL || "http://localhost:8080";

const apiProxy = {
  "/api": {
    target: apiOrigin,
    changeOrigin: true,
  },
  "/v1": {
    target: apiOrigin,
    changeOrigin: true,
  },
};

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
  optimizeDeps: {
    exclude: [S2_STYLE],
  },
  plugins: [
    // Parcel macros emit virtual CSS that Vitest workers cannot resolve reliably.
    // In unit tests, stub the style macro module instead.
    ...(isVitest ? [s2StyleMacroShim()] : [...parcelMacrosWithNormalizedIds(), s2StyleMacroShim()]),
    {
      ...optimizeLocales.vite({
        locales: ["en-US"],
      }),
      enforce: "pre",
    },
    ...(isVitest ? [] : [devtools()]),
    ...(isVitest ? [] : [tailwindcss()]),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    viteReact(),
  ],
  build: {
    target: ["es2022"],
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/macro-(.*)\.css$/.test(id) || /@react-spectrum\/s2\/.*\.css$/.test(id)) {
            return "s2-styles";
          }
        },
      },
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
    server: {
      deps: {
        inline: ["@react-spectrum/s2"],
      },
    },
  },
});

export default config;
