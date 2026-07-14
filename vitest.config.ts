import react from "@vitejs/plugin-react-swc";

const vitestConfig = {
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "**/node_modules/**", "dist/**", ".next/**"],
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
};

export default vitestConfig;
