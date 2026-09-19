# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Co to je

Statický webový formulář (bez build kroku) pro sběr osobních údajů zaměstnance pro **Jednotné měsíční hlášení zaměstnavatele (JMHZ)** ČSSZ, platné od 1. 4. 2026. Nasazeno přes GitHub Pages z větve `main`, složka `/docs` → https://janbkrejci.github.io/JMHZ/

Formulář běží celý v prohlížeči. Žádný backend — data se importují/exportují jako JSON soubory přes stahování a file input.

## Příkazy

```bash
# Lokální server (nutný pro testy i ruční zkoušení — fetch() nefunguje z file://)
python3 -m http.server 8000
# → http://localhost:8000/docs/index.html            (rozcestník „Personální formuláře")
# → http://localhost:8000/docs/new_regzec_form.html  (osobní dotazník nového zaměstnance)
# → http://localhost:8000/docs/new_regzec_form.html?lang=en   (vynucená angličtina)
# → http://localhost:8000/regzec_structure.html      (editor struktury formuláře)

# Playwright testy (vyžadují běžící server na :8000)
npm install && npx playwright install    # jednorázově: závislosti + prohlížeče
npx playwright test
npx playwright test --project=chromium                     # jeden prohlížeč
npx playwright test -g "Set 1"                             # jeden scénář
npx playwright test --project=chromium -g "Localization"   # jen lokalizační testy

# Regenerace dat z Excelu (skripty mají uv shebang, dependencies inline)
./extract_regzec_structure.py   # regzec.xlsx → regzec_structure.json
./extract_regzec_enums.py       # regzec.xlsx + jmhz datová věta.xlsx → docs/regzec_enums.json

# Aktualizace vendorované ts-form komponenty ze sousedního repa ../TSWebUI
./update_ts_form.sh

# Pomocné skripty (pozor na pracovní adresář!)
python3 list_all_ids.py                       # z rootu: výpis všech ID + popisů
python3 tests/check_ids.py docs/regzec_form.json  # kontrola duplicit/chybějících ID
python3 tests/check_i18n.py                   # z rootu: pokrytí překladů (chybějící i osiřelé klíče)
(cd tests && python3 create_scenarios.py)     # z tests/: regeneruje tests/test_scenarios.json
python3 tests/generate_full_data.py           # z rootu: vypíše full data na stdout
python3 tests/verify_match_ignore_files.py    # z rootu: porovná full_data.json s test-results výstupem
```

`package.json` `test` skript je placeholder (`exit 1`) — testy se spouští přímo přes `npx playwright test`.

## Datový tok

Formulář není psaný ručně — je **generovaný ze stromu metadat**, který pochází z oficiální ČSSZ specifikace:

```
regzec.xlsx (list „Slovník", číselníky CIS *)
 + jmhz datová věta.xlsx
        │
        ├─ extract_regzec_structure.py ─→ regzec_structure.json   (syrový strom, jen sloupce z Excelu)
        └─ extract_regzec_enums.py     ─→ docs/regzec_enums.json  (číselníky: state, sex, bool, rodinny_stav, …)
                                              │
        regzec_structure.html (editor v prohlížeči) ←──────────────┘
                │  ruční nastavení widget / width / description / order / skip / new_only /
                │  ciselnik / default_value / content / manual_parent / přiřazení ID
                ▼
        docs/regzec_form.json   ← ZDROJ PRAVDY pro běžící formulář
                │
        docs/regzec_form.js (buildMetadata)
                ▼
        ts-form atributy: layout / fields / values
```

### Klíčové důsledky

- **`docs/regzec_form.json` je ručně kurátorovaný artefakt, ne generovaný.** Nikdy ho nepřepisuj výstupem `extract_regzec_structure.py`.
- Přegenerování z Excelu (nová verze specifikace) se dělá **slučováním**: spusť `extract_regzec_structure.py`, otevři `regzec_structure.html`, tlačítkem **„Sloučit…"** nahraj stávající `docs/regzec_form.json`. Merge páruje uzly primárně podle `id`, sekundárně podle `key`, přenáší ruční UI vlastnosti a umí uzly i přesunout. Pak **„Exportovat"** → stažený `regzec_form.json` nakopíruj do `docs/`.
- Editor stahuje soubor vždy pod jménem `regzec_form.json`, ale načítá `regzec_structure.json`. Přesun do `docs/` je ruční krok.
- Malé úpravy (překlep v popisku, změna `width`, skrytí pole) se dají udělat přímo editací `docs/regzec_form.json` — je to obyčejný JSON.

