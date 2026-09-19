/**
 * TSI18n — sdílená lokalizace pro všechny personální formuláře.
 *
 * Čeština je výchozí jazyk a zároveň zdroj pravdy: popisky polí zůstávají
 * v definici formuláře (docs/*_form.json) a v číselnících (docs/*_enums.json).
 * Ostatní jazyky jsou překryvné slovníky v docs/i18n/:
 *
 *   common.<lang>.json   společné texty UI (tlačítka, hlášky, názvy stránek)
 *   enums.<lang>.json    překlad číselníků: { "<ciselnik>": { "<value>": "<label>" } }
 *   <form>.<lang>.json   překlad konkrétního formuláře: { "nodes": { "<key>": {...} } }
 *
 * Klíč uzlu (`<key>`) je `id` položky, pokud ho uzel má, jinak tečková cesta
 * složená z `key` od kořene stromu. Stejné pravidlo musí použít i formulář —
 * viz TSI18n.nodeKey().
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'ts-forms-lang';
    var DEFAULT_LANG = 'cs';

    var LANGUAGES = [
        { code: 'cs', label: 'Čeština', short: 'CS' },
        { code: 'en', label: 'English', short: 'EN' }
    ];

    var state = {
        lang: DEFAULT_LANG,
        base: './i18n',
        form: null,
        cache: {},          // lang -> { common, enums, form }
        listeners: []
    };

    function isKnown(code) {
        return LANGUAGES.some(function (l) { return l.code === code; });
    }

    /**
     * ?lang= > dřívější volba uživatele > čeština.
     *
     * Jazyk prohlížeče se záměrně neuplatňuje: výchozí jazyk je čeština a
     * angličtinu si zaměstnanec musí vybrat sám.
     */
    function detectLang() {
        try {
            var q = new URLSearchParams(global.location.search).get('lang');
            if (q && isKnown(q)) return q;
        } catch (e) { /* URLSearchParams nedostupné */ }

        try {
            var stored = global.localStorage.getItem(STORAGE_KEY);
            if (stored && isKnown(stored)) return stored;
        } catch (e) { /* localStorage může být zakázané */ }

        return DEFAULT_LANG;
    }

    /** Chybějící slovník není chyba — znamená „použij výchozí češtinu“. */
    function loadJson(url) {
        return fetch(url).then(function (r) {
            return r.ok ? r.json() : {};
        }).catch(function () {
            return {};
        });
    }

    function loadDicts(lang) {
        if (state.cache[lang]) return Promise.resolve(state.cache[lang]);

        // Popisky polí a číselníků jsou česky už v definici formuláře, takže pro
        // výchozí jazyk žádný překryv neexistuje a nemá smysl si pro něj chodit.
        var overlays = lang !== DEFAULT_LANG;

        var urls = [state.base + '/common.' + lang + '.json'];
        if (overlays) {
            urls.push(state.base + '/enums.' + lang + '.json');
            if (state.form) urls.push(state.base + '/' + state.form + '.' + lang + '.json');
        }

        return Promise.all(urls.map(loadJson)).then(function (parts) {
            var loaded = {
                common: parts[0] || {},
                enums: parts[1] || {},
                form: parts[2] || {}
            };
            state.cache[lang] = loaded;
            return loaded;
        });
    }

    function dicts() {
        return state.cache[state.lang] || { common: {}, enums: {}, form: {} };
    }

    var TSI18n = {
        get lang() { return state.lang; },

        get languages() { return LANGUAGES.slice(); },

        get isDefault() { return state.lang === DEFAULT_LANG; },

        /**
         * @param {{base?: string, form?: string, lang?: string}} options
         * @returns {Promise<string>} zvolený jazyk
         */
        init: function (options) {
            options = options || {};
            if (options.base) state.base = options.base;
            if (options.form) state.form = options.form;

            state.lang = (options.lang && isKnown(options.lang)) ? options.lang : detectLang();

            return loadDicts(state.lang).then(function () {
                TSI18n.applyDocument();
                return state.lang;
            });
        },

        setLang: function (code) {
            if (!isKnown(code) || code === state.lang) return Promise.resolve(state.lang);

            return loadDicts(code).then(function () {
                state.lang = code;
                try {
                    global.localStorage.setItem(STORAGE_KEY, code);
                } catch (e) { /* jen pohodlí, ne nutnost */ }

                // Pokud jazyk přišel v URL, přepíšeme ho — jinak by ho reload vrátil zpátky.
                try {
                    var url = new URL(global.location.href);
                    if (url.searchParams.has('lang')) {
                        url.searchParams.set('lang', code);
                        global.history.replaceState(null, '', url.pathname + url.search);
                    }
                } catch (e) { /* history API nedostupné */ }

                TSI18n.applyDocument();
                state.listeners.forEach(function (fn) {
                    try { fn(code); } catch (e) { console.error('i18n listener failed', e); }
                });
                return code;
            });
        },

        onChange: function (fn) {
            state.listeners.push(fn);
        },

        /** Text ze společného slovníku; v češtině (bez slovníku) vrací fallback. */
        t: function (key, fallback) {
            var value = dicts().common[key];
            return (value === undefined || value === '') ? (fallback !== undefined ? fallback : key) : value;
        },

        /** Klíč uzlu do překladového slovníku formuláře. */
        nodeKey: function (node, path) {
            return node.id || path;
        },

        /**
         * Přeložená vlastnost uzlu formuláře (description / placeholder / label / content).
         * Bez překladu vrací původní českou hodnotu.
         */
        node: function (key, prop, fallback) {
            var entry = (dicts().form.nodes || {})[key];
            if (!entry) return fallback;
            var value = entry[prop];
            return (value === undefined || value === '') ? fallback : value;
        },

        /**
         * Popisek položky číselníku. Státy (ISO 3166-1 alpha-2) překládá
         * Intl.DisplayNames, takže se 249 zemí nemusí udržovat ručně.
         */
        enumLabel: function (ciselnik, value, fallback) {
            var override = (dicts().enums[ciselnik] || {})[value];
            if (override) return override;

            if (state.lang !== DEFAULT_LANG && ciselnik === 'state' && /^[A-Za-z]{2}$/.test(value || '')) {
                try {
                    var name = new Intl.DisplayNames([state.lang], { type: 'region' }).of(value.toUpperCase());
                    if (name && name.toUpperCase() !== value.toUpperCase()) return name;
                } catch (e) { /* neplatný kód regionu — zůstane český název */ }
            }

            return fallback;
        },

        /** Přeloží celý číselník (pole {value,label}) pro použití v comboboxu. */
        enumOptions: function (ciselnik, options) {
            if (!Array.isArray(options)) return [];
            if (TSI18n.isDefault) return options;

            return options.map(function (opt) {
                return { value: opt.value, label: TSI18n.enumLabel(ciselnik, opt.value, opt.label) };
            });
        },

        /**
         * Přeloží statické HTML: [data-i18n] nastaví text,
         * [data-i18n-attr="attr:key,attr2:key2"] nastaví atributy.
         */
        applyDocument: function (root) {
            var scope = root || global.document;

            scope.querySelectorAll('[data-i18n]').forEach(function (el) {
                el.textContent = TSI18n.t(el.getAttribute('data-i18n'), el.textContent);
            });

            scope.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
                el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
                    var bits = pair.split(':');
                    if (bits.length !== 2) return;
                    var attr = bits[0].trim();
                    el.setAttribute(attr, TSI18n.t(bits[1].trim(), el.getAttribute(attr) || ''));
                });
            });

            if (!root) {
                var titleKey = global.document.documentElement.getAttribute('data-i18n-title');
                if (titleKey) global.document.title = TSI18n.t(titleKey, global.document.title);
                global.document.documentElement.lang = state.lang;
            }
        },

        /** Vykreslí přepínač jazyků do zadaného prvku. */
        mountSwitcher: function (container) {
            if (!container) return;

            container.innerHTML = '';
            container.classList.add('lang-switcher');

            LANGUAGES.forEach(function (l) {
                var btn = global.document.createElement('button');
                btn.type = 'button';
                btn.textContent = l.short;
                btn.title = l.label;
                btn.setAttribute('data-lang', l.code);
                btn.setAttribute('aria-pressed', String(l.code === state.lang));
                btn.addEventListener('click', function () {
                    TSI18n.setLang(l.code).then(function () {
                        container.querySelectorAll('button[data-lang]').forEach(function (b) {
                            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === state.lang));
                        });
                    });
                });
                container.appendChild(btn);
            });
        }
    };

    global.TSI18n = TSI18n;
})(window);
