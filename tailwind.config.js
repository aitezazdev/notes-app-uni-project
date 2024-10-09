/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',  // Include all EJS files
    './Public/css/**/*.css',  // Any CSS files you might add
    './Public/js/**/*.js',    // Any JS files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
