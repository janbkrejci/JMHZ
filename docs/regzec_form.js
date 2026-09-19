// --- Configuration ---

// Zůstal jediný formulář — osobní dotazník nového zaměstnance. Dřívější varianta
// „doplnění údajů“ sloužila zaměstnancům, kteří už byli v evidenci při startu JMHZ,
// a byla zrušena. Uzly označené `new_only` se proto zobrazují vždy; příznak v datech
// zůstává pro případ dalšího formuláře nad stejnou strukturou.
const SHOW_NEW_ONLY_FIELDS = true;

// Název ukládaného souboru je vždy český — soubor putuje do české mzdové účtárny
// bez ohledu na to, v jakém jazyce si zaměstnanec formulář vyplnil.
const EXPORT_FILE_PREFIX = 'Osobní dotazník';
const EXPORT_FALLBACK_SURNAME = 'Prijmeni';
const EXPORT_FALLBACK_NAME = 'Jmeno';

// ID položek, na která se váže vlastní logika mimo definici formuláře.
const FIELD = {
    SURNAME: '10053',
    NAME: '10054',
    BIRTH_NUMBER: '10057',
    CITIZENSHIP: '10067'
};

const app = {
    formEl: null,
    structure: null,
    enums: null,
    // fieldId -> klíč hlášky ve společném slovníku (ne hotový text, aby šel přeložit)
    errorKeys: {},
    buttonState: {
        'check-data': { hidden: false },
        'save': { hidden: true }
    }
};

function t(key, fallback) {
    return window.TSI18n ? window.TSI18n.t(key, fallback) : fallback;
}

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', async () => {

    const formEl = document.getElementById('employeeForm');
    app.formEl = formEl;

    try {
        // 1. Jazyk, struktura a číselníky
        await window.TSI18n.init({ base: './i18n', form: 'regzec' });
        window.TSI18n.mountSwitcher(document.getElementById('lang-switcher'));

        const [structureResp, enumsResp] = await Promise.all([
            fetch('regzec_form.json'),
            fetch('regzec_enums.json')
        ]);

        if (!structureResp.ok) throw new Error('Failed to load JSON structure');
        if (!enumsResp.ok) throw new Error('Failed to load Enums');

        app.structure = await structureResp.json();
        app.enums = await enumsResp.json();

        // 2. První sestavení formuláře
        applyForm();

        // 3. Tlačítka označíme akcí, aby na ně šlo cílit nezávisle na jazyce popisku.
        //    ts-form při každém re-renderu tlačítka vytváří znovu, proto observer.
        tagButtons(formEl);
        new MutationObserver(() => tagButtons(formEl)).observe(formEl, { childList: true, subtree: true });

        // 4. Události
        formEl.addEventListener('form-submit', (e) => {
            if (e.detail.action === 'check-data') {
                validateForm(e, formEl);
            } else if (e.detail.action === 'save') {
                saveForm(e, formEl);
            }
        });

        formEl.addEventListener('form-changed', () => {
            // Po jakékoli změně je předchozí kontrola neplatná: schovat Uložit, ukázat Zkontrolovat.
            updateButtonState(formEl, 'save', { hidden: true });
            updateButtonState(formEl, 'check-data', { hidden: false });

            syncConditionalRequired(formEl);
        });

        // 5. Přepnutí jazyka přepíše jen popisky. Vyplněná data zůstávají v ts-form.formData,
        //    které se při re-renderu nepřepisuje (ts-form: { ...values, ...this.formData }).
        window.TSI18n.onChange(() => applyForm());

        customElements.whenDefined('ts-form').then(() => {
            formEl.run();
        });

    } catch (err) {
        console.error(err);
        document.body.innerHTML =
            `<div class="p-8 text-red-600">${t('error.loadForm', 'Formulář se nepodařilo načíst')}: ${err.message}</div>`;
    }
});

/**
 * Sestaví (nebo znovu sestaví) konfiguraci formuláře z aktuálního jazyka
 * a předá ji komponentě. Vyplněná data ani aktivní záložka se neztratí.
 */
