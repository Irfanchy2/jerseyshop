// Only the primary Latin UI fonts are preloaded; Bengali and display fonts load on demand.
import { Archivo, Inter, Manrope, Noto_Sans_Bengali, Oswald, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";

export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap", weight: ["200", "300", "400", "500", "600", "700", "800"], style: ["normal", "italic"] });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap", preload: false });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
export const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap", weight: ["500", "600", "700"], preload: false });
export const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap", preload: false });
// Serif italic used only for the large roman numerals on the edit cards.
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", weight: ["600"], style: ["italic"], preload: false });
export const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", display: "swap", weight: ["400", "500", "600", "700"], preload: false });

export const fontVariables = [jakarta.variable, manrope.variable, inter.variable, oswald.variable, archivo.variable, playfair.variable, bengali.variable].join(" ");
