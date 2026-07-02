/**
 * PostCSS Configuration
 *
 * Tailwind CSS v4 runs through the official PostCSS plugin in the Next.js
 * runtime. Add any future PostCSS plugins here deliberately and keep this
 * file small so build behavior remains predictable.
 */
const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default postcssConfig;
