import { Czech } from 'flatpickr/dist/l10n/cs.js';

/**
 * Strings the components render themselves — everything a consumer cannot
 * already supply through field configuration.
 *
 * Czech is the default so existing embeds keep working without any change.
 * A consumer switches languages with TSFormI18n.setLocale('en') or by putting
 * a `locale` attribute on <ts-form>, and can add or override strings (including
 * whole new languages) with TSFormI18n.register().
 */
const PACKS = {
    cs: {
        'file.label': 'Nahrát soubory',
        'file.dropSingle': 'Přetáhněte soubor sem nebo klikněte pro nahrání',
        'file.dropMultiple': 'Přetáhněte soubory sem nebo klikněte pro nahrání',
        'file.download': 'Stáhnout',
        'file.remove': 'Odstranit',

        'picker.empty': 'Žádné položky nevybrány',
        'picker.close': 'Zavřít',
        'picker.noResults': 'Žádné výsledky',

        'dialog.confirmTitle': 'Potvrzení',
        'dialog.confirmText': 'Opravdu chcete pokračovat?'
    },
    en: {
        'file.label': 'Upload files',
        'file.dropSingle': 'Drag a file here or click to upload',
        'file.dropMultiple': 'Drag files here or click to upload',
        'file.download': 'Download',
        'file.remove': 'Remove',

        'picker.empty': 'No items selected',
        'picker.close': 'Close',
        'picker.noResults': 'No results',

        'dialog.confirmTitle': 'Confirm',
        'dialog.confirmText': 'Are you sure you want to continue?'
    }
};

/**
 * Calendar locales for flatpickr (month and weekday names, first day of week).
 * `null` means flatpickr's built-in default, which is English.
 *
 * The date *format* is deliberately not part of a locale. It stays day-first
 * and numeric in every language, because the input parser accepts day-first
 * input (`3.4.2026`, `03042026`) and a locale-dependent format would silently
 * reinterpret such a date as 4 March in a month-first locale.
 */
const CALENDARS = {
    cs: Czech,
    en: null
};

const DEFAULT_LOCALE = 'cs';
const EVENT = 'ts-locale-change';

let current = DEFAULT_LOCALE;

function pack(locale) {
    return PACKS[locale] || PACKS[DEFAULT_LOCALE];
}

export const TSFormI18n = {
    get locale() {
        return current;
    },

    get locales() {
        return Object.keys(PACKS);
    },

    /** Name of the DOM event fired on `document` whenever the locale changes. */
    get changeEvent() {
        return EVENT;
    },

    /**
     * Switches the language of every mounted component.
     * Unknown locales are ignored so a typo cannot blank out the UI.
     */
    setLocale(locale) {
        if (!locale || locale === current || !PACKS[locale]) return current;

        current = locale;
        document.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: current } }));
        return current;
    },

    /** Adds a language or overrides individual strings of an existing one. */
    register(locale, strings) {
        if (!locale || !strings) return;

        PACKS[locale] = { ...(PACKS[locale] || PACKS[DEFAULT_LOCALE]), ...strings };

        if (locale === current) {
            document.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: current } }));
        }
    },

    /** Supplies the flatpickr calendar locale for a language. */
    registerCalendar(locale, flatpickrLocale) {
        CALENDARS[locale] = flatpickrLocale || null;
    },

    t(key) {
        const value = pack(current)[key];
        return value === undefined ? (PACKS[DEFAULT_LOCALE][key] || key) : value;
    },

    /** Calendar locale to hand to flatpickr; `null` keeps its English default. */
    calendar() {
        return Object.prototype.hasOwnProperty.call(CALENDARS, current) ? CALENDARS[current] : null;
    }
};

// Consumers that load the bundle with <script type="module"> cannot import from
// it, so expose the registry globally as well.
if (typeof window !== 'undefined' && !window.TSFormI18n) {
    window.TSFormI18n = TSFormI18n;
}
