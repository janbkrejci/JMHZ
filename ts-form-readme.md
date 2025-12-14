TSForm
Komponenta ts-form je univerzální formulářový generátor založený na JSON konfiguraci. Podporuje složité layouty, záložky (tabs), validace a širokou škálu vstupních prvků.

Rychlý Příklad
<ts-form
  layout='{
    "rows": [
      [{"field": "name", "width": "1fr"}, {"field": "email", "width": "1fr"}],
      [{"field": "country", "width": "1fr"}]
    ]
  }'
  fields='{
    "name": {"type": "text", "label": "Jméno", "required": true},
    "email": {"type": "email", "label": "E-mail", "required": true},
    "country": {
        "type": "combobox", 
        "label": "Země", 
        "options": [{"value": "cz", "label": "Česko"}, {"value": "sk", "label": "Slovensko"}]
    }
  }'
  buttons='[
    {"action": "save", "label": "Uložit", "variant": "primary"}
  ]'
></ts-form>

Layout Konfigurace
Layout formuláře se definuje pomocí JSON objektu předaného do atributu layout.

Struktura
Layout může být definován dvěma způsoby:

Se záložkami (Tabs):
{
  "tabs": [
    {
      "label": "Název záložky",
      "rows": [ ... ]
    },
    ...
  ]
}

Bez záložek (Jednoduchý):
{
  "rows": [ ... ]
}

Řádky a Sloupce (Grid)
Vlastnost rows je pole polí, kde vnitřní pole reprezentuje řádek a jeho prvky jsou sloupce.

"rows": [
  [ { "field": "firstName", "width": "1fr" }, { "field": "lastName", "width": "1fr" } ], // 2 sloupce
  [ { "field": "bio", "width": "100%" } ] // 1 sloupec přes celou šířku
]

Vlastnosti buňky layoutu
field: (string) Název pole, který musí odpovídat klíči v definici fields.
width: (string) Šířka sloupce. Lze použít CSS Grid jednotky (např. 1fr, 2fr, 150px, auto).
align: (string) Horizontální zarovnání obsahu buňky ('left', 'center', 'right').
type: (string) Speciální typ buňky, pokud se nejedná o pole.
'empty': Prázdná buňka pro odsazení.
'separator': Oddělovač (viz níže).
Oddělovače (Separators)
Lze vložit vizuální oddělovač sekcí.

[ { "type": "separator", "label": "Osobní údaje" } ]

Konfigurace Polí (Fields)
Definice polí se předává do atributu fields jako JSON objekt, kde klíč je název pole.

Společné parametry
label: (string) Popisek pole.
type: (string) Typ pole (viz níže).
hidden: (boolean) Skryté pole.
disabled: (boolean) Deaktivované pole.
readonly: (boolean) Pole pouze pro čtení.
hint: (string) Nápověda pod polem.
width: (string) Šířka samotného inputu (např. '100%').
autofocus: (boolean) Automaticky zaměří pole po načtení formuláře.
enterAction: (string) Akce při stisku Enter (např. 'submit', 'click:myButton', 'focus:nextField').
escapeAction: (string) Akce při stisku Escape (např. 'clear', 'click:cancel').
Typy polí
Textové vstupy
text: Klasický textový input.
password: Skryté znaky.
textarea: Víceřádkový text. Parametr rows (number).
combobox: Textový input s našeptávačem (datalist). Parametr options.
allowCustom (boolean):
false (default, Strict Mode): Povolí pouze hodnoty ze seznamu options.
Při opuštění pole (blur) se nevalidní hodnota vrátí na předchozí validní hodnotu (revert).
Klávesa Escape vrátí hodnotu na předchozí validní stav a zavře dropdown.
Událost sl-change se vyvolá pouze při výběru validní možnosti.
true (Custom Mode): Povolí zadat libovolný text.
Neznámá hodnota je akceptována jako nová hodnota.
Událost sl-change se vyvolá při výběru možnosti nebo zadání vlastního textu (po blur/enter).
allowEmpty (boolean):
true (default): Hodnota může být prázdná (uživatel ji může smazat).
false: Pokud uživatel smaže hodnotu a opustí pole:
Pokud existovala předchozí validní hodnota, pole se na ni vrátí (revert).
Pokud neexistovala, pole se vyčistí (protože nelze vynutit hodnotu).
Číselné vstupy
number: Číslo. Parametry: min, max, step.
Datum a Čas
Používá knihovnu Flatpickr s českou lokalizací.

