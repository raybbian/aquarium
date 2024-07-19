import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nmagenta: '#6930C3',
        nlavendar: '#5E60CE',
        nblue: '#5390D9',
        nteal: '#56CFE1',
        ngreen: '#72EFDD'
      }
    },
  },
  plugins: [],
};
export default config;
