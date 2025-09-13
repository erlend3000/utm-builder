import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If deploying to GitHub Pages under a repo (username.github.io/repo-name), set BASE_PATH env.
// In GitHub Action we can do: echo "BASE_PATH=/utm-builder" >> $GITHUB_ENV (or computed repo name)
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
});
