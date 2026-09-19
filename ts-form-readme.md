# TS-FORM Technical Documentation

`ts-form` je webová komponenta (Custom Element) pro generování dynamických formulářů na základě JSON konfigurace. Je navržena tak, aby byla univerzální, snadno konfigurovatelná a integruvatelná do jakékoliv webové aplikace.

## Základní použití

```html
<ts-form
  layout='{...}'
  fields='{...}'
  buttons='[...]'
  values='{...}'
  errors='{...}'
></ts-form>
```

Připojení listenerů:
```javascript
const form = document.querySelector('ts-form');
form.addEventListener('form-submit', e => {
    console.log('Action:', e.detail.action);
    console.log('Data:', e.detail.formData);
});
```

---

## 1. Atributy komponenty

### `layout` (JSON Object)
Definuje strukturu formuláře. Dva režimy:

**A. Tabs Layout (Se záložkami)**
```json
{
  "tabs": [
    {
      "label": "Záložka 1",
      "rows": [ ... ]
    },
    ...
  ]
}
```

**B. Single Layout (Bez záložek)**
```json
{
  "rows": [ ... ]
}
```

**Definice řádků (`rows`):**
Pole polí, kde vnitřní pole reprezentuje řádek a prvky v něm sloupce.
```json
"rows": [
  [ { "field": "name", "width": "1fr" }, { "field": "surname", "width": "1fr" } ],
  [ { "field": "bio", "width": "100%" } ]
]
```
- `field`: Klíč do objektu `fields`.
- `width`: CSS grid šířka (např. `1fr`, `200px`, `auto`).
- `align`: Zarovnání (`left`, `center`, `right`).
- `type`: Speciální typy buněk:
  - `'empty'`: Prázdné místo.
  - `'separator'`: Oddělovač (`{ "type": "separator", "label": "Nadpis sekce" }`).

