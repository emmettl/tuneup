import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Relative, so ONE build serves every way this ships: the GitHub Pages project site at
  // /tuneup/, a local `vite preview` at /, and any static host or file:// copy. An absolute
  // base has to pick one and is wrong for the rest, which is what forces a BASE_PATH to be
  // threaded through the deploy workflow — a variable that then has to be right in two places.
  // Nothing here needs to know where it will be served from.
  //
  // The one exception is the Open Graph tags in index.html, which stay absolute: crawlers do
  // not resolve a relative og:image, and a blank link preview is the usual symptom.
  base: './',
})
