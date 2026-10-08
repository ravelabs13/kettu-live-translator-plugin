# Kettu Translate

**Uniwersalny tłumacz rozmów na żywo dla Kettu.**

Kettu Translate pomaga prowadzić rozmowy z osobami posługującymi się innymi językami bezpośrednio z pola wiadomości Discorda.

Piszesz naturalnie w swoim języku, tłumaczysz wiadomość, sprawdzasz wynik i kontynuujesz rozmowę bez opuszczania Discorda.

> **To tłumacz rozmów, a nie postów.**
>
> Kettu Translate tłumaczy Twoje wychodzące wiadomości podczas rozmowy.
> Nie tłumaczy automatycznie postów ani całego feedu wiadomości Discorda.

## Jak działa

Plugin dodaje nad polem wiadomości przycisk:

`ŹRÓDŁO→CEL`

Domyślnie:

`AUTO→EN`

`AUTO` oznacza automatyczne wykrywanie języka, w którym piszesz.

Możesz również ręcznie ustawić konkretny język źródłowy.

## Najważniejsze funkcje

- tłumaczenie wychodzących wiadomości podczas rozmowy
- automatyczne wykrywanie języka
- ręczny wybór języka źródłowego
- 33 dostępne języki
- globalny język docelowy
- osobny język docelowy dla konkretnego kanału
- ręczne tłumaczenie przed wysłaniem
- automatyczne tłumaczenie podczas naciskania Wyślij
- podgląd tłumaczenia przed wysłaniem
- możliwość użycia tłumaczenia albo oryginału
- Auto Translate osobno dla kanałów
- ochrona składni Discorda
- obsługa długich wiadomości
- synchronizacja tekstu z natywnym composerem Discorda
- automatyczne pojawianie się przycisku po uruchomieniu Discorda

## Ręczne tłumaczenie

1. Wpisz wiadomość.
2. Dotknij przycisku `SOURCE→TARGET`.
3. Kettu Translate wykryje język lub użyje języka ustawionego ręcznie.
4. Pojawi się okno **Review translation**.
5. Wybierz wersję przetłumaczoną.
6. Tłumaczenie zostanie wpisane do pola wiadomości Discorda.
7. Sprawdź tekst i wyślij go normalnie.

W trybie ręcznym plugin nie wysyła wiadomości samodzielnie.

To Ty zawsze decydujesz, co finalnie zostanie wysłane.

## Auto Translate

Auto Translate umożliwia tłumaczenie podczas normalnego naciskania przycisku Wyślij.

Gdy funkcja jest aktywna:

1. Napisz wiadomość.
2. Naciśnij Wyślij.
3. Plugin przechwytuje wiadomość przed wysłaniem.
4. Wykonuje tłumaczenie.
5. Pokazuje **Review translation**.
6. Możesz wysłać tłumaczenie, wysłać oryginał albo anulować.

Auto Translate można ustawić globalnie albo osobno dla każdego kanału.

Długie przytrzymanie przycisku translatora przełącza Auto Translate dla aktualnego kanału.

## Automatyczne wykrywanie języka

Domyślny język źródłowy to:

`Auto-detect`

Przycisk pokazuje wtedy np.:

`AUTO→EN`

Po wykonaniu tłumaczenia Preview może pokazać wykryty język, np.:

`POLISH · DETECTED`

Jeśli dla konkretnej rozmowy automatyczne wykrywanie nie działa tak, jak oczekujesz, możesz ustawić język źródłowy ręcznie.

## Obsługiwane języki

Aktualnie dostępne są:

polski, angielski, niemiecki, hiszpański, francuski, włoski, portugalski, niderlandzki, szwedzki, norweski, duński, fiński, czeski, słowacki, ukraiński, rosyjski, turecki, grecki, rumuński, węgierski, bułgarski, chorwacki, serbski, japoński, koreański, chiński uproszczony, chiński tradycyjny, arabski, hebrajski, hindi, indonezyjski, wietnamski i tajski.