### `fields` (JSON Object)
Definice jednotlivých vstupních polí. Klíč objektu odpovídá `field` v layoutu.
Všechny typy polí a jejich konfigurace jsou popsány v sekci [3. Typy polí a konfigurace](#3-typy-polí-a-konfigurace).

### `buttons` (JSON Array)
Definice tlačítek v patičce formuláře.
```json
[
  { 
    "action": "save", 
    "label": "Uložit", 
    "variant": "primary", 
    "disabled": false,
    "hidden": false,
    "position": "right", // left, center, right
    "confirmation": { ... } // Volitelné potvrzovací okno
  }
]
```

### `values` (JSON Object)
Počáteční hodnoty formuláře. Klíč = název pole.
```json
{
  "name": "Jan Novák",
  "active": true
}
```

### `errors` (JSON Object)
Externí validace. Přiřazuje chybové hlášky k polím.
```json
{
  "email": "Neplatný formát emailu"
}
```

### `active-tab` (Number/String)
Index aktivní záložky (0-indexed). Změna atributu přepne záložku.

### Potvrzení akce tlačítka (Confirmation)
Každé tlačítko v `buttons` může vyžadovat potvrzení před provedením akce. To se definuje objektem `confirmation`.

```json
{
  "action": "delete",
  "label": "Smazat",
  "variant": "danger",
  "confirmation": {
    "title": "Potvrdit smazání",
    "text": "Opravdu chcete smazat tento záznam? Tuto akci nelze vrátit zpět.",
    "buttons": [
      { "action": "cancel", "label": "Zrušit", "variant": "default" },
      { "action": "confirm", "label": "Smazat", "variant": "danger", "confirm": true }
    ]
  }
}
```
- `title`: (String) Nadpis dialogu.
- `text`: (String) Text zprávy.
- `buttons`: (Array) Definice tlačítek v dialogu.
  - `confirm: true`: Toto tlačítko potvrdí původní akci a dialog zavře.
  - Ostatní tlačítka pouze zavřou dialog.

### Speciální systémová tlačítka
Některé hodnoty `action` mají v `ts-form` speciální, vestavěné chování:

1. **`export-data`**
   - Automaticky stáhne aktuální data formuláře do souboru `form-data-YYYY-MM-DD.json`.
   - Nevyžaduje žádné další handlery.

2. **`import-data`**
   - Otevře systémový dialog pro výběr JSON souboru.
   - Po výběru souboru se data automaticky načtou do formuláře.
   - Podporuje i binární soubory v Base64 (pokud jsou tak ve formuláři uloženy).

Příklad použití v konfiguraci:
```json
[
  { "action": "export-data", "label": "Exportovat do souboru", "variant": "default" },
  { "action": "import-data", "label": "Načíst ze souboru", "variant": "default" }
]
```

---

## 2. Události (Events)

### `form-submit`
Vyvolána kliknutím na tlačítko v patičce.
- `detail.action`: (String) Identifikátor akce tlačítka.
- `detail.formData`: (Object) Aktuální hodnoty všech polí formuláře.

### `form-changed`
Vyvolána při změně hodnoty pole.
- `detail.field`: (String) Název změněného pole.
- `detail.value`: (Any) Nová hodnota.
- `detail.formData`: (Object) Aktuální hodnoty celého formuláře.

### `form-field-action`
Vyvolána kliknutím na tlačítko typu `button` umístěné uvnitř formuláře (v gridu).
- `detail.field`: (String) Název pole.
- `detail.action`: (String) Akce definovaná v konfiguraci pole.

### `form-table-action`
Bublající událost z vnořené tabulky (`type: 'table'`).
- `detail.field`: (String) Název pole tabulky.
- `detail.action`: (String) Akce (např. `row-clicked`, `delete`).
- `detail.originalDetail`: (Object) Původní data události.

---

## 3. Typy polí a konfigurace

Každé pole v atributu `fields` má vlastnost `type` a další specifické vlastnosti.

### Společné vlastnosti
- `label`: (String) Popisek.
- `required`: (Boolean) Povinné pole (zobrazí hvězdičku).
- `hidden`: (Boolean) Skryté pole.
- `disabled`: (Boolean) Deaktivované pole.
- `readonly`: (Boolean) Pouze pro čtení.
- `hint`: (String) Nápověda pod polem.
- `autofocus`: (Boolean) Zaměření po načtení.
- `placeholder`: (String) Text zobrazený v prázdném poli (týká se textových polí, comboboxu, data atd.).
- `enterAction`: (String) Akce na Enter (`submit`, `focus:field`, `click:action`).
- `escapeAction`: (String) Akce na Escape (`clear`, `click:action`).

### Textové a číselné
- **`text`**: Běžný input.
- **`textarea`**: Víceřádkový (`rows`: number).
- **`password`**: Heslo.
- **`number`**: Číslo (`min`, `max`, `step`, `roundTo`).
- **`slider`**: Posuvník (`min`, `max`, `step`, `hideLabel`).

### Výběry dat
- **`select`**: Dropdown (`options`: `[{value, label}]` nebo `["val/lbl"]`).
- **`multiselect`**: Výběr více hodnot (`multiple: true` u selectu).
- **`combobox`**: Input s našeptávačem.
  - `allowCustom`: (Boolean) Povolit vlastní hodnoty mimo seznam.
  - `allowEmpty`: (Boolean) Povolit prázdnou hodnotu.
- **`radio`**: Skupina přepínačů (`options`).
- **`checkbox`**: Zaškrtávátko (Boolean hodnota).
- **`switch`**: Přepínač (Boolean hodnota).
- **`button-group`**: Skupina tlačítek chovající se jako radio.
  - `variant`: `'default'` nebo `'process'` (šipkový vzhled).

### Datum a čas
- **`date`**: Datum (ISO string `YYYY-MM-DD`).
- **`datetime`**: Datum a čas (ISO string `YYYY-MM-DDTHH:mm:ss`).

### Soubory
- **`file`**: Nahrávání souborů.
- **`image`**: Nahrávání obrázků (`accept: image/*`).
  - `multiple`: (Boolean) Více souborů.
  - `innerLabel`: (String) Text uvnitř dropzóny (např. "Přetáhněte sem").
  - `accept`: (String) MIME typy.

### Relace (Relationship Picker)
Komplexní výběr vazeb (M:N, 1:N) s vyhledáváním.
- `type`: `'relationship'`
- `mode`: `'single'` nebo `'multiple'`.
- `targetEntity`: (String) Identifikátor entity.
- `displayFields`: (Array) Pole zobrazovaná ve výběru.
- `valueField`: (String) Klíč hodnoty (např. `id`).
- `options`: (Array) Data pro výběr.

### Speciální prvky
- **`button`**: Tlačítko uvnitř formuláře (`action`, `variant`).
- **`infobox`**: Statický alert (`variant`: `primary`, `warning`, ..., `content`: HTML).
- **`markdown`**: Renderovaný MD text (`content`).
- **`table`**: Vnořená `ts-table` s plnou funkcionalitou (`columns`, `data`, akce...).

---

## 4. Metody instance

### `showImportResults(fieldName, results)`
Programově zobrazí dialog s výsledky importu nad tabulkou.
- `fieldName`: Název pole typu table.
- `results`: Objekt `{ added, updated, skipped, rejected }`.

### `exportFormData()`
Spustí interní proces exportu dat do JSON souboru.

### `importFormData()`
Otevře dialog pro import dat z JSON souboru.

---

## 5. Lokalizace

Popisky polí dodává aplikace v `fields` a `layout`. Zbývají texty, které si komponenty vykreslují samy — hláška v nahrávacím poli, tlačítka u nahraného souboru, prázdný stav relationship pickeru, výchozí potvrzovací dialog a názvy měsíců v kalendáři. Ty spravuje registr `TSFormI18n`.

Výchozí jazyk je **čeština**, takže stávající použití se nemění.

```html
<!-- Deklarativně -->
<ts-form locale="en" layout='{...}' fields='{...}'></ts-form>
```

```javascript
// Imperativně (jazyk je společný pro celou stránku)
import { TSFormI18n } from 'ts-web-ui/ts-form';
TSFormI18n.setLocale('en');
```

Při načtení bundlu přes `<script type="module">` není import možný, proto je registr dostupný i jako `window.TSFormI18n`.

Přepnutí jazyka překreslí všechny připojené komponenty. **Vyplněná data zůstávají** — `ts-form` drží hodnoty v `formData` a při překreslení je znovu použije.

### Vlastní jazyk nebo úprava textů

```javascript
TSFormI18n.register('en', { 'file.dropSingle': 'Drop your CV here' });

// Nový jazyk: nevyplněné klíče se doplní z češtiny
TSFormI18n.register('de', { 'file.download': 'Herunterladen' });
TSFormI18n.registerCalendar('de', German);   // locale objekt z flatpickr/dist/l10n/de.js
```

### Klíče

| Klíč | Kde se zobrazí |
|---|---|
| `file.label` | výchozí popisek nahrávacího pole |
| `file.dropSingle` / `file.dropMultiple` | text uvnitř drop zóny |
| `file.download` / `file.remove` | tlačítka u nahraného souboru |
| `picker.empty` / `picker.close` / `picker.noResults` | relationship picker |
| `dialog.confirmTitle` / `dialog.confirmText` | potvrzovací dialog, pokud je tlačítko nedodá v `confirmation` |

`TSFormI18n.locales` vrátí dostupné jazyky, `TSFormI18n.changeEvent` název události, kterou registr posílá na `document` při změně.

### Formát data

Formát data **není** součástí jazyka a zůstává ve všech jazycích číselný, den první (`d. m. Y`). Vstupní pole přijímá `3.4.2026` i `03042026` a vyhodnocuje je jako den–měsíc–rok; kdyby se formát měnil podle jazyka, stejný zápis by v anglosaském locale tiše znamenal 4. března. Lokalizuje se jen kalendář — názvy měsíců, dnů a první den týdne.

---

## 6. CSS Proměnné a Stylování
Komponenta využívá Shoelace Design System proměnné. Důležité proměnné pro přizpůsobení:
- `--sl-color-primary-*`: Barvy primárních prvků.
- `--sl-font-sans`: Písmo.
- `--label-spacing`: Odsazení labelu od inputu.

Třída `.input-invalid` je aplikována na prvky s chybou validace.
