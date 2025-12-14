// --- Configuration ---
// dynamic mode detection based on filename
const SHOW_NEW_ONLY_FIELDS = window.location.pathname.includes('new_employee_form');

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', async () => {

    const formEl = document.getElementById('employeeForm');
    const modeBadge = document.getElementById('mode-badge');

    if (SHOW_NEW_ONLY_FIELDS && modeBadge) {
        modeBadge.textContent = "Nový zaměstnanec";
        modeBadge.className = "font-mono bg-green-100 text-green-800 px-2 py-1 rounded";
    }

    try {
        // 1. Fetch Structure and Enums
        // Note: paths are relative to the HTML file location
        const [structureResp, enumsResp] = await Promise.all([
            fetch('employee_structure_edited.json'),
            fetch('enums.json')
        ]);

        if (!structureResp.ok) throw new Error('Failed to load JSON structure');
        if (!enumsResp.ok) throw new Error('Failed to load Enums');

        const structure = await structureResp.json();
        const enums = await enumsResp.json();

        // 2. Transform Data
        const { layout, fields, values } = buildMetadata(structure, enums);

        // 3. Initialize Form
        const buttonsConfig = [
            // Old buttons moved to left
            { "action": "custom-import", "label": "Načíst data", "variant": "default", "position": "left" }, // Changed to custom-import
            { "action": "export-data", "label": "Uložit data (Export)", "variant": "neutral", "position": "left" },

            // New buttons on right
            { "action": "check-data", "label": "Zkontroluj data", "variant": "neutral", "position": "right" },
            { "action": "save", "label": "Ulož dotazník", "variant": "primary", "position": "right", "disabled": true }
        ];

        formEl.setAttribute('fields', JSON.stringify(fields));
        formEl.setAttribute('layout', JSON.stringify(layout));
        formEl.setAttribute('buttons', JSON.stringify(buttonsConfig));
        if (values && Object.keys(values).length > 0) {
            formEl.setAttribute('values', JSON.stringify(values));
        }

        // 4. Listen for events
        formEl.addEventListener('form-submit', (e) => {
            console.log('Form Submit Event:', e.detail);
            if (e.detail.action === 'check-data') {
                validateForm(e, formEl);
            } else if (e.detail.action === 'save') {
                saveForm(e, formEl);
            } else if (e.detail.action === 'custom-import') {
                importForm(formEl);
            }
        });

        formEl.addEventListener('form-changed', (e) => {
            // When form changes, disable Save and re-enable Check
            updateButtonState(formEl, 'save', { disabled: true });
            updateButtonState(formEl, 'check-data', { disabled: false });
        });

        // Wait for custom element to upgrade then run
        customElements.whenDefined('ts-form').then(() => {
            formEl.run();
        });

    } catch (err) {
        console.error(err);
        document.body.innerHTML = `<div class="p-8 text-red-600">Error loading form: ${err.message}</div>`;
    }
});

// --- Action Functions ---

function validateForm(event, formEl) {
    console.log('validateForm called', event);

    // Check if errors attribute is empty
    const errorsAttr = formEl.getAttribute('errors');
    let hasErrors = false;

    if (errorsAttr) {
        try {
            const errors = JSON.parse(errorsAttr);
            if (errors && Object.keys(errors).length > 0) {
                hasErrors = true;
            }
        } catch (e) {
            console.error("Error parsing errors attribute", e);
        }
    }

    if (!hasErrors) {
        // No errors -> Enable Save, Disable Check
        updateButtonState(formEl, 'check-data', { disabled: true });
        updateButtonState(formEl, 'save', { disabled: false });
    } else {
        console.log("Form has errors, cannot enable save.");
    }
}

