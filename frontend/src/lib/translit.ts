/**
 * Транслітерація українського кириличного тексту латиницею за офіційним
 * стандартом КМУ (постанова №55 від 27.01.2010). Застосовується НА ПОКАЗ
 * (display-time) для імен/ПІБ, щоб у EN-режимі не було кирилиці.
 *
 * Контекстні правила КМУ-55:
 *  - «є/ї/й/ю/я» на початку слова → Ye/Yi/Y/Yu/Ya, усередині → ie/i/i/iu/ia;
 *  - буквосполучення «зг» → «zgh» (щоб відрізнити від «ж» = zh);
 *  - «щ» → shch, «ж» → zh, «х» → kh, «ц» → ts, «ч» → ch, «ш» → sh;
 *  - мʼякий знак (ь) та апостроф (ʼ, ') у транслітерації не відтворюються.
 */
import type { Locale } from "./i18n";

/** Базова мапа (середина слова / загальний випадок). */
const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e",
  ж: "zh", з: "z", и: "y", і: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ю: "iu", я: "ia",
  є: "ie", ї: "i", й: "i",
  ь: "", "ʼ": "", "'": "", "’": "",
};

/** Контекстні голосні/й — на початку слова. */
const START: Record<string, string> = {
  є: "Ye", ї: "Yi", й: "Y", ю: "Yu", я: "Ya",
};

function isLetter(ch: string): boolean {
  return /[а-щьюяґєіїʼ’'a-z]/i.test(ch);
}

function translitChar(ch: string, prev: string, isWordStart: boolean): string {
  const lower = ch.toLowerCase();

  // зг → zgh (особливий випадок: «г» після «з»)
  if (lower === "г" && prev.toLowerCase() === "з") {
    return matchCase(ch, "gh");
  }

  if (isWordStart && START[lower]) {
    return matchCase(ch, START[lower]);
  }

  const mapped = MAP[lower];
  if (mapped === undefined) return ch; // не кирилиця — лишаємо як є
  return matchCase(ch, mapped);
}

/** Узгодити регістр результату з вихідним символом. */
function matchCase(src: string, out: string): string {
  if (!out) return out;
  if (src === src.toUpperCase() && src !== src.toLowerCase()) {
    // велика літера: «Ya» лишаємо як є (вже капіталізовано), інакше — першу велику
    return out[0].toUpperCase() + out.slice(1);
  }
  return out.toLowerCase();
}

export function translitUA(input: string): string {
  if (!input) return input;
  let out = "";
  let prev = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const isWordStart = !isLetter(prev);
    out += translitChar(ch, prev, isWordStart);
    prev = ch;
  }
  return out;
}

/** Імʼя/ПІБ на показ: у EN — транслітерація, у UK — без змін. */
export function displayName(name: string, locale: Locale): string {
  return locale === "en" ? translitUA(name) : name;
}