## Struktura stromu (`docs/regzec_form.json`)

Jeden kořenový uzel `employee`. Jeho přímé děti = **záložky** (tabs). Hlubší vnoření se zplošťuje: skupina s `description` vloží `separator` a pak své listy.

Atributy uzlu, které řídí chování:

| Atribut | Význam |
|---|---|
| `id` | ID položky datové věty ČSSZ; **toto je klíč ve formulářových datech a v exportovaném JSONu**, ne `key`/cesta |
| `skip: true` | uzel se vůbec nevykreslí (ani v jednom režimu) |
| `new_only: true` | uzel se vykreslí jen v režimu „Nový zaměstnanec" |
| `widget` | `input` \| `date` \| `selection` \| `file` \| `textarea` \| `markdown` \| `separator` |
| `ciselnik` | klíč do `docs/regzec_enums.json`; jen pro `widget: selection` (→ ts-form `combobox`) |
| `width` | 1–12 (grid); `regzec_form.js` balí položky do řádků po 12 a převádí na `Nfr` |
| `order` | pořadí mezi sourozenci (editor má tlačítko „Přečíslovat") |
| `mandatory` | z Excelu `P`/`N`/`PP`; **povinné je jen `P`** |
| `default_value` | předvyplněná hodnota (jde do `values`) |
| `content` | markdown text pro `widget: markdown` |
| `multiple`, `label`, `rows`, `placeholder` | doplňky pro `file` / `textarea` |
| `dat_typ`, `delka`, `p`, `n`, `z`, `vysvetlivky`, `logicke_kontroly` | referenční sloupce z Excelu, UI je nepoužívá |

**ID konvence:** `1xxxx` = oficiální ID položek datové věty ČSSZ z Excelu. `999xxx` = vlastní pole přidaná v editoru (přílohy, instrukce, pomocná pole) — nejsou součástí datové věty. Aktuálně ~169 ID, z toho ~50 vlastních.

Uzel založený v editoru dostane ID až ručně přes „+ Assign ID". Bez ID se jako klíč pole použije `original_path`, resp. `key` — to rozbije testy i export, takže **vždy přiřaď ID**.

Po každé změně struktury spusť `python3 tests/check_i18n.py` — nové nebo přejmenované pole potřebuje i záznam v `docs/i18n/regzec.en.json`.

## Stránky

- `docs/index.html` — rozcestník „Personální formuláře". Odkazuje na formuláře a předává do odkazu zvolený jazyk (`?lang=`).
- `docs/new_regzec_form.html` — jediný formulář: osobní dotazník nového zaměstnance.

Dřívější `docs/regzec_form.html` (režim „doplnění údajů" pro zaměstnance už evidované při startu JMHZ) byl zrušen. `SHOW_NEW_ONLY_FIELDS` je proto natvrdo `true` — příznak `new_only` v datech zůstává pro případný další formulář nad stejnou strukturou.

## Lokalizace

Čeština je výchozí jazyk **a zároveň zdroj pravdy**: popisky zůstávají v `docs/regzec_form.json` a `docs/regzec_enums.json`. Ostatní jazyky jsou překryvné slovníky v `docs/i18n/`, sdílené všemi formuláři:

| Soubor | Obsah |
|---|---|
| `i18n.js` | runtime (`window.TSI18n`) — výběr jazyka, načítání slovníků, přepínač, překlad statického HTML |
| `i18n.css` | vzhled přepínače |
| `common.<lang>.json` | texty UI společné pro všechny formuláře: tlačítka, hlášky, názvy stránek |
| `enums.<lang>.json` | číselníky: `{ "<ciselnik>": { "<value>": "<label>" } }` |
| `regzec.<lang>.json` | konkrétní formulář: `{ "nodes": { "<klíč uzlu>": { description, placeholder, label, content } } }` |

**Klíč uzlu** = `id` položky, a pokud uzel ID nemá (záložky, skupiny, separátory, markdown), tečková cesta složená z `key` od kořene (`employee.client.adr`). Stejné pravidlo implementuje `TSI18n.nodeKey()` i `regzec_form.js`. `original_path` se jako klíč **nepoužívá** — u uzlů přidaných ručně v editoru bývá prázdný nebo zastaralý.

Chybějící klíč nebo prázdná hodnota = tiše se použije česká předloha, takže neúplný překlad stránku nerozbije. Proto existuje `tests/check_i18n.py`, který mezery vypíše.

`enums.cs.json` ani `regzec.cs.json` neexistují a runtime si pro ně ani nechodí — v češtině by jen duplikovaly definici formuláře. Soubor `common.cs.json` naopak potřeba je: texty UI (tlačítka, hlášky) nikde jinde nejsou.

Číselník `state` (249 zemí) se nepřekládá ručně — kódy ISO 3166-1 alpha-2 překládá `Intl.DisplayNames` v `i18n.js`, s českým názvem jako fallbackem.

Volba jazyka: `?lang=` → dřívější volba v `localStorage` → **čeština**. Jazyk prohlížeče se záměrně neuplatňuje.

**Přepnutí jazyka nesmí ztratit data.** Funguje to proto, že `ts-form` při re-renderu dělá `this.formData = { ...valuesConfig, ...this.formData }` — živá data přebíjejí atribut `values`. `applyForm()` tedy jen přepočítá `fields`/`layout`/`buttons`/`errors` a nesahá na hodnoty; `File` objekty přežijí taky, protože se předávají jako vlastnost (`fieldElement.value = value`), ne přes JSON atribut. Aktivní záložka se zachová přes atribut `active-tab`.

Hlášky validace se v `app.errorKeys` drží jako **klíče**, ne hotové texty — jinak by po přepnutí jazyka zůstaly v původním jazyce.

### Texty uvnitř ts-form

Část textů si vykresluje sama komponenta a slovníky v `docs/i18n/` na ně nedosáhnou: hláška v drop zóně nahrávacího pole, tlačítka u nahraného souboru, názvy měsíců a dnů v kalendáři (flatpickr), výchozí potvrzovací dialog. Ty řídí registr `TSFormI18n` uvnitř ts-form.

`applyForm()` mu jazyk předává atributem: `formEl.setAttribute('locale', TSI18n.lang)`. Atribut se čte i při upgradu elementu, takže první vykreslení proběhne rovnou správně a není potřeba řešit, jestli už se modul bundlu stihl provést.

Formát data je ve všech jazycích stejný (číselný, den první) — vstup `3.4.2026` i `03042026` se čte jako den–měsíc–rok a formát podle jazyka by to v angličtině tiše překlopil na 4. března. Lokalizuje se jen kalendář.

Název ukládaného souboru zůstává vždy český (`EXPORT_FILE_PREFIX`) — soubor putuje do české mzdové účtárny bez ohledu na jazyk vyplnění.

## `docs/regzec_form.js` — aplikační vrstva

Jediný ručně psaný aplikační kód. Odpovídá za:

- `applyForm()` — jediné místo, které plní atributy komponenty. Volá se při startu a znovu při každé změně jazyka.
- `buildMetadata()` / `flattenNode()` / `packRows()` / `convertRowToFr()` — překlad stromu na ts-form `layout` + `fields` + `values`, po cestě se skládá klíč uzlu pro slovník a volá `translate()`.
- **Tlačítkový workflow:** „Zkontrolovat data před odevzdáním" (`check-data`) spustí `validateForm()`. Při chybách se nastaví atribut `errors` a zůstane vidět Zkontrolovat. Při úspěchu se Zkontrolovat skryje a odkryje se „Uložit dotazník k odevzdání" (`save`). Jakákoli změna ve formuláři (`form-changed`) tlačítka vrátí zpět — odevzdat nelze bez čerstvé kontroly. Stav viditelnosti žije v `app.buttonState`, aby ho `buildButtons()` udržel i přes rebuild.
- **Vlastní byznys pravidla** (nejsou v JSON stromu, jsou hardcoded na ID v konstantě `FIELD`):
  - `10067` (státní občanství) se defaultně nastaví na `CZ`
  - `10057` (rodné číslo) je povinné, pokud `10067` je `CZ` nebo prázdné; jinak nepovinné. Přepočítává se v `form-changed` přes `syncConditionalRequired()`.
  - `validateConditionalRules()` je záměrně prázdný hook pro další podmíněná pravidla. Zapisuje se do něj **klíč hlášky**, ne text.
- `saveForm()` — serializace `File` objektů do base64 (`_is_file: true`) a stažení jako `yyyy-mm-dd Osobní dotazník Příjmení Jméno.json` (příjmení = `10053`, jméno = `10054`).
- `tagButtons()` — doplní tlačítkům `data-action`, aby na ně šlo cílit nezávisle na jazyce popisku (ts-form sám žádný takový atribut nenastavuje). Drží se aktuální přes `MutationObserver`, protože re-render tlačítka vytváří znovu.

Import/export rozpracovaných dat (`import-data` / `export-data`) řeší ts-form sám, jen se konfiguruje v `buildButtons()`.

## ts-form — vendorovaná komponenta

`docs/ts-form-bundle.js` a `ts-form/*.js` jsou **kopie ze sousedního repa `../TSWebUI`**, ne zdrojáky tohoto projektu. Needituj je tady — změny se ztratí při dalším `./update_ts_form.sh`. Oprav je v `../TSWebUI` a zkopíruj.

`ts-form/` obsahuje nesbalené zdroje jen pro čtení/orientaci; runtime používá výhradně `docs/ts-form-bundle.js`.

API komponenty (atributy `layout`/`fields`/`buttons`/`values`/`errors`/`locale`, události `form-submit`/`form-changed`, typy polí, registr `TSFormI18n`) je popsané v `ts-form-readme.md` — ten je také kopírovaný z `../TSWebUI`.

Lokalizaci vlastních textů komponenty přidal [TSWebUI#2](https://github.com/janbkrejci/TSWebUI/pull/2), sloučený do `main`. Aktuální `docs/ts-form-bundle.js` je build odtud; další aktualizace už jede standardně přes `./update_ts_form.sh`.

Komponenta se konfiguruje **výhradně přes HTML atributy s JSON stringy**. Změna atributu `fields` vyvolá re-render (může způsobit ztrátu fokusu — viz poznámka u logiky `10057`).

Externí závislosti přes CDN: Shoelace 2.12.0 (UI prvky, `sl-*`) a Tailwind CDN.

## Testy

`tests/regzec_form.spec.js` jede proti `http://localhost:8000/docs/new_regzec_form.html` a má tři skupiny: `RegZec Form Scenarios` (round-trip), `Localization` a `Index page`.

Dvě pravidla, na kterých testy stojí:

- **Tlačítka se hledají přes `sl-button[data-action="…"]`**, ne podle textu — popisky jsou lokalizované. Pomocník `actionButton(page, action)`.
- **Po každé navigaci volej `waitForFormReady(page)`.** `<ts-form>` je v HTML od začátku, takže `toBeVisible()` projde dřív, než se načtou slovníky a vykreslí záložky. Bez tohoto čekání `fillForm()` najde nula záložek a test spadne až na validaci, což vypadá jako chyba formuláře.

Round-trip scénář z `tests/test_scenarios.json`:

1. projde všechny záložky a vyplní pole podle `field-name` (= ID),
2. Zkontrolovat → Uložit → stáhne JSON #1,
3. reload prázdného formuláře, import staženého JSONu,
4. Zkontrolovat → Uložit → stáhne JSON #2,
5. ověří, že #1 i #2 odpovídají vstupním datům a navzájem si rovnají (round-trip test).

Souborová pole (`999102`, `999103`, `999104`, `999146`, `999145`, `999105`) se z porovnání vyjímají — kontroluje se jen `_is_file: true`. Tenhle seznam je hardcoded v `tests/regzec_form.spec.js` i v `tests/verify_match_ignore_files.py`; **při přidání nového `file` pole ho aktualizuj na obou místech**.

Scénáře pokrývají tři režimy vyplnění: `non_default` (hodnoty jiné než default), `explicit_default` (default zadaný explicitně), `implicit_default` (pole vynechané). Po změně struktury formuláře je nutné scénáře přegenerovat: `(cd tests && python3 create_scenarios.py)`.

Stažené výstupy končí v `test-results/downloads/<projekt>/` (gitignorováno).

Skupina `Localization` hlídá to, co se snadno rozbije: výchozí češtinu, zachování vyplněných dat i aktivní záložky při přepnutí jazyka, překlad číselníků (včetně zemí přes `Intl.DisplayNames`) a to, že skryté ISPV pole `999147` se opravdu nevykresluje.

## Ostatní soubory

- `docs/regzec_form (s ISPV vzděláním).json` — záloha varianty, kde jsou pole `ispv_code` (`999147`, dlouhý kód vzdělání v konkrétní škole, formát `0000.00000.00000000.00000.0000`) a `ispv_instruction` viditelná. V ostrém `docs/regzec_form.json` mají `skip: true`, což je jediný rozdíl mezi soubory.
- `regzec_structure.json` — meziprodukt extrakce, přepisuje se skriptem; nemá ruční úpravy.
- `Všeobecné zásady pro vyplňování…pdf` — oficiální ČSSZ metodika, referenční.

## Jazyk

UI, popisky polí, texty tlačítek i commit historie jsou česky. Nové uživatelsky viditelné texty piš česky s diakritikou.