date: Výběr data.
datetime: Výběr data a času.
Výběry (Selects a Radios)
select: Jednoduchý výběr (dropdown).
multiselect: Výběr více hodnot.
radio: Skupina přepínačů (radio buttons).
Parametr options:
Pole objektů: [{ "value": "cz", "label": "Česko" }, ...]
Nebo pole řetězců ve formátu "value/Label".
Relationship Picker (M:N)
Pokročilý výběr vazeb s vyhledáváním a čipy.

type: 'relationship'
targetEntity: (string) Název entity (pro dialog).
mode: 'single' nebo 'multiple'.
displayFields: (array) Pole zobrazovaná v tabulce výsledků.
chipDisplayFields: (array) Pole zobrazovaná na vybraných čipech.
options: (array) Data pro výběr (pole objektů).
Přepínače a Checkboxy
switch: Přepínač (ON/OFF).
checkbox: Zaškrtávací políčko.
Slider
type: 'slider'
min, max, step: Rozsah a krok.
hideLabel: (boolean) Skryje číselnou hodnotu/label nad sliderem.
Soubory a Obrázky
file: Nahrávání souborů.
image: Nahrávání obrázků (automaticky accept="image/*").
multiple: (boolean) Povolit více souborů.
accept: (string) MIME typy (např. .pdf,.doc).
Download: U nahraných souborů se automaticky zobrazuje ikona pro stažení obsahu.
Samostatná Tlačítka (v gridu)
type: 'button'
label: Text tlačítka.
variant: 'primary', 'default', 'neutral', 'danger', atd.
action: (string) Identifikátor akce pro event form-field-action.
Informační boxy (Infobox)
Zobrazí sl-alert pro statické informace.

type: 'infobox'
variant: 'primary', 'success', 'neutral', 'warning', 'danger'.
icon: (string) Název ikony (Shoelace icon name).
content: (html string) Obsah boxu. Může obsahovat HTML.
value: (string) Alternativně lze obsah předat přes hodnotu pole.
Markdown Obsah
Zobrazí renderovaný markdown.

type: 'markdown'
content: (string) Markdown řetězec.
value: (string) Alternativně lze obsah předat přes hodnotu pole.
Tabulka (Embedded Table)
Vloží plnohodnotnou ts-table do formuláře.

type: 'table'
columns: Definice sloupců (stejné jako u ts-table).
data: Data tabulky (nebo předaná přes value formuláře).
Podporované flagy: showCreateButton, enableSorting, enableFiltering, enablePagination, atd.
Akce: singleItemActions, multipleItemsActions.
Button Group
Skupina tlačítek chovající se jako radio buttony.

type: 'button-group'
variant:
'default': Standardní tlačítka.
'process': Tlačítka ve tvaru šipek (procesní flow).
options: Pole řetězců "value/enabled/variant/Label".
Příklad: ["draft/true/neutral/Koncept", "published/true/success/Publikováno"]
Tlačítka Formuláře (Buttons)
Konfigurace akčních tlačítek v patičce formuláře (atribut buttons).

[
  {
    "action": "submit",
    "label": "Uložit",
    "variant": "primary",
    "disabled": false
  },
  {
    "action": "cancel",
    "label": "Zrušit",
    "variant": "neutral",
    "position": "left",
    "hidden": false
  }
]

Parametry tlačítka
action: (string) Identifikátor akce.
label: (string) Text tlačítka.
variant: (string) Vzhled tlačítka (primary, success, neutral, warning, danger, text, default).
position: (string) Pozice tlačítka v patičce (left, center, right). Výchozí je right.
disabled: (boolean) Pokud true, tlačítko je neaktivní (šedé).
hidden: (boolean) Pokud true, tlačítko není vidět.
Import a Export Dat
Formulář podporuje vestavěné akce pro uložení a načtení dat ve formátu JSON (včetně souborů jako Base64).

export-data: Uloží kompletní stav formuláře do souboru form-data-YYYY-MM-DD.json.
import-data: Otevře dialog pro výběr JSON souboru a načte data do formuláře.
Příklad použití:

[
  { "action": "export-data", "label": "Exportovat", "variant": "primary" },
  { "action": "import-data", "label": "Importovat", "variant": "default" }
]

Potvrzení Akce (Confirmation)
Tlačítka mohou vyžadovat potvrzení před provedením akce. To se konfiguruje objektem confirmation.

{
  "action": "delete",
  "label": "Smazat",
  "variant": "danger",
  "confirmation": {
    "title": "Potvrdit akci",
    "text": "Opravdu smazat záznam?",
    "buttons": [
      { "action": "no", "label": "Ne", "variant": "default" },
      { "action": "yes", "label": "Ano", "variant": "danger", "confirm": true }
    ]
  }
}