function applyForm() {
    const formEl = app.formEl;
    const { layout, fields, values } = buildMetadata(app.structure, app.enums);

    // Výchozí státní občanství, pokud uživatel zatím nic nevybral.
    if (!values[FIELD.CITIZENSHIP]) {
        values[FIELD.CITIZENSHIP] = 'CZ';
    }

    applyConditionalRequired(fields, currentData(formEl), values);

    const activeTab = getActiveTabIndex(formEl);
    if (activeTab !== null) {
        formEl.setAttribute('active-tab', String(activeTab));
    }

    // Texty, které si ts-form vykresluje sám (drop zóna, kalendář, dialogy),
    // řídí jeho vlastní registr. Atribut se čte i při upgradu elementu, takže
    // první vykreslení proběhne rovnou ve správném jazyce.
    formEl.setAttribute('locale', window.TSI18n.lang);

    formEl.setAttribute('fields', JSON.stringify(fields));
    formEl.setAttribute('layout', JSON.stringify(layout));
    formEl.setAttribute('buttons', JSON.stringify(buildButtons()));
    formEl.setAttribute('errors', JSON.stringify(translatedErrors()));

    if (Object.keys(values).length > 0) {
        formEl.setAttribute('values', JSON.stringify(values));
    }
}

function currentData(formEl) {
    return (formEl && formEl.formData) || {};
}

function getActiveTabIndex(formEl) {
    const activeTab = formEl.querySelector('sl-tab[active]');
    if (!activeTab) return null;

    const match = /^tab-(\d+)$/.exec(activeTab.panel || '');
    return match ? parseInt(match[1], 10) : null;
}

/** Rodné číslo je povinné jen u českého občanství (a dokud občanství není vybráno). */
function isBirthNumberRequired(data, values) {
    const citizenship = data[FIELD.CITIZENSHIP] !== undefined
        ? data[FIELD.CITIZENSHIP]
        : (values || {})[FIELD.CITIZENSHIP];

    return !citizenship || citizenship === 'CZ';
}

function applyConditionalRequired(fields, data, values) {
    if (fields[FIELD.BIRTH_NUMBER]) {
        fields[FIELD.BIRTH_NUMBER].required = isBirthNumberRequired(data, values);
    }
}

/** Přepočítá podmíněnou povinnost přímo nad atributem `fields` (bez plného rebuildu). */
function syncConditionalRequired(formEl) {
    try {
        const data = currentData(formEl);
        const required = isBirthNumberRequired(data);
        const fields = JSON.parse(formEl.getAttribute('fields') || '{}');

        if (fields[FIELD.BIRTH_NUMBER] && fields[FIELD.BIRTH_NUMBER].required !== required) {
            fields[FIELD.BIRTH_NUMBER].required = required;
            formEl.setAttribute('fields', JSON.stringify(fields));
        }
    } catch (err) {
        console.error('Error in form-changed custom logic', err);
    }
}

function buildButtons() {
    return [
        {
            action: 'import-data',
            label: t('btn.importData', 'Načíst rozpracovaná data'),
            variant: 'default',
            position: 'left'
        },
        {
            action: 'export-data',
            label: t('btn.exportData', 'Uložit rozpracovaná data'),
            variant: 'default',
            position: 'left',
            confirmation: {
                title: t('confirm.export.title', 'Upozornění'),
                text: t('confirm.export.text', ''),
                buttons: [
                    { action: 'cancel', label: t('confirm.export.cancel', 'Zrušit'), variant: 'neutral' },
                    { action: 'confirm', label: t('confirm.export.ok', ''), variant: 'warning', confirm: true }
                ]
            }
        },
        {
            action: 'check-data',
            label: t('btn.checkData', 'Zkontrolovat data před odevzdáním'),
            variant: 'primary',
            position: 'right',
            hidden: app.buttonState['check-data'].hidden
        },
        {
            action: 'save',
            label: t('btn.save', 'Uložit dotazník k odevzdání'),
            variant: 'success',
            position: 'right',
            hidden: app.buttonState['save'].hidden
        }
    ];
}

function tagButtons(formEl) {
    const buttons = formEl.buttons || {};
    Object.keys(buttons).forEach(action => {
        if (buttons[action] && buttons[action].dataset.action !== action) {
            buttons[action].dataset.action = action;
        }
    });
}

function translatedErrors() {
    const errors = {};
    Object.keys(app.errorKeys).forEach(fieldId => {
        errors[fieldId] = t(app.errorKeys[fieldId], 'Toto pole je povinné');
    });
    return errors;
}

// --- Action Functions ---

