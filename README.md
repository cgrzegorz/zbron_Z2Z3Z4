# Trener kolokwium Z2 · Z3 · Z4

Aplikacja (React + Vite) do nauki 12 pytań kolokwialnych z laboratorium elektrotechniki:
Z2 – stany nieustalone RC, Z3 – nieliniowe obwody DC, Z4 – obwody sprzężone magnetycznie.

## Uruchomienie
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # wersja produkcyjna w dist/ (działa też z pliku, base: './')
npm run deploy   # build + publikacja na branchu gh-pages (GitHub Pages)
```

Wersja online: https://cgrzegorz.github.io/zbron_Z2Z3Z4/

## Tryby
- **Start** – odliczanie do kolokwium, plan na dziś, mapa opanowania 12 pytań.
- **Nauka** – każde pytanie: pretest → Zrozum (analogia, kroki) → Pobaw się (interaktywny wykres/schemat) → Na kolokwium (wzorzec + kryteria) → Dlaczego? (quiz).
- **Kolokwium** – losowanie (po 1 pytaniu z Z2/Z3/Z4, ze wzmocnieniem słabych), pisanie i rysowanie z pamięci (tablica lub kartka), ocena pewności, porównanie ze wzorcem, samoocena wg kryteriów, powtórki rozłożone w czasie (Leitner).
- **Trening** – przeplatane, losowane mikro-zadania: uzupełnij schemat, znajdź błąd, narysuj krzywą (z odsłonięciem poprawnej krzywej i samooceną wg punktów kontrolnych), wzór z lukami, pytania „dlaczego?”. Zadanie rozwiązane poprawnie nie wraca do końca rundy.
- **Ściąga** – wszystkie wzory, z trybem zasłaniania do samosprawdzania.

Postęp zapisuje się w `localStorage` przeglądarki.
