import localFont from "next/font/local";

/** e-Ukraine — основний текстовий шрифт цифрової держави (Мінцифра/Дія). */
export const eUkraine = localFont({
  src: [
    { path: "./fonts/e-Ukraine-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/e-Ukraine-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/e-Ukraine-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/e-Ukraine-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-e-ukraine",
  display: "swap",
});

/** e-Ukraine Head — акцидентна гарнітура для заголовків і великих чисел. */
export const eUkraineHead = localFont({
  src: [
    { path: "./fonts/e-UkraineHead-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/e-UkraineHead-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/e-UkraineHead-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-e-ukraine-head",
  display: "swap",
});