function validateForm(event, formEl) {
    const formData = event.detail.formData || currentData(formEl);
    const fieldsConfig = JSON.parse(formEl.getAttribute('fields') || '{}');

    app.errorKeys = {};

    // 1. Povinná pole
    Object.keys(fieldsConfig).forEach(fieldId => {
        if (!fieldsConfig[fieldId].required) return;

        const value = formData[fieldId];
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            app.errorKeys[fieldId] = 'validation.required';
        }
    });

    // 2. Podmíněná pravidla
    validateConditionalRules(formData, app.errorKeys);

    const hasErrors = Object.keys(app.errorKeys).length > 0;
    formEl.setAttribute('errors', JSON.stringify(translatedErrors()));

    updateButtonState(formEl, 'check-data', { hidden: !hasErrors });
    updateButtonState(formEl, 'save', { hidden: hasErrors });
}

function validateConditionalRules(formData, errorKeys) {
    // Místo pro další podmíněná pravidla. Do errorKeys patří klíč hlášky
    // ze společného slovníku (docs/i18n/common.*.json), ne hotový text.
    return errorKeys;
}

async function saveForm(event, formEl) {
    const formData = event.detail.formData;

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const processData = async (obj) => {
        if (Array.isArray(obj)) {
            return Promise.all(obj.map(item => processData(item)));
        } else if (obj instanceof File) {
            const base64 = await fileToBase64(obj);
            return {
                name: obj.name,
                type: obj.type,
                size: obj.size,
                lastModified: obj.lastModified,
                data: base64,
                _is_file: true
            };
        } else if (obj && typeof obj === 'object') {
            const newObj = {};
            for (const key of Object.keys(obj)) {
                newObj[key] = await processData(obj[key]);
            }
            return newObj;
        }
        return obj;
    };

    try {
        const exportData = await processData(formData);

        // yyyy-mm-dd Osobní dotazník Příjmení Jméno.json
        const dateStr = new Date().toISOString().slice(0, 10);
        const surname = formData[FIELD.SURNAME] || EXPORT_FALLBACK_SURNAME;
        const name = formData[FIELD.NAME] || EXPORT_FALLBACK_NAME;
        const filename = `${dateStr} ${EXPORT_FILE_PREFIX} ${surname} ${name}.json`;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error('Save failed', e);
        alert(`${t('error.save', 'Uložení selhalo')}: ${e.message}`);
    }
}

function updateButtonState(formEl, actionName, updates) {
    try {
        if (app.buttonState[actionName]) {
            Object.assign(app.buttonState[actionName], updates);
        }

        const currentButtons = JSON.parse(formEl.getAttribute('buttons') || '[]');
        let changed = false;

        const newButtons = currentButtons.map(btn => {
            if (btn.action !== actionName) return btn;

            const needsUpdate = Object.keys(updates).some(key => btn[key] !== updates[key]);
            if (!needsUpdate) return btn;

            changed = true;
            return { ...btn, ...updates };
        });

        if (changed) {
            formEl.setAttribute('buttons', JSON.stringify(newButtons));
        }
    } catch (e) {
        console.error('Failed to update button state', e);
    }
}


// --- Builder Functions ---

function buildMetadata(structure, enums) {
    const root = structure.find(n => n.key === 'employee');
    if (!root) throw new Error("Root 'employee' node not found");

    const fields = {};
    const initialValues = {};
    const tabs = [];

    if (root.children) {
        root.children.forEach(child => {
            if (shouldSkip(child)) return;

            const tab = buildTab(child, root.key, fields, enums, initialValues);
            if (tab) tabs.push(tab);
        });
    }

    return {
        layout: { tabs },
        fields: fields,
        values: initialValues
    };
}

/** Klíč uzlu do překladového slovníku: `id`, jinak tečková cesta z `key`. */
function nodePath(parentPath, node) {
    return parentPath ? `${parentPath}.${node.key}` : node.key;
}

function translate(node, path, prop, fallback) {
    if (!window.TSI18n) return fallback;
    return window.TSI18n.node(window.TSI18n.nodeKey(node, path), prop, fallback);
}

function shouldSkip(node) {
    if (node.skip) return true;
    if (!SHOW_NEW_ONLY_FIELDS && node.new_only) return true;
    return false;
}

