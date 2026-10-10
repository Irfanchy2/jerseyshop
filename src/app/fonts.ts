// Only the primary Latin UI fonts are preloaded; Bengali and display fonts load on demand.
import { Archivo, Inter, Manrope, Noto_Sans_Bengali, Oswald } from "next/font/google";

export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap", weight: ["500", "600", "700"], preload: false });
export const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap", preload: false });
export const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", display: "swap", weight: ["400", "500", "600", "700"], preload: false });

export const fontVariables = [manrope.variable, inter.variable, oswald.variable, archivo.variable, bengali.variable].join(" ");