## Ochrona składni Discorda

Plugin chroni przed tłumaczeniem m.in.:

- oznaczenia użytkowników
- role i kanały
- linki
- niestandardowe emoji
- znaczniki czasu Discorda
- kod inline
- bloki kodu

Dzięki temu elementy techniczne Discorda pozostają poprawne po tłumaczeniu.

## Instalacja

### Zalecane środowisko

Kettu Translate był tworzony i testowany na prawdziwym urządzeniu z **oficjalnym projektem Kettu na iOS**.

Oficjalny projekt:

- GitHub mirror: https://github.com/C0C0B01/Kettu
- główne repozytorium Kettu: https://codeberg.org/cocobo1/Kettu

Działanie na nieoficjalnych forkach, starszym Bunny/Vendetta lub zmodyfikowanych wersjach Kettu nie jest gwarantowane.

### Instalacja pluginu

1. Zainstaluj i skonfiguruj Kettu.
2. Otwórz Discord.
3. Wejdź w **Ustawienia → Kettu → Plugins**.
4. Naciśnij `+`.
5. Wklej adres Kettu Translate:

`https://raw.githubusercontent.com/ravelabs13/kettu-live-translator-plugin/main/`

6. Zainstaluj i włącz plugin.
7. Całkowicie uruchom ponownie Discorda.
8. Wejdź na kanał tekstowy.

Przycisk `AUTO→EN` powinien pojawić się automatycznie nad polem wiadomości.

## Ustawienia

**Source language**

Automatyczne wykrywanie albo ręczne ustawienie języka źródłowego.

**Auto Translate by default**

Automatyczne tłumaczenie podczas naciskania Wyślij.

**Default target language**

Domyślny język docelowy.

**Ask after translation errors**

Określa zachowanie po błędzie tłumaczenia.

**Current channel**

Aktualnie wybrany kanał Discorda.

**Auto Translate override**

Pozwala dla konkretnego kanału odziedziczyć ustawienie globalne albo wymusić ON/OFF.

**Target language for this channel**

Pozwala ustawić inny język docelowy tylko dla konkretnego kanału.

## Prywatność i połączenie sieciowe

Tłumaczenie wymaga internetu.

Tekst przeznaczony do tłumaczenia jest wysyłany do endpointu Google Translate używanego przez plugin.

Chronione elementy Discorda, takie jak wzmianki, linki czy kod, są przed tłumaczeniem zastępowane tymczasowymi znacznikami i później przywracane.

Kettu Translate nie posiada własnego serwera tłumaczeń.

## Czego plugin nie robi

Kettu Translate nie jest translatorem wiadomości przychodzących.

Nie tłumaczy automatycznie:

- postów innych użytkowników
- historii kanału
- całego feedu Discorda
- wiadomości już wyświetlonych na ekranie

Jego zadaniem jest pomagać **Tobie pisać wiadomości w czasie rzeczywistej rozmowy**.

## Rozwiązywanie problemów

Zobacz:

[TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Autor

**RaveLabs**

## Informacja

Kettu Translate jest niezależnym pluginem.

Projekt nie jest oficjalnie powiązany z Discordem, Google ani zespołem Kettu.

## Licencja

Własny kod Kettu Translate autorstwa RaveLabs jest udostępniany na [MPL-2.0](LICENSE). Copyright © 2026 RaveLabs.

Edytowalny kod źródłowy odpowiadający temu zminifikowanemu `index.js` jest dołączony w [pakiecie źródłowym v1.3.1](Kettu-Translate-v1.3.1-source.zip). Pliki źródłowe RaveLabs z tego pakietu są udostępniane na MPL-2.0, której pełny tekst znajduje się w `LICENSE` tej dystrybucji.

Pakiet `index.js` zawiera też `@swc/helpers` na licencji Apache-2.0. Zobacz [informacje o kodzie zewnętrznym](THIRD_PARTY_NOTICES.md) i [pełny tekst licencji Apache-2.0](LICENSES/Apache-2.0.txt).