function buildTab(node, parentPath, fieldsAccumulator, enums, valuesAccumulator) {
    const path = nodePath(parentPath, node);
    const flatItems = flattenNode(node, path, fieldsAccumulator, enums, valuesAccumulator);

    if (flatItems.length === 0) return null;

    return {
        label: translate(node, path, 'description', node.description || node.key),
        rows: packRows(flatItems)
    };
}

function flattenNode(node, path, fieldsAccumulator, enums, valuesAccumulator) {
    let items = [];

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            if (shouldSkip(child)) return;

            const childPath = nodePath(path, child);

            if (child.children && child.children.length > 0) {
                // Skupina: nadpis jako oddělovač, pak rekurze do potomků
                if (child.description) {
                    items.push({
                        type: 'separator',
                        label: translate(child, childPath, 'description', child.description),
                        width: 12
                    });
                }
                items = items.concat(flattenNode(child, childPath, fieldsAccumulator, enums, valuesAccumulator));
            } else {
                items.push(createFieldItem(child, childPath, fieldsAccumulator, enums, valuesAccumulator));
            }
        });
    }

    return items;
}

function createFieldItem(node, path, fieldsAccumulator, enums, valuesAccumulator) {
    // Klíč pole ve formulářových datech: ID položky datové věty, jinak cesta.
    const fieldName = node.id || node.original_path || node.key;

    const config = {
        type: node.widget || 'input',
        label: translate(node, path, 'description', node.description || node.key)
    };

    if (node.widget === 'selection') {
        config.type = 'combobox';
        config.allowCustom = false;
        config.allowEmpty = true;
        config.placeholder = t('field.selectPlaceholder', 'Vyberte...');

        if (node.ciselnik && enums[node.ciselnik]) {
            config.options = window.TSI18n
                ? window.TSI18n.enumOptions(node.ciselnik, enums[node.ciselnik])
                : enums[node.ciselnik];
        } else {
            config.options = [];
            console.warn(`Enum not found for ${fieldName} (ciselnik: ${node.ciselnik})`);
        }
    }

    if (node.widget === 'markdown') {
        config.type = 'markdown';
        if (node.content) {
            config.content = translate(node, path, 'content', node.content);
        }
        config.width = '12';
    }

    if (node.widget === 'separator') {
        // Oddělovač se nestává polem, vrací se rovnou do layoutu.
        return {
            type: 'separator',
            label: translate(node, path, 'description', node.description || node.label),
            width: 12
        };
    }

    if (node.widget === 'file') {
        config.type = 'file';
        if (node.multiple) {
            config.multiple = true;
        }
        if (node.label) {
            config.innerLabel = translate(node, path, 'label', node.label);
        }
    }

    if (node.widget === 'textarea') {
        config.type = 'textarea';
        if (node.rows) {
            config.rows = node.rows;
        }
    }

    if (node.mandatory === 'P') {
        config.required = true;
    }

    if (node.default_value !== undefined && node.default_value !== null && node.default_value !== "") {
        valuesAccumulator[fieldName] = node.default_value;
    }

    if (node.placeholder) {
        config.placeholder = translate(node, path, 'placeholder', node.placeholder);
    }

    fieldsAccumulator[fieldName] = config;

    return {
        type: 'field',
        field: fieldName,
        width: parseInt(node.width || 12, 10)
    };
}

function packRows(items) {
    const rows = [];
    let currentRow = [];
    let currentWidthSum = 0;

    items.forEach(item => {
        if (currentWidthSum + item.width > 12) {
            if (currentRow.length > 0) {
                if (currentWidthSum < 12) {
                    currentRow.push({ type: 'empty', width: 12 - currentWidthSum });
                }
                rows.push(convertRowToFr(currentRow));
            }
            currentRow = [];
            currentWidthSum = 0;
        }

        currentRow.push(item);
        currentWidthSum += item.width;
    });

    if (currentRow.length > 0) {
        if (currentWidthSum < 12) {
            currentRow.push({ type: 'empty', width: 12 - currentWidthSum });
        }
        rows.push(convertRowToFr(currentRow));
    }

    return rows;
}

function convertRowToFr(rowItems) {
    return rowItems.map(item => {
        if (item.type === 'separator') {
            return { type: 'separator', label: item.label, width: '12fr' };
        }
        if (item.type === 'empty') {
            return { type: 'empty', width: `${item.width}fr` };
        }

        const { width, ...rest } = item;

        return {
            ...rest,
            width: `${width}fr`
        };
    });
}
