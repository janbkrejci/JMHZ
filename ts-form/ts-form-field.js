import './ts-file-upload.js';
import './ts-file-upload.js';
import './ts-relationship-picker.js';
import './ts-combobox.js';
import flatpickr from 'flatpickr';
import { Czech } from 'flatpickr/dist/l10n/cs.js';
import flatpickrStyles from 'flatpickr/dist/flatpickr.css?inline';
import { marked } from 'marked';

// Inject Flatpickr styles
if (!document.getElementById('ts-form-flatpickr-styles')) {
    const style = document.createElement('style');
    style.id = 'ts-form-flatpickr-styles';
    style.textContent = flatpickrStyles;
    document.head.appendChild(style);
}


export class TSFormField extends HTMLElement {
    constructor() {
        super();
    }

    static get observedAttributes() {
        return ['field-name', 'config', 'value', 'error'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.requestRender();
        }
    }

    connectedCallback() {
        this.requestRender();
    }

    requestRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => {
            this.render();
            this.renderPending = false;
        });
    }

    render() {
        this.innerHTML = '';
        const fieldName = this.getAttribute('field-name');
        const configStr = this.getAttribute('config');
        const value = this.getAttribute('value');
        const error = this.getAttribute('error');

        if (!fieldName || !configStr) return;

        let config;
        try {
            config = JSON.parse(configStr);
        } catch (e) {
            console.error('Invalid config for field', fieldName, e);
            return;
        }

        let parsedValue = value;
        try {
            if (value && (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false')) {
                parsedValue = JSON.parse(value);
            }
        } catch (e) {
            // Keep as string if parse fails
        }

        const field = this.createField(fieldName, config, parsedValue);
        this.appendChild(field);

        // Enforce spacing for prefix/suffix slots to handle global resets (like * { padding: 0 })
        // This ensures consistent look in FORMTEST and Storybook
        // Inject shared styles for spacing fixes if not already present
        if (!document.getElementById('ts-form-field-styles')) {
            const style = document.createElement('style');
            style.id = 'ts-form-field-styles';
            style.textContent = `
                .force-prefix-spacing::part(prefix) {
                    padding-inline-start: var(--sl-input-spacing-medium, 0.75rem);
                    color: var(--sl-input-icon-color, currentColor);
                }
                .force-suffix-spacing::part(suffix) {
                    padding-inline-end: var(--sl-input-spacing-medium, 0.75rem);
                    color: var(--sl-input-icon-color, currentColor);
                }
                sl-icon[slot="prefix"] {
                    margin: 0 !important;
                }
            `;
            this.appendChild(style);
        }

        // Inject Markdown styles
        if (!document.getElementById('ts-form-markdown-styles')) {
            const style = document.createElement('style');
            style.id = 'ts-form-markdown-styles';
            style.textContent = `
                .markdown-content {
                    font-family: var(--sl-font-sans);
                    font-size: var(--sl-font-size-medium);
                    line-height: var(--sl-line-height-normal);
                    color: var(--sl-color-neutral-900);
                }
                .markdown-content h1, .markdown-content h2, .markdown-content h3, 
                .markdown-content h4, .markdown-content h5, .markdown-content h6 {
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                    font-weight: var(--sl-font-weight-bold);
                    line-height: var(--sl-line-height-dense);
                    color: var(--sl-color-neutral-1000);
                }
                .markdown-content h1 { font-size: var(--sl-font-size-2x-large); }
                .markdown-content h2 { font-size: var(--sl-font-size-x-large); }
                .markdown-content h3 { font-size: var(--sl-font-size-large); }
                .markdown-content p {
                    margin-bottom: 1em;
                }
                .markdown-content ul, .markdown-content ol {
                    margin-bottom: 1em;
                    padding-left: 1.5em;
                }
                .markdown-content li {
                    margin-bottom: 0.25em;
                }
                .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1em;
                }
                .markdown-content th, .markdown-content td {
                    padding: var(--sl-spacing-small);
                    border: 1px solid var(--sl-color-neutral-300);
                    text-align: left;
                }
                .markdown-content th {
                    background-color: var(--sl-color-neutral-100);
                    font-weight: var(--sl-font-weight-semibold);
                }
                .markdown-content code {
                    font-family: var(--sl-font-mono);
                    background-color: var(--sl-color-neutral-100);
                    padding: 0.2em 0.4em;
                    border-radius: var(--sl-border-radius-small);
                    font-size: 0.9em;
                }
                .markdown-content pre {
                    background-color: var(--sl-color-neutral-100);
                    padding: var(--sl-spacing-medium);
                    border-radius: var(--sl-border-radius-medium);
                    overflow-x: auto;
                    margin-bottom: 1em;
                }
                .markdown-content pre code {
                    padding: 0;
                    background-color: transparent;
                }
                .markdown-content blockquote {
                    margin: 1em 0;
                    padding-left: 1em;
                    border-left: 4px solid var(--sl-color-primary-500);
                    color: var(--sl-color-neutral-600);
                }
                .markdown-content a {
                    color: var(--sl-color-primary-600);
                    text-decoration: none;
                }
                .markdown-content a:hover {
                    text-decoration: underline;
                }
                .markdown-content > *:first-child {
                    margin-top: -0.25em !important;
                }
            `;
            // Append to head to apply globally (since no Shadow DOM) so it's only added once per page load
            // But wait, existing code appends to `this`. If multiple fields are present, `this` is local.
            // If we append to `this` (the element), styles are scoped only if Shadow DOM is used? 
            // NO, <style> inside a light DOM element applies globally but is just located there.
            // To ensure it applies to all instances and persists, appending to document.head is safer if we check ID.
            // The existing code appends to `this` (line 95). If I append to `this`, it will be added for every field instance if I don't check carefully, 
            // but the check `!document.getElementById` suggests global intent.
            // However, `getElementById` checks the whole document. If I append to `this`, it is in the document.
            // So appending to `this` is fine IF the ID check works.
            // BUT, if I append to `this`, and `this` is removed, the style might be removed if it's a child? 
            // Usually global styles are better in HEAD.
            // I will append to `this` to follow the pattern of the existing file_upload styles (if any) or the snippet I saw.
            // Actually the snippet showed: `this.appendChild(style);`. I will follow that pattern.
            this.appendChild(style);
        }

        // Special handling for select to ensure value is picked up after connection
        if (config.type === 'select') {
            Promise.all([
                customElements.whenDefined('sl-select'),
                customElements.whenDefined('sl-option')
            ]).then(() => {
                // Wait for next frame to ensure options are slotted and upgraded
                requestAnimationFrame(() => {
                    if (config.multiple && Array.isArray(parsedValue)) {
                        field.value = parsedValue;
                    } else {
                        field.value = parsedValue || '';
                    }
                });
            });
        }

        if (error) {
            field.classList.add('input-invalid');

            // For file upload, we pass the error to the component to render it internally
            // This allows the error to be displayed between the drop zone and the file list
            if (config.type === 'file' || config.type === 'image') {
                field.setAttribute('error', error);
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = error;
                this.appendChild(errorDiv);
            }
        } else {
            // Clear error if it was previously set (for file upload)
            if (config.type === 'file' || config.type === 'image') {
                field.removeAttribute('error');
            }
            field.classList.remove('input-invalid');
        }

        // Autofocus handling
        if (config.autofocus) {
            // Use requestAnimationFrame to ensure element is in DOM and upgraded
            requestAnimationFrame(() => {
                // Determine target element similarly to setFocus
                this.setFocus();
            });
        }
        if (field) {
            // Attach generic key handler for navigation
            field.addEventListener('keydown', (e) => this.handleKeyDown(e, config, fieldName));
        }
    }

    setFocus() {
        let target = this.firstElementChild;
        // Handle wrappers (e.g. checkbox, switch, radio are wrapped in div)
        if (target && target.tagName === 'DIV') {
            const input = target.querySelector('sl-input, sl-checkbox, sl-switch, sl-range, sl-radio-group, sl-select, textarea, input, ts-combobox, ts-relationship-picker, sl-button, sl-button-group');
            if (input) target = input;
        }

        if (target) {
            if (typeof target.setFocus === 'function') {
                target.setFocus();
            } else if (typeof target.focus === 'function') {
                target.focus();
            }
        }
    }

    handleKeyDown(e, config, fieldName) {
        // Enter Key
        if (e.key === 'Enter') {
            if (config.enterAction) {
                // Prevent default behavior (e.g. textarea newline, or standard form submit if inside generic form)
                // Exception: if it's a textarea and we want newline, we shouldn't set enterAction.
                // If enterAction IS set, we assume user wants the action instead of newline.
                e.preventDefault();
                e.stopPropagation(); // Stop bubbling to prevent double handling

                // Force update value before action
                // The native 'change' might not have fired yet because we prevented default
                this.handleFieldChange(e, fieldName);

                this.dispatchEvent(new CustomEvent('form-key-action', {
                    detail: {
                        key: 'Enter',
                        action: config.enterAction,
                        field: fieldName
                    },
                    bubbles: true,
                    composed: true
                }));
            }
        }
        // Escape Key
        else if (e.key === 'Escape') {
            if (config.escapeAction) {
                e.preventDefault();
                e.stopPropagation();

                if (config.escapeAction === 'clear') {
                    // Handle clearing locally
                    // We need to set value on the specific component
                    const field = e.target; // The component that triggered keydown
                    if ('value' in field) {
                        if (config.type === 'select' && field.multiple) {
                            field.value = [];
                        } else {
                            field.value = '';
                        }
                        // Dispatch change
                        this.handleFieldChange({ target: field }, fieldName);
                    }
                } else {
                    // Dispatch global action
                    this.dispatchEvent(new CustomEvent('form-key-action', {
                        detail: {
                            key: 'Escape',
                            action: config.escapeAction,
                            field: fieldName
                        },
                        bubbles: true,
                        composed: true
                    }));
                }
            }
        }
    }

    createField(fieldName, config, value) {
        let field;
        switch (config.type) {
            case 'textarea':
                field = document.createElement('sl-textarea');
                field.value = value || '';
                if (config.rows) {
                    field.rows = config.rows;
                }
                if (config.placeholder) {
                    field.placeholder = config.placeholder;
                }
                break;
            case 'password':
                field = document.createElement('sl-input');
                field.type = 'password';
                field.passwordToggle = true;
                field.setAttribute('autocomplete', 'current-password');
                field.value = value || '';
                if (config.placeholder) {
                    field.placeholder = config.placeholder;
                }
                break;
            case 'checkbox':
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.style.display = 'flex';
                checkboxWrapper.style.flexDirection = 'column';

                // Add spacer to align with other inputs that have labels
                const spacer = document.createElement('div');
                spacer.style.height = 'calc(var(--sl-input-label-font-size-medium) + var(--sl-spacing-2x-small))';
                spacer.style.marginBottom = 'var(--sl-spacing-2x-small)';
                checkboxWrapper.appendChild(spacer);

                field = document.createElement('sl-checkbox');
                if (!config.hideLabel) {
                    field.textContent = config.label;
                }
                field.checked = value === true;
                field.addEventListener('sl-change', (e) => this.handleFieldChange(e, fieldName));
                checkboxWrapper.appendChild(field);
                return checkboxWrapper;
            case 'switch':
                const switchWrapper = document.createElement('div');
                switchWrapper.style.display = 'flex';
                switchWrapper.style.flexDirection = 'column';
                switchWrapper.style.gap = 'var(--sl-spacing-2x-small)';

                if (!config.hideLabel) {
                    const switchLabel = document.createElement('label');
                    switchLabel.textContent = config.label;
                    switchLabel.style.fontSize = 'var(--sl-input-label-font-size-medium)';
                    switchLabel.style.fontWeight = 'var(--sl-font-weight-semibold)';
                    // switchLabel.style.color = 'var(--sl-input-label-color)'; // Removed to allow error color override
                    switchWrapper.appendChild(switchLabel);
                }

                const switchContainer = document.createElement('div');
                switchContainer.style.display = 'flex';
                switchContainer.style.alignItems = 'center';
                switchContainer.style.minHeight = 'var(--sl-input-height-medium)';
                switchContainer.style.paddingLeft = '2px'; // Prevent clipping of focus ring/switch

                field = document.createElement('sl-switch');
                field.checked = value === true;
                field.addEventListener('sl-change', (e) => this.handleFieldChange(e, fieldName));

                switchContainer.appendChild(field);
                switchWrapper.appendChild(switchContainer);
                return switchWrapper;

            case 'slider':
                const sliderWrapper = document.createElement('div');
                sliderWrapper.style.display = 'flex';
                sliderWrapper.style.flexDirection = 'column';

                if (!config.hideLabel) {
                    const sliderLabel = document.createElement('label');
                    sliderLabel.textContent = config.label;
                    sliderLabel.style.fontSize = 'var(--sl-input-label-font-size-medium)';
                    sliderLabel.style.fontWeight = 'var(--sl-font-weight-semibold)';
                    // sliderLabel.style.color = 'var(--sl-input-label-color)'; // Removed to allow error color override
                    sliderLabel.style.marginBottom = 'var(--sl-spacing-2x-small)';
                    sliderWrapper.appendChild(sliderLabel);
                }

                field = document.createElement('sl-range');
                if (config.min) field.min = config.min;
                if (config.max) field.max = config.max;
                if (config.step) field.step = config.step;
                field.value = value || config.min || 0;
                field.addEventListener('sl-change', (e) => this.handleFieldChange(e, fieldName));

                sliderWrapper.appendChild(field);
                return sliderWrapper;
            case 'combobox':
                field = document.createElement('ts-combobox');
                field.setAttribute('label', config.label || '');
                field.setAttribute('value', value || '');
                if (config.options) {
                    field.setAttribute('options', JSON.stringify(config.options));
                }
                if (config.placeholder) {
                    field.setAttribute('placeholder', config.placeholder);
                }
                if (config.disabled) {
                    field.setAttribute('disabled', '');
                }
                if (config.allowCustom) {
                    field.setAttribute('allow-custom', '');
                }
                if (config.allowEmpty) {
                    field.setAttribute('allow-empty', '');
                }
                if (config.required) {
                    field.setAttribute('required', '');
                }
                break;
            case 'file':
            case 'image':
                field = document.createElement('ts-file-upload');
                if (!config.hideLabel) {
                    field.setAttribute('label', config.label || 'Upload file');
                }
                if (config.multiple) {
                    field.setAttribute('multiple', 'true');
                }
                if (config.type === 'image') {
                    field.setAttribute('accept', 'image/*');
                } else if (config.accept) {
                    field.setAttribute('accept', config.accept);
                }
                if (config.innerLabel) {
                    field.setAttribute('inner-label', config.innerLabel);
                }
                if (value) {
                    // value is passed as property, not attribute, for complex objects
                    setTimeout(() => {
                        field.value = value;
                    }, 0);
                }
                break;
            case 'button':
                field = document.createElement('sl-button');
                field.variant = config.variant || 'primary';
                field.textContent = config.label || 'Button';
                field.addEventListener('click', () => {
                    this.dispatchEvent(new CustomEvent('form-field-action', {
                        detail: {
                            field: fieldName,
                            action: config.action || 'click'
                        },
                        bubbles: true,
                        composed: true
                    }));
                });
                return field;
            case 'button-group':
                let slButtonGroup;

                if (config.variant === 'process') {
                    slButtonGroup = document.createElement('div');
                    slButtonGroup.className = 'process-group';
                    slButtonGroup.style.display = 'flex';
                    slButtonGroup.style.gap = '0'; // Process group handles gap internally
                } else {
                    slButtonGroup = document.createElement('sl-button-group');
                    slButtonGroup.style.gap = '0.5rem'; // Default gap for standard button groups
                }

                if (config.options) {
                    config.options.forEach(btnStr => {
                        const [val, enabled = 'true', variant = 'default', label = ''] = btnStr.split('/');
                        const b = document.createElement('sl-button');
                        b.dataset.value = val;
                        const btnVariant = (value === val) ? (variant || 'primary') : (variant || 'default');
                        b.variant = btnVariant;
                        b.setAttribute('data-variant', btnVariant); // For CSS styling in process group
                        b.textContent = label || val;
                        b.disabled = enabled === 'false';
                        b.addEventListener('click', () => {
                            this.dispatchEvent(new CustomEvent('field-change', {
                                detail: {
                                    field: fieldName,
                                    value: val
                                },
                                bubbles: true,
                                composed: true
                            }));
                        });
                        slButtonGroup.appendChild(b);
                    });
                }
                return slButtonGroup;
            case 'radio':
                const radioWrapper = document.createElement('div');
                radioWrapper.style.display = 'flex';
                radioWrapper.style.flexDirection = 'column';
                radioWrapper.style.gap = 'var(--sl-spacing-2x-small)';

                if (!config.hideLabel) {
                    const radioLabel = document.createElement('label');
                    radioLabel.textContent = config.label;
                    radioLabel.style.fontSize = 'var(--sl-input-label-font-size-medium)';
                    radioLabel.style.fontWeight = 'var(--sl-font-weight-semibold)';
                    // radioLabel.style.color = 'var(--sl-input-label-color)'; // Removed to allow error color override
                    // radioLabel.style.marginBottom = 'var(--sl-spacing-small)'; // Removed extra spacing, handled by wrapper gap
                    radioWrapper.appendChild(radioLabel);
                }

                field = document.createElement('sl-radio-group');
                // field.label = config.label; // We use custom label for better control

                if (config.options) {
                    config.options.forEach(opt => {
                        const radio = document.createElement('sl-radio');
                        radio.value = opt.value;
                        radio.textContent = opt.label;
                        radio.style.marginBottom = 'var(--sl-spacing-2x-small)'; // Spacing between radios
                        field.appendChild(radio);
                    });
                }
                setTimeout(() => {
                    field.value = value || '';
                }, 0);

                field.addEventListener('sl-change', (e) => this.handleFieldChange(e, fieldName));

                radioWrapper.appendChild(field);
                return radioWrapper;
            case 'number':
                field = document.createElement('sl-input');
                field.type = 'text';
                field.inputMode = 'decimal';
                field.classList.add('text-right');
                field.classList.add('text-right');
                field.setAttribute('autocomplete', 'off');
                if (config.placeholder) {
                    field.placeholder = config.placeholder;
                }

                // Input restriction: only numbers, minus, dot, comma, math operators
                field.addEventListener('sl-input', () => {
                    const val = field.value;
                    const clean = val.replace(/[^0-9.,+\-*/^() ]/g, '');
                    if (val !== clean) {
                        field.value = clean;
                    }
                });

                // Format initial value
                if (value) {
                    field.value = this.formatNumber(value, config.roundTo);
                }

                field.addEventListener('sl-focus', () => {
                    field.value = field.value.replace(/\s/g, '');
                    setTimeout(() => field.select(), 0);
                });

                field.addEventListener('sl-blur', () => {
                    // Evaluate math expression if present
                    let val = field.value;
                    if (/[+\-*/^()]/.test(val)) {
                        const evaluated = this.evaluateMathExpression(val);
                        if (evaluated === null) {
                            field.value = ''; // Clear if invalid
                            return;
                        }
                        val = evaluated;
                    }
                    field.value = this.formatNumber(val, config.roundTo);
                });

                // Handle Enter key to trigger formatting/evaluation
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        // Trigger blur logic
                        field.dispatchEvent(new Event('sl-blur'));
                        // Also dispatch change if needed, but sl-input usually does this on Enter
                    }
                });

                // Define submitValue getter for normalized number
                Object.defineProperty(field, 'submitValue', {
                    get: () => {
                        if (!field.value) return null;

                        // Try to evaluate as math expression first
                        let val = field.value;
                        if (/[+\-*/^()]/.test(val)) {
                            const evaluated = this.evaluateMathExpression(val);
                            if (evaluated !== null) {
                                val = evaluated;
                            }
                        }

                        const raw = val.toString().replace(/\s/g, '').replace(',', '.');
                        if (raw === '') return null;
                        let num = parseFloat(raw);
                        if (isNaN(num)) return null;

                        // Apply rounding if configured
                        if (config.roundTo !== undefined && config.roundTo !== null && config.roundTo !== '') {
                            num = this.roundNumber(num, config.roundTo);
                        }
                        return num;
                    }
                });
                break;



            case 'date':
                field = document.createElement('sl-input');
                field.type = 'text'; // Use text for flatpickr
                field.classList.add('text-right');
                field.classList.add('force-prefix-spacing');
                field.setAttribute('autocomplete', 'off');

                // Add calendar icon
                const dateIcon = document.createElement('sl-icon');
                dateIcon.name = 'calendar3';
                dateIcon.slot = 'prefix';
                dateIcon.style.cursor = 'pointer';
                dateIcon.style.fontSize = 'var(--sl-font-size-large)';
                field.appendChild(dateIcon);

                // Display formatted date initially if value is ISO
                field.value = value ? this.formatDate(value) : '';

                // Store ISO value for submission
                field.isoValue = value || null;

                field.addEventListener('sl-focus', () => {
                    setTimeout(() => field.select(), 0);
                });

                // Initialize flatpickr
                setTimeout(() => {
                    const inputElement = field.shadowRoot ? field.shadowRoot.querySelector('input') : field;
                    if (inputElement) {
                        const fp = flatpickr(inputElement, {
                            locale: Czech,
                            defaultDate: value,
                            dateFormat: 'd. m. Y',
                            allowInput: true,
                            clickOpens: false, // Disable auto-open on click/focus
                            onChange: (selectedDates, dateStr) => {
                                // Update display value
                                field.value = dateStr;
                                // Update ISO value for submission
                                if (selectedDates.length > 0) {
                                    // Use local time to avoid timezone shifts when converting to ISO string for date-only
                                    // Actually, for date-only, we want YYYY-MM-DD.
                                    const d = selectedDates[0];
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    field.isoValue = `${year}-${month}-${day}`;
                                } else {
                                    field.isoValue = null;
                                }
                                field.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));
                            },
                            parseDate: (dateStr, format) => {
                                if (!dateStr) return null;

                                // Standard ISO handling
                                if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                                    return new Date(dateStr);
                                }

                                // Try smart parsing for ddmmyyyy
                                const clean = dateStr.replace(/[^0-9]/g, '');
                                if (clean.length === 8) {
                                    const d = clean.substring(0, 2);
                                    const m = clean.substring(2, 4);
                                    const y = clean.substring(4, 8);
                                    return new Date(`${y}-${m}-${d}`);
                                }
                                // Try smart parsing for ddmm (current year)
                                if (clean.length === 4) {
                                    const d = clean.substring(0, 2);
                                    const m = clean.substring(2, 4);
                                    const currentYear = new Date().getFullYear();
                                    return new Date(`${currentYear}-${m}-${d}`);
                                }

                                // Try parsing d.m.yyyy or similar with separators
                                const parts = dateStr.match(/^(\d{1,2})[.\s/-]+(\d{1,2})[.\s/-]+(\d{4})$/);
                                if (parts) {
                                    return new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
                                }

                                // Try parsing d.m or d.m. (without year) -> use current year
                                const shortParts = dateStr.match(/^(\d{1,2})[.\s/-]+(\d{1,2})[.\s/-]*$/);
                                if (shortParts) {
                                    const currentYear = new Date().getFullYear();
                                    return new Date(`${currentYear}-${shortParts[2]}-${shortParts[1]}`);
                                }

                                return flatpickr.parseDate(dateStr, format);
                            }
                        });

                        // Open calendar on icon click
                        dateIcon.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fp.open();
                        });

                        // Handle Enter key to trigger parsing
                        field.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                // Force flatpickr to parse the current value
                                // We can do this by setting the date to the current input value
                                fp.setDate(field.value, true, fp.config.dateFormat);
                                // Focus should stay in field
                            }
                        });
                    }
                }, 0);

                // Define submitValue getter
                Object.defineProperty(field, 'submitValue', {
                    get: () => field.isoValue
                });
                break;

            case 'datetime':
                field = document.createElement('sl-input');
                field.type = 'text'; // Use text for flatpickr
                field.classList.add('text-right');
                field.classList.add('force-prefix-spacing');
                field.setAttribute('autocomplete', 'off');

                // Add calendar icon
                const datetimeIcon = document.createElement('sl-icon');
                datetimeIcon.name = 'calendar3';
                datetimeIcon.slot = 'prefix';
                datetimeIcon.style.cursor = 'pointer';
                datetimeIcon.style.fontSize = 'var(--sl-font-size-large)';
                field.appendChild(datetimeIcon);

                field.value = value ? this.formatDateTime(value) : '';

                // Store ISO value for submission
                field.isoValue = value || null;

                field.addEventListener('sl-focus', () => {
                    setTimeout(() => field.select(), 0);
                });

                // Initialize flatpickr
                setTimeout(() => {
                    const inputElement = field.shadowRoot ? field.shadowRoot.querySelector('input') : field;
                    if (inputElement) {
                        const fp = flatpickr(inputElement, {
                            locale: Czech,
                            defaultDate: value,
                            enableTime: true,
                            dateFormat: 'd. m. Y H:i',
                            time_24hr: true,
                            allowInput: true,
                            clickOpens: false, // Disable auto-open on click/focus
                            onChange: (selectedDates, dateStr) => {
                                field.value = dateStr;
                                if (selectedDates.length > 0) {
                                    // For datetime, we can use toISOString() but it converts to UTC.
                                    // Usually forms expect local time ISO or UTC.
                                    // Let's stick to local time ISO-like format YYYY-MM-DDTHH:mm:ss
                                    const d = selectedDates[0];
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const hours = String(d.getHours()).padStart(2, '0');
                                    const minutes = String(d.getMinutes()).padStart(2, '0');
                                    const seconds = String(d.getSeconds()).padStart(2, '0');
                                    field.isoValue = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
                                } else {
                                    field.isoValue = null;
                                }
                                field.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));
                            },
                            parseDate: (dateStr, format) => {
                                // Try smart parsing for ddmmyyyyhhmm
                                const clean = dateStr.replace(/[^0-9]/g, '');
                                if (clean.length >= 8) {
                                    const d = clean.substring(0, 2);
                                    const m = clean.substring(2, 4);
                                    const y = clean.substring(4, 8);
                                    let h = '00';
                                    let min = '00';
                                    if (clean.length >= 10) h = clean.substring(8, 10);
                                    if (clean.length >= 12) min = clean.substring(10, 12);
                                    return new Date(`${y}-${m}-${d}T${h}:${min}:00`);
                                }

                                // Try parsing d.m.yyyy H:i or similar
                                const parts = dateStr.match(/^(\d{1,2})[.\s/-]+(\d{1,2})[.\s/-]+(\d{4})(?:\s+(\d{1,2})[:.](\d{1,2}))?$/);
                                if (parts) {
                                    const d = parts[1];
                                    const m = parts[2];
                                    const y = parts[3];
                                    const h = parts[4] || '00';
                                    const min = parts[5] || '00';
                                    return new Date(`${y}-${m}-${d}T${h}:${min}:00`);
                                }

                                // Try parsing d.m or d.m. (without year) -> use current year
                                const shortParts = dateStr.match(/^(\d{1,2})[.\s/-]+(\d{1,2})[.\s/-]*$/);
                                if (shortParts) {
                                    const currentYear = new Date().getFullYear();
                                    return new Date(`${currentYear}-${shortParts[2]}-${shortParts[1]}T00:00:00`);
                                }

                                return flatpickr.parseDate(dateStr, format);
                            }
                        });

                        // Open calendar on icon click
                        datetimeIcon.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            fp.open();
                        });

                        // Handle Enter key to trigger parsing
                        field.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                // Force flatpickr to parse the current value
                                fp.setDate(field.value, true, fp.config.dateFormat);
                                // Focus should stay in field
                            }
                        });
                    }
                }, 0);

                // Define submitValue getter
                Object.defineProperty(field, 'submitValue', {
                    get: () => field.isoValue
                });
                break;
            case 'select':
                field = document.createElement('sl-select');
                field.hoist = true; // Fix clipping by hoisting dropdown
                field.label = config.label;
                if (config.multiple) {
                    field.multiple = true;
                    field.clearable = true;
                }
                if (config.options) {
                    config.options.forEach(opt => {
                        const option = document.createElement('sl-option');
                        option.value = opt.value;
                        option.textContent = opt.label;
                        field.appendChild(option);
                    });
                }
                // Value setting moved to after connection to ensure options are ready
                break;
            case 'relationship':
                field = document.createElement('ts-relationship-picker');
                field.setAttribute('target-entity', config.targetEntity || '');
                field.setAttribute('mode', config.mode || 'single');
                if (config.label && !config.hideLabel) {
                    field.setAttribute('label', config.label);
                }
                if (config.displayFields) {
                    field.setAttribute('display-fields', JSON.stringify(config.displayFields));
                }
                if (config.chipDisplayFields) {
                    field.setAttribute('chip-display-fields', JSON.stringify(config.chipDisplayFields));
                }
                if (config.valueField) {
                    field.setAttribute('value-field', config.valueField);
                }
                if (config.options) {
                    field.setAttribute('options', JSON.stringify(config.options));
                }
                if (value) {
                    field.setAttribute('value', JSON.stringify(value));
                }
                break;

            case 'separator':
                field = document.createElement('div');
                field.className = 'form-separator';
                field.textContent = config.label || '';
                return field;



            case 'infobox':
                field = document.createElement('sl-alert');
                field.variant = config.variant || 'primary';
                field.open = true;
                if (config.closable) {
                    field.closable = true;
                }

                let alertUtf8Content = '';
                if (config.icon) {
                    alertUtf8Content += `<sl-icon slot="icon" name="${config.icon}"></sl-icon>`;
                }
                // Render HTML content
                if (value) {
                    alertUtf8Content += value;
                } else if (config.content) {
                    alertUtf8Content += config.content;
                }
                field.innerHTML = alertUtf8Content;
                return field;

            case 'markdown':
                field = document.createElement('div');
                field.className = 'markdown-content';
                const mdContent = value || config.content || '';
                // Configure marked to handle tables if needed, usually default
                field.innerHTML = marked.parse(mdContent);
                return field;

            case 'table':
                field = document.createElement('ts-table');

                // Map columns to ts-datatable format and calculate visible columns
                if (config.columns) {
                    const mappedColumns = config.columns.map((col, index) => ({
                        ...col,
                        key: col.field || col.key,
                        title: col.header || col.title || col.label,
                        visible: col.visible !== false, // Default to true
                        order: col.order !== undefined ? col.order : index // Default order to index
                    }));
                    field.setAttribute('column-definitions', JSON.stringify(mappedColumns));

                    // Calculate and set visible columns attribute
                    const visibleColKeys = mappedColumns
                        .filter(col => col.visible)
                        .map(col => col.key)
                        .join(',');
                    field.setAttribute('visible-columns', visibleColKeys);
                }

                // Map all other ts-table attributes
                const boolAttrs = [
                    'show-create-button', 'show-import-button', 'show-export-button', 'show-column-selector',
                    'enable-sorting', 'enable-filtering', 'enable-column-resizing', 'enable-column-reordering',
                    'enable-selection', 'enable-row-menu', 'enable-clickable-rows', 'enable-clickable-columns',
                    'enable-pagination'
                ];

                boolAttrs.forEach(attr => {
                    // Check config for camelCase version (e.g. showCreateButton)
                    const configKey = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    if (config[configKey] !== undefined) {
                        field.setAttribute(attr, String(config[configKey]));
                    }
                });

                const stringAttrs = [
                    'single-item-actions', 'multiple-items-actions', 'unhideable-columns',
                    'unshowable-columns', 'columns-required-for-import'
                ];

                stringAttrs.forEach(attr => {
                    const configKey = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    if (config[configKey]) {
                        field.setAttribute(attr, config[configKey]);
                    }
                });

                if (config.itemsPerPage) field.setAttribute('items-per-page', config.itemsPerPage);
                if (config.itemsPerPageOptions) field.setAttribute('items-per-page-options', config.itemsPerPageOptions);
                if (config.predefinedFilters) field.setAttribute('predefined-filters', JSON.stringify(config.predefinedFilters));

                if (config.settings) {
                    field.setAttribute('settings', JSON.stringify(config.settings));
                }

                // Pass data via attribute if provided in config or value
                const tableData = value || config.data;
                if (tableData) {
                    field.setAttribute('table-data', JSON.stringify(tableData));
                }

                // Propagate events
                // Listen to all relevant table events and re-dispatch
                // Listen for specific table actions and dispatch as form-field-action
                const actionEvents = ['create-new-record', 'selection-action-activated', 'do-import'];
                actionEvents.forEach(evtName => {
                    field.addEventListener(evtName, (e) => {
                        e.stopPropagation();
                        this.dispatchEvent(new CustomEvent('form-field-action', {
                            detail: {
                                field: fieldName,
                                action: evtName,
                                originalDetail: e.detail
                            },
                            bubbles: true,
                            composed: true
                        }));
                    });
                });

                // Initialize table after a brief delay to ensure it's connected and ready
                // Use customElements.whenDefined to ensure upgrade happens before run() called
                customElements.whenDefined('ts-table').then(() => {
                    // Still need a small tick for DOM connection if it wasn't connected yet when defined
                    setTimeout(() => {
                        if (typeof field.run === 'function') {
                            field.run();
                        }
                    }, 0);
                });
                break;

            default:
                field = document.createElement('sl-input');
                field.type = config.type || 'text';
                field.setAttribute('autocomplete', 'off');
                field.value = value || '';
                if (config.placeholder) {
                    field.placeholder = config.placeholder;
                }
        }

        field.name = fieldName;


        if (!config.hideLabel) {
            if (config.type !== 'checkbox' && config.type !== 'radio' && config.type !== 'file' && config.type !== 'image' && config.type !== 'infobox' && config.type !== 'markdown') {
                field.label = config.label;
            }
        }

        if (config.required) {
            field.required = true;
        }



        field.addEventListener('sl-change', (e) => this.handleFieldChange(e, fieldName));
        return field;
    }

    handleFieldChange(event, fieldName) {
        const field = event.target;
        let newValue;

        if (field.submitValue !== undefined) {
            newValue = field.submitValue;
        } else if (field.tagName === 'SL-CHECKBOX' || field.tagName === 'SL-SWITCH') {
            newValue = field.checked;
        } else if (field.tagName === 'TS-FILE-UPLOAD') {
            newValue = event.detail.files;
        } else if (field.tagName === 'TS-RELATIONSHIP-PICKER') {
            newValue = event.detail.value;
        } else if (field.tagName === 'TS-COMBOBOX') {
            newValue = event.detail.value;
        } else if (field.type === 'file') {
            newValue = field.files;
        } else {
            newValue = field.value;
        }

        this.dispatchEvent(new CustomEvent('field-change', {
            detail: {
                field: fieldName,
                value: newValue
            },
            bubbles: true,
            composed: true
        }));
    }

    showImportResults(results) {
        const table = this.querySelector('ts-table');
        if (table && typeof table.showImportResults === 'function') {
            table.showImportResults(results);
        } else {
            console.warn('Inner ts-table not found or does not support showImportResults');
        }
    }

    evaluateMathExpression(expression) {
        try {
            // Replace comma with dot
            let expr = expression.replace(/,/g, '.');
            // Replace ^ with **
            expr = expr.replace(/\^/g, '**');
            // Validate characters again to be safe
            if (/[^0-9.+\-*/^() ]/.test(expr)) return null;

            // Use Function constructor for evaluation (safer than eval, but still allows arbitrary code if not sanitized)
            // The regex check above ensures only math chars are present.
            const result = new Function('return ' + expr)();
            if (!isFinite(result) || isNaN(result)) return null;
            return result;
        } catch (e) {
            return null;
        }
    }

    roundNumber(num, roundTo) {
        if (roundTo === undefined || roundTo === null || roundTo === '') return num;
        const factor = 1 / parseFloat(roundTo);
        return Math.round(num * factor) / factor;
    }

    formatNumber(value, roundTo) {
        if (value === undefined || value === null || value === '') return '';
        // Remove existing spaces to parse
        let num = parseFloat(value.toString().replace(/\s/g, '').replace(',', '.'));
        if (isNaN(num)) return value;

        if (roundTo !== undefined && roundTo !== null && roundTo !== '') {
            num = this.roundNumber(num, roundTo);
        }

        // Format with spaces (cs-CZ locale uses spaces for thousands)
        // Ensure we display correct number of decimal places if rounding to decimal
        let options = {};
        if (roundTo && roundTo < 1) {
            // e.g. 0.01 -> 2 decimals
            const decimals = -Math.floor(Math.log10(parseFloat(roundTo)));
            options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
        }

        return num.toLocaleString('cs-CZ', options);
    }

    formatDate(isoDate) {
        if (!isoDate) return '';
        try {
            const date = new Date(isoDate);
            if (isNaN(date.getTime())) return isoDate;
            const d = date.getDate();
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            return `${d}. ${m}. ${y}`;
        } catch (e) {
            return isoDate;
        }
    }

    formatDateTime(isoDate) {
        if (!isoDate) return '';
        try {
            const date = new Date(isoDate);
            if (isNaN(date.getTime())) return isoDate;
            const d = date.getDate();
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            return `${d}. ${m}. ${y} ${h}:${min}`;
        } catch (e) {
            return isoDate;
        }
    }
}

customElements.define('ts-form-field', TSFormField);