confirmation.title: (string) Nadpis dialogu.
confirmation.text: (string) Text dialogu.
confirmation.buttons: (array) Tlačítka v dialogu. Tlačítko s "confirm": true provede původní akci.
Metody
showImportResults(fieldName, results)
Zobrazí dialog s výsledky importu nad konkrétním polem typu tabulka.

fieldName: (string) Název pole (klíč v fields konfiguraci).
results: (object) Objekt s výsledky importu (obsahuje počty added, updated, skipped, rejected).
Události (Events)
Komponenta vyhazuje následující CustomEvents:

form-changed
Vyvolána při změně hodnoty jakéhokoliv pole.

detail.field: (string) Název změněného pole.
detail.value: (any) Nová hodnota.
detail.formData: (object) Aktuální data celého formuláře.
form-submit
Vyvolána při kliknutí na tlačítko v patičce formuláře (definované v buttons).

detail.action: (string) Akce tlačítka (např. 'submit', 'cancel').
detail.formData: (object) Data formuláře při odeslání.
form-field-action
Vyvolána při kliknutí na samostatné tlačítko uvnitř gridu (typ pole button).

detail.field: (string) Název pole tlačítka.
detail.action: (string) Akce definovaná v konfiguraci pole.
form-table-action
Bublající událost z vnořené tabulky (typ pole table).

detail.field: (string) Název pole tabulky.
detail.action: (string) Typ akce (např. 'row-clicked', 'create-new-record').
detail.originalDetail: (object) Původní detail události z ts-table.
Ukázka
<ts-form
  layout='{
    "tabs": [
      {"label": "Základní informace", "rows": [
        [{"field": "name", "width": "1fr"}, {"field": "email", "width": "1fr"}],
        [{"field": "role", "width": "1fr"}, {"field": "active", "width": "auto"}],
        [{"field": "bio", "width": "100%"}]
      ]},
      {"label": "Přílohy", "rows": [
        [{"field": "avatar", "width": "1fr"}]
      ]}
    ]
  }'
  fields='{
    "name": {"type": "text", "label": "Jméno", "required": true},
    "email": {"type": "email", "label": "E-mail", "required": true},
    "role": {
        "type": "select", 
        "label": "Role", 
        "options": [{"value": "admin", "label": "Admin"}, {"value": "user", "label": "User"}]
    },
    "active": {"type": "switch", "label": "Aktivní účet"},
    "bio": {"type": "textarea", "label": "O mně", "rows": 3},
    "avatar": {"type": "image", "label": "Profilové foto"}
  }'
  errors='{
    "email": "Zadejte platný email"
  }'
  buttons='[
    {"action": "save", "label": "Uložit změny", "variant": "primary"},
    {"action": "cancel", "label": "Zrušit", "variant": "default", "position": "left"}
  ]'
></ts-form>
<script>
  const form = document.querySelector('ts-form');
  form.addEventListener('form-changed', (e) => console.log('Changed:', e.detail));
  form.addEventListener('form-submit', (e) => console.log('Submit:', e.detail));
  form.addEventListener('form-field-action', (e) => console.log('Action:', e.detail));
</script>

Validace a Chyby
Chyby validace se předávají do atributu errors jako JSON objekt, kde klíčem je název pole a hodnotou chybová hláška.

{
  "email": "Zadejte platný email",
  "password": "Heslo je příliš krátké"
}

Pokud pole obsahuje chybu:

Input zčervená (aplikuje se třída .input-invalid).
Pod inputem se zobrazí chybová hláška.
Ovládání Klávesnicí
Formulář podporuje pokročilé ovládání klávesnicí konfigurovatelné pro každé pole.

Konfigurovatelné Akce (enterAction, escapeAction)
Akce lze definovat jako řetězce v následujících formátech:

'submit': Odešle formulář (klikne na tlačítko typu submit nebo primary).
'click:BUTTON_ACTION': Klikne na tlačítko s danou action (např. 'click:save').
'focus:FIELD_NAME': Přesune focus na jiné pole (např. 'focus:password').
'clear': Vymaže hodnotu pole (pouze pro escapeAction).
'next': (Experimentální) Přesune focus na další pole.
Příklad Konfigurace
"username": {
  "type": "text",
  "label": "Uživatel",
  "autofocus": true,
  "enterAction": "focus:password",
  "escapeAction": "click:cancel"
},
"password": {
  "type": "password",
  "label": "Heslo",
  "enterAction": "submit",
  "escapeAction": "click:cancel"
}
