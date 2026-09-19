#!/usr/bin/env python3
"""Ověří, že překladové slovníky pokrývají celý formulář.

Spouštět z kořene repozitáře:

    python3 tests/check_i18n.py

Hlásí dvě věci:
  * chybějící překlad viditelného textu (popisek, placeholder, vnitřní label, markdown),
  * osiřelý klíč ve slovníku, který už žádnému uzlu neodpovídá (typicky po úpravě
    struktury v regzec_structure.html).

Číselník `state` se nekontroluje — 249 zemí překládá Intl.DisplayNames v i18n.js.
"""

import json
import os
import sys

FORM_FILE = 'docs/regzec_form.json'
ENUMS_FILE = 'docs/regzec_enums.json'
I18N_DIR = 'docs/i18n'

# Jazyky, které mají mít plný překryv. Čeština je zdroj pravdy v samotné definici.
TRANSLATED_LANGS = ['en']

# Vlastnosti uzlu, které se zobrazují uživateli.
TRANSLATABLE_PROPS = ['description', 'placeholder', 'label', 'content']

# Číselníky, které se nepřekládají ručně.
ENUM_EXCEPTIONS = {'state'}


def load(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def visible_nodes(nodes, prefix=''):
    """Vrací (klíč, uzel) pro každý uzel, který se ve formuláři vykreslí."""
    if isinstance(nodes, list):
        for node in nodes:
            yield from visible_nodes(node, prefix)
        return

    node = nodes
    path = f"{prefix}.{node['key']}" if prefix else node['key']

    if node.get('skip'):
        return

    yield (node.get('id') or path), node

    for child in node.get('children', []):
        yield from visible_nodes(child, path)


def check_form(lang, form):
    overlay_path = os.path.join(I18N_DIR, f'regzec.{lang}.json')
    if not os.path.exists(overlay_path):
        return [f'{overlay_path} chybí'], []

    nodes = load(overlay_path).get('nodes', {})

    missing = []
    seen = set()

    for key, node in visible_nodes(form):
        seen.add(key)
        entry = nodes.get(key, {})

        for prop in TRANSLATABLE_PROPS:
            source = node.get(prop)
            if not source or not str(source).strip():
                continue
            # Grafika bez písmen (např. markdown oddělovač "----") překlad nepotřebuje.
            if not any(ch.isalpha() for ch in str(source)):
                continue
            if not entry.get(prop):
                preview = ' '.join(str(source).split())[:60]
                missing.append(f'{lang}: uzel {key} -> {prop} ({preview})')

    orphans = [f'{lang}: uzel {key} už ve formuláři není' for key in sorted(nodes) if key not in seen]
    return missing, orphans


def check_enums(lang, enums, form):
    overlay_path = os.path.join(I18N_DIR, f'enums.{lang}.json')
    if not os.path.exists(overlay_path):
        return [f'{overlay_path} chybí']

    overlay = load(overlay_path)

    used = set()
    for _, node in visible_nodes(form):
        if node.get('ciselnik'):
            used.add(node['ciselnik'])

    missing = []
    for name in sorted(used - ENUM_EXCEPTIONS):
        translated = overlay.get(name, {})
        for option in enums.get(name, []):
            if not translated.get(option['value']):
                missing.append(f"{lang}: číselník {name} -> {option['value']} ({option['label'][:40]})")

    return missing


def main():
    if not os.path.exists(FORM_FILE):
        print(f'Spusťte z kořene repozitáře — {FORM_FILE} nenalezen.')
        return 1

    form = load(FORM_FILE)
    enums = load(ENUMS_FILE)

    missing = []
    orphans = []

    for lang in TRANSLATED_LANGS:
        form_missing, form_orphans = check_form(lang, form)
        missing += form_missing
        orphans += form_orphans
        missing += check_enums(lang, enums, form)

    for item in missing:
        print(f'CHYBÍ   {item}')
    for item in orphans:
        print(f'NAVÍC   {item}')

    if missing:
        print(f'\nFAIL: {len(missing)} chybějících překladů, {len(orphans)} osiřelých klíčů.')
        return 1

    if orphans:
        print(f'\nOK s výhradou: {len(orphans)} osiřelých klíčů ve slovníku (nevadí, jen zabírají místo).')
        return 0

    print('OK: překlady pokrývají celý formulář i použité číselníky.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