async function saveForm(event, formEl) {
    const formData = event.detail.formData;
    console.log('saveForm called', formData);

    // Helpers for file processing (replicated from ts-form.js)
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

        // Construct filename: yyyy-mm-dd Osobní dotazník Příjmení Jméno.json
        const dateStr = new Date().toISOString().slice(0, 10);
        const surname = formData['10053'] || 'Prijmeni';
        const name = formData['10054'] || 'Jmeno';
        const filename = `${dateStr} Osobní dotazník ${surname} ${name}.json`;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Saved as ${filename}`);

    } catch (e) {
        console.error('Save failed', e);
        alert('Save failed: ' + e.message);
    }
}

function importForm(formEl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            try {
                const data = JSON.parse(re.target.result);

                // Directly update form data and request render
                // Accessing internal property of the custom element
                if (formEl) {
                    formEl.formData = data;
                    if (typeof formEl.requestRender === 'function') {
                        formEl.requestRender();
                    } else {
                        // Fallback if requestRender is not exposed
                        console.warn('requestRender not found, trying to re-run or set values');
                        // Just run again might works if formData is preserved? No.
                        // But ts-form exposes requestRender in the source we saw.
                        // Assuming it is callable.
                    }
                }

            } catch (err) {
                console.error('Import failed', err);
                alert('Import failed: Invalid JSON');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function updateButtonState(formEl, actionName, updates) {
    try {
        const currentButtons = JSON.parse(formEl.getAttribute('buttons') || '[]');
        let changed = false;

        const newButtons = currentButtons.map(btn => {
            if (btn.action === actionName) {
                // Check if there's actually a change to avoid unnecessary updates
                let needsUpdate = false;
                for (const key in updates) {
                    if (btn[key] !== updates[key]) {
                        needsUpdate = true;
                        break;
                    }
                }

                if (needsUpdate) {
                    changed = true;
                    return { ...btn, ...updates };
                }
            }
            return btn;
        });

        if (changed) {
            formEl.setAttribute('buttons', JSON.stringify(newButtons));
        }
    } catch (e) {
        console.error("Failed to update button state", e);
    }
}


// --- Builder Functions ---

function buildMetadata(structure, enums) {
    // Assume structure is array [ { key: 'employee', children: [...] } ]
    const root = structure.find(n => n.key === 'employee');
    if (!root) throw new Error("Root 'employee' node not found");

    const fields = {};
    const initialValues = {};
    const tabs = [];

    // Process Root Children as Tabs
    if (root.children) {
        root.children.forEach(child => {
            if (shouldSkip(child)) return;

            const tab = buildTab(child, fields, enums, initialValues);
            if (tab) tabs.push(tab);
        });
    }

    return {
        layout: { tabs },
        fields: fields,
        values: initialValues
    };
}

function shouldSkip(node) {
    if (node.skip) return true;
    // If Standard Mode (SHOW_NEW_ONLY_FIELDS = false), skip if node is 'new_only'
    if (!SHOW_NEW_ONLY_FIELDS && node.new_only) return true;
    return false;
}

function buildTab(node, fieldsAccumulator, enums, valuesAccumulator) {
    // Flatten the node's subtree into a list of Items (Fields or Separators)
    const flatItems = flattenNode(node, fieldsAccumulator, enums, valuesAccumulator); // Returns array of { type, ... }

    if (flatItems.length === 0) return null;

    // Pack Items into Rows
    const rows = packRows(flatItems);

    return {
        label: node.description || node.key,
        rows: rows
    };
}

function flattenNode(node, fieldsAccumulator, enums, valuesAccumulator) {
    let items = [];

    if (node.children && node.children.length > 0) {
        // It's a Group/Section
        node.children.forEach(child => {
            if (shouldSkip(child)) return;

            // If child is a group (has children), adds Separator + Recurse
            // If child is a leaf, adds Field

            if (child.children && child.children.length > 0) {
                // Group
                if (child.description) {
                    items.push({
                        type: 'separator',
                        label: child.description,
                        width: 12
                    });
                }
                items = items.concat(flattenNode(child, fieldsAccumulator, enums, valuesAccumulator));
            } else {
                // Leaf
                const item = createFieldItem(child, fieldsAccumulator, enums, valuesAccumulator);
                items.push(item);
            }
        });
    }

    return items;
}

function createFieldItem(node, fieldsAccumulator, enums, valuesAccumulator) {
    // Construct dotted path
    // NEW: Use ID if available, otherwise fallback to path/key
    const fieldName = node.id || node.original_path || node.key;

    // Default config
    const config = {
        type: node.widget || 'input',
        label: node.description || node.key,
    };

    // Handle Selection -> Combobox
    if (node.widget === 'selection') {
        config.type = 'combobox';
        config.allowCustom = false;
        config.placeholder = 'Vyberte...';

        if (node.ciselnik && enums[node.ciselnik]) {
            config.options = enums[node.ciselnik];
        } else {
            config.options = []; // Fallback empty
            console.warn(`Enum not found for ${fieldName} (ciselnik: ${node.ciselnik})`);
        }
    }

    // Handle Markdown
    if (node.widget === 'markdown') {
        config.type = 'markdown';
        if (node.content) {
            config.content = node.content;
        }
        // Markdown fields often span full width
        config.width = '12';
    }

    // Handle File
    if (node.widget === 'file') {
        config.type = 'file';
        if (node.multiple) {
            config.multiple = true;
        }
        if (node.label) {
            config.innerLabel = node.label;
        }
    }

    // Handle Textarea
    if (node.widget === 'textarea') {
        config.type = 'textarea';
        if (node.rows) {
            config.rows = node.rows;
        }
    }

    // Handle Mandatory
    if (node.mandatory === 'P') {
        config.required = true;
    }

    // Handle Default Value
    if (node.default_value !== undefined && node.default_value !== null && node.default_value !== "") {
        valuesAccumulator[fieldName] = node.default_value;
    }

    // Add to fields config
    fieldsAccumulator[fieldName] = config;

    return {
        type: 'field',
        field: fieldName,
        width: parseInt(node.width || 12, 10), // Ensure number
    };
}

function packRows(items) {
    const rows = [];
    let currentRow = [];
    let currentWidthSum = 0;

    items.forEach(item => {
        if (currentWidthSum + item.width > 12) {
            // Finish current row
            if (currentRow.length > 0) {
                // Pad if needed
                if (currentWidthSum < 12) {
                    const diff = 12 - currentWidthSum;
                    currentRow.push({ type: 'empty', width: diff });
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
            const diff = 12 - currentWidthSum;
            currentRow.push({ type: 'empty', width: diff });
        }
        rows.push(convertRowToFr(currentRow));
    }

    return rows;
}

function convertRowToFr(rowItems) {
    // rowItems: [{field, width}, ...]
    // Output: [{field, width: '6fr'}, ...]
    return rowItems.map(item => {
        if (item.type === 'separator') {
            return { type: 'separator', label: item.label, width: '12fr' }; // Full width
        }
        if (item.type === 'empty') {
            return { type: 'empty', width: `${item.width}fr` };
        }

        // Destructure width out of item to strictly avoid integer overwrite
        // or just spread first. Spread first is safer for unknown props.
        const { width, ...rest } = item;

        return {
            ...rest,
            width: `${width}fr`
        };
    });
}
