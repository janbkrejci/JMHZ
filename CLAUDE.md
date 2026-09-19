# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Co to je

Statický webový formulář (bez build kroku) pro sběr osobních údajů zaměstnance pro **Jednotné měsíční hlášení zaměstnavatele (JMHZ)** ČSSZ, platné od 1. 4. 2026. Nasazeno přes GitHub Pages z větve `main`, složka `/docs` → https://janbkrejci.github.io/JMHZ/

Formulář běží celý v prohlížeči. Žádný backend — data se importují/exportují jako JSON soubory přes stahování a file input.

## Příkazy

```bash
# Lokální server (nutný pro testy i ruční zkoušení — fetch() nefunguje z file://)
python3 -m http.server 8000
# → http://localhost:8000/docs/regzec_form.html      (režim „Doplnění údajů")
# → http://localhost:8000/docs/new_regzec_form.html  (režim „Nový zaměstnanec")
# → http://localhost:8000/regzec_structure.html      (editor struktury formuláře)

# Playwright testy (vyžadují běžící server na :8000)
npx playwright test
npx playwright test --project=chromium                     # jeden prohlížeč
npx playwright test -g "Set 1"                             # jeden scénář
npx playwright test --project=chromium -g "Non-Default"    # jeden test

# Regenerace dat z Excelu (skripty mají uv shebang, dependencies inline)
./extract_regzec_structure.py   # regzec.xlsx → regzec_structure.json
./extract_regzec_enums.py       # regzec.xlsx + jmhz datová věta.xlsx → docs/regzec_enums.json

# Aktualizace vendorované ts-form komponenty ze sousedního repa ../TSWebUI
./update_ts_form.sh

# Pomocné skripty (pozor na pracovní adresář!)
python3 list_all_ids.py                       # z rootu: výpis všech ID + popisů
python3 tests/check_ids.py docs/regzec_form.json  # kontrola duplicit/chybějících ID
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

## Dva režimy formuláře

`docs/regzec_form.html` a `docs/new_regzec_form.html` jsou **bajt po bajtu identické**. Režim se odvozuje výhradně z názvu souboru:

```js
const SHOW_NEW_ONLY_FIELDS = window.location.pathname.includes('new_regzec_form');
```

Změna v jednom HTML se musí propsat do druhého.

## `docs/regzec_form.js` — aplikační vrstva

Jediný ručně psaný aplikační kód. Odpovídá za:

- `buildMetadata()` / `flattenNode()` / `packRows()` / `convertRowToFr()` — překlad stromu na ts-form `layout` + `fields` + `values`.
- **Tlačítkový workflow:** „Zkontrolovat data před odevzdáním" (`check-data`) spustí `validateForm()`. Při chybách se nastaví atribut `errors` a zůstane vidět Zkontrolovat. Při úspěchu se Zkontrolovat skryje a odkryje se „Uložit dotazník k odevzdání" (`save`). Jakákoli změna ve formuláři (`form-changed`) tlačítka vrátí zpět — odevzdat nelze bez čerstvé kontroly.
- **Vlastní byznys pravidla** (nejsou v JSON stromu, jsou hardcoded na ID):
  - `10067` (státní občanství) se defaultně nastaví na `CZ`
  - `10057` (rodné číslo) je povinné, pokud `10067` je `CZ` nebo prázdné; jinak nepovinné. Přepočítává se v `form-changed`.
  - `validateConditionalRules()` je záměrně prázdný hook pro další podmíněná pravidla.
- `saveForm()` — serializace `File` objektů do base64 (`_is_file: true`) a stažení jako `yyyy-mm-dd Osobní dotazník Příjmení Jméno.json` (příjmení = `10053`, jméno = `10054`).

Import/export rozpracovaných dat (`import-data` / `export-data`) řeší ts-form sám, jen se konfiguruje v `buttonsConfig`.

## ts-form — vendorovaná komponenta

`docs/ts-form-bundle.js` a `ts-form/*.js` jsou **kopie ze sousedního repa `../TSWebUI`**, ne zdrojáky tohoto projektu. Needituj je tady — změny se ztratí při dalším `./update_ts_form.sh`. Oprav je v `../TSWebUI` a zkopíruj.

`ts-form/` obsahuje nesbalené zdroje jen pro čtení/orientaci; runtime používá výhradně `docs/ts-form-bundle.js`.

API komponenty (atributy `layout`/`fields`/`buttons`/`values`/`errors`, události `form-submit`/`form-changed`, typy polí) je popsané v `ts-form-readme.md` — ten je také kopírovaný z `../TSWebUI`.

Komponenta se konfiguruje **výhradně přes HTML atributy s JSON stringy**. Změna atributu `fields` vyvolá re-render (může způsobit ztrátu fokusu — viz poznámka u logiky `10057`).

Externí závislosti přes CDN: Shoelace 2.12.0 (UI prvky, `sl-*`) a Tailwind CDN.

## Testy

`tests/regzec_form.spec.js` jede proti `http://localhost:8000/docs/new_regzec_form.html` (vždy režim „Nový zaměstnanec", tedy všechna pole). Pro každý scénář z `tests/test_scenarios.json`:

1. projde všechny záložky a vyplní pole podle `field-name` (= ID),
2. Zkontrolovat → Uložit → stáhne JSON #1,
3. reload prázdného formuláře, import staženého JSONu,
4. Zkontrolovat → Uložit → stáhne JSON #2,
5. ověří, že #1 i #2 odpovídají vstupním datům a navzájem si rovnají (round-trip test).

Souborová pole (`999102`, `999103`, `999104`, `999146`, `999145`, `999105`) se z porovnání vyjímají — kontroluje se jen `_is_file: true`. Tenhle seznam je hardcoded v `tests/regzec_form.spec.js` i v `tests/verify_match_ignore_files.py`; **při přidání nového `file` pole ho aktualizuj na obou místech**.

Scénáře pokrývají tři režimy vyplnění: `non_default` (hodnoty jiné než default), `explicit_default` (default zadaný explicitně), `implicit_default` (pole vynechané). Po změně struktury formuláře je nutné scénáře přegenerovat: `(cd tests && python3 create_scenarios.py)`.

Stažené výstupy končí v `test-results/downloads/<projekt>/` (gitignorováno).

## Ostatní soubory

- `docs/regzec_form (s ISPV vzděláním).json` — záloha varianty, kde jsou pole `ispv_code` a `ispv_instruction` viditelná (v aktuální verzi mají `skip: true`). Jediný rozdíl oproti `docs/regzec_form.json`.
- `regzec_structure.json` — meziprodukt extrakce, přepisuje se skriptem; nemá ruční úpravy.
- `Všeobecné zásady pro vyplňování…pdf` — oficiální ČSSZ metodika, referenční.

## Jazyk

UI, popisky polí, texty tlačítek i commit historie jsou česky. Nové uživatelsky viditelné texty piš česky s diakritikou.
