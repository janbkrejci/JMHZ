import './ts-form-field.js';
// CSS imported in HTML via CDN


class TSForm extends HTMLElement {
    constructor() {
        super();
        this.formData = {};
        this.validationErrors = {};
        this.lastAction = null;
        this.buttons = {};
        this.buttons = {};
        this.buttons = {};
        this.isInitialized = false;

        // Global fix for layout shift: Force scrollbar to be always visible
        // This prevents the content from jumping when Shoelace locks the body scroll
        // if (!document.getElementById('ts-form-global-styles')) {
        //     const style = document.createElement('style');
        //     style.id = 'ts-form-global-styles';
        //     style.textContent = `
        //         html {
        //             scrollbar-gutter: stable;
        //         }
        //         body {
        //             scrollbar-gutter: stable;
        //         }
        //         body.sl-scroll-lock {
        //             padding-right: 0 !important;
        //             overflow: hidden !important;
        //         }
        //     `;
        //     document.head.appendChild(style);
        // }
    }

    static get observedAttributes() {
        return ['layout', 'fields', 'errors', 'buttons', 'values', 'active-tab'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'active-tab') {
                this.switchTab(newValue);
            } else if (this.isInitialized) {
                // Only re-render if already initialized via run()
                this.requestRender();
            }
        }
    }

    run() {
        this.isInitialized = true;
        this.render();

        // Wait for Shoelace components to be defined before showing content
        // Dynamically identify used custom elements
        const usedTags = new Set();
        const candidates = this.querySelectorAll('*');
        candidates.forEach(el => {
            const tag = el.tagName.toLowerCase();
            if (tag.startsWith('sl-') || tag.startsWith('ts-')) {
                usedTags.add(tag);
            }
        });

        // Always wait for at least these common ones if they might appear dynamically
        // But strictly speaking, we should only wait for what's in the DOM or what we expect.
        // If we wait for something not in DOM and not loaded, we hang.
        // So let's stick to what we found, plus maybe sl-icon if we use it internally without explicit tag in HTML (e.g. inside other components)
        // But safer is to just wait for what we have found.

        const promises = Array.from(usedTags).map(tag => customElements.whenDefined(tag));

        // Add a timeout to prevent hanging indefinitely
        const timeout = new Promise(resolve => setTimeout(resolve, 2000));

        Promise.race([Promise.all(promises), timeout])
            .then(() => {
                const container = this.querySelector('.ts-form-container');
                const loader = this.querySelector('.loader');
                if (container) {
                    // Small delay to ensure DOM is painted
                    requestAnimationFrame(() => {
                        container.style.opacity = '1';
                        if (loader) {
                            loader.classList.add('hidden');
                        }
                    });
                }
            }).catch(() => {
                // Fallback
                const container = this.querySelector('.ts-form-container');
                const loader = this.querySelector('.loader');
                if (container) {
                    container.style.opacity = '1';
                    if (loader) {
                        loader.classList.add('hidden');
                    }
                }
            });
    }

    requestRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => {
            this.render();
            this.renderPending = false;
        });
    }

    switchTab(tabIndex) {
        const tabGroup = this.querySelector('sl-tab-group');
        if (tabGroup) {
            const panelName = `tab-${tabIndex}`;
            tabGroup.show(panelName);
        }
    }

    connectedCallback() {
        this.ensureStructure();
        this.setupEventListeners();
    }

    ensureStructure() {
        if (this.querySelector('.ts-form-container')) return;

        // Create style
        const style = document.createElement('style');
        style.textContent = `
            ts-form {
                display: block;
                width: 100%;
                height: 100vh;
                --label-spacing: var(--sl-spacing-2x-small);
                position: relative; /* For loader positioning */
                font-family: var(--sl-font-sans);
            }
            .ts-form-container {
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                width: 100%;
                height: 100%;
            }
            .loader {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                width: 100%;
                position: absolute;
                top: 0;
                left: 0;
                background: var(--sl-color-neutral-0);
                z-index: 100;
                transition: opacity 0.3s ease-out;
            }
            .loader.hidden {
                opacity: 0;
                pointer-events: none;
            }
            .dot {
                width: 10px;
                height: 10px;
                margin: 0 5px;
                background-color: var(--sl-color-primary-600);
                border-radius: 50%;
                animation: bounce 1.4s infinite ease-in-out both;
            }
            .dot:nth-child(1) { animation-delay: -0.32s; }
            .dot:nth-child(2) { animation-delay: -0.16s; }
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
            form {
                display: grid;
                grid-template-rows: 1fr auto;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            .form-actions {
                grid-row: 2;
                display: flex;
                justify-content: space-between;
                gap: 1rem;
                background: var(--sl-color-neutral-0);
                padding: 1rem;
                border-top: 1px solid var(--sl-color-neutral-200);
                z-index: 10;
            }
            sl-tab-group {
                grid-row: 1;
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
            }
            sl-tab-group::part(base) {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            sl-tab-group::part(body) {
                flex: 1;
                overflow: hidden; /* Delegate scrolling to tab-content */
                display: flex;
                flex-direction: column;
            }
            sl-tab-panel {
                height: 100%;
                width: 100%;
                --padding: 0;
            }
            sl-tab-panel::part(base) {
                height: 100%;
                width: 100%;
                display: block; /* Ensure base part fills host */
            }
            .tab-content {
                padding: 1rem;
                max-width: 1200px;
                margin: 0 auto;
                height: 100%;
                overflow: auto;
                box-sizing: border-box;
                scrollbar-gutter: stable; /* Prevent layout shift when scrollbar appears */
            }
            .tab-content.full-height {
                padding: 0.5rem;
                max-width: none;
                overflow: hidden; /* Let table handle scrolling */
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }
            .tab-content.full-height .form-row {
                height: 100%;
                margin-bottom: 0;
                gap: 0; /* Remove gap for single item */
                min-height: 0; /* Allow shrinking */
            }
            .tab-content.full-height .form-col {
                height: 100%;
                min-height: 0;
            }
            .tab-content.full-height ts-form-field {
                height: 100%;
                display: block;
                min-height: 0;
            }
            .tab-content.full-height ts-form-field ts-table {
                height: 100%;
                width: 100%;
            }
            .form-row {
                display: grid;
                gap: 0;
                margin-bottom: 1rem;
            }
            .form-col {
                min-width: 0; /* Critical: allows flex item to shrink below content size */
                overflow: visible; /* Changed from hidden to allow tooltips (slider) to show */
                padding: 4px 0.5rem; /* Simulate gap with padding */
            }
            .form-col:first-child {
                padding-left: 4px;
            }
            .form-col:last-child {
                padding-right: 4px;
            }
            .error-message {
                color: var(--sl-color-danger-500);
                font-size: var(--sl-font-size-small);
                margin-top: 0.25rem;
            }
            
            /* Increase label spacing */
            ts-form-field::part(form-control-label) {
                margin-bottom: var(--label-spacing);
            }

            /* invalid styles */
            .input-invalid {
                --sl-input-border-color: var(--sl-color-danger-600);
                --sl-input-border-color-hover: var(--sl-color-danger-600);
                --sl-input-border-color-focus: var(--sl-color-danger-600);
            }

            .input-invalid:focus-within {
                --sl-input-border-color: var(--sl-color-danger-600);
                --sl-input-focus-ring-color: var(--sl-color-danger-300);
            }

            .input-invalid sl-radio::part(label) {
                color: var(--sl-color-danger-700);
            }

            .input-invalid::part(form-control-label),
            .input-invalid::part(form-control-help-text),
            .input-invalid::part(label) {
                color: var(--sl-color-danger-700) !important;
            }

            .text-right::part(input) {
                text-align: right;
            }

            /* switch label when its container has .input-invalid */
            .input-invalid label {
                color: var(--sl-color-danger-700);
            }

            .input-invalid sl-switch::part(label) {
                color: var(--sl-color-danger-700);
            }

            .input-invalid sl-checkbox::part(label) {
                color: var(--sl-color-danger-700);
            }

            .input-invalid sl-checkbox::part(control) {
                outline: none;
            }

            /* ts-combobox error styling */
            ts-combobox.input-invalid sl-input::part(form-control-label) {
                color: var(--sl-color-danger-700) !important;
            }

            /* ts-file-upload error styling */
            .input-invalid .file-upload-label {
                color: var(--sl-color-danger-700) !important;
            }

            sl-tab.invalid::part(base) {
                color: var(--sl-color-danger-700);
            }

            sl-tab.invalid[active]::part(base) {
                color: var(--sl-color-danger-700);
            }

            sl-tab-group::part(nav) {
                background: var(--sl-color-neutral-0);
                z-index: 1;
                padding-left: 0;
                padding-right: 0;
            }
            .form-separator {
                display: flex;
                align-items: center;
                width: 100%;
                margin: 0.5rem 0 0.5rem 0;
                color: var(--sl-color-neutral-500);
                font-size: var(--sl-font-size-small);
                font-weight: var(--sl-font-weight-bold);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-family: var(--sl-font-sans);
            }
            .form-separator::after {
                content: '';
                flex: 1;
                height: 1px;
                background: var(--sl-color-neutral-200);
                margin-left: 1rem;
            }
            
            /* Process Group Styles */
            .process-group {
                display: flex;
                isolation: isolate;
            }
            
            .process-group sl-button {
                margin-left: -12px; /* Overlap */
                z-index: 1;
            }
            
            .process-group sl-button:hover,
            .process-group sl-button:focus-within,
            .process-group sl-button[data-variant="primary"],
            .process-group sl-button[data-variant="success"],
            .process-group sl-button[data-variant="warning"] {
                z-index: 10;
            }

            .process-group sl-button::part(base) {
                border-radius: 0;
                border: none;
                min-height: 40px;
                
                /* Shape: Cutout Left (Notch), Arrow Right */
                /* Polygon: Top-Left, Top-Right(indent), Right-Mid(point), Bottom-Right(indent), Bottom-Left, Left-Mid(indent/notch) */
                clip-path: polygon(
                    0 0, 
                    calc(100% - 12px) 0, 
                    100% 50%, 
                    calc(100% - 12px) 100%, 
                    0 100%, 
                    12px 50%
                );
                
                padding-left: 25px;
                padding-right: 25px;
                background-color: var(--sl-color-neutral-200);
                color: var(--sl-color-neutral-700);
                transition: background-color 0.2s, color 0.2s;
            }

            /* Colors - using !important to ensure override of default button styles if needed */
            .process-group sl-button[data-variant="primary"]::part(base) {
                background-color: var(--sl-color-primary-600) !important;
                color: var(--sl-color-neutral-0) !important;
            }
            
            .process-group sl-button[data-variant="success"]::part(base) {
                background-color: var(--sl-color-success-600) !important;
                color: var(--sl-color-neutral-0) !important;
            }
            
            .process-group sl-button[data-variant="warning"]::part(base) {
                background-color: var(--sl-color-warning-600) !important;
                color: var(--sl-color-neutral-0) !important;
            }

            /* First button: Also Notched Left (as requested) */
            .process-group sl-button:first-child {
                margin-left: 0;
            }
            
            .process-group sl-button:first-child::part(base) {
                /* Same notched shape as others */
                clip-path: polygon(
                    0 0, 
                    calc(100% - 12px) 0, 
                    100% 50%, 
                    calc(100% - 12px) 100%, 
                    0 100%, 
                    12px 50%
                );
                padding-left: 25px; /* Consistent padding */
                padding-right: 25px;
            }

            /* Flatpickr Overrides */
            .flatpickr-calendar {
                font-family: var(--sl-font-sans) !important;
            }
        `;
        this.appendChild(style);

        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        this.appendChild(loader);

        const container = document.createElement('div');
        container.className = 'ts-form-container';
        this.appendChild(container);
    }

    setupEventListeners() {
        this.addEventListener('field-change', (e) => {
            e.stopPropagation();
            const { field, value } = e.detail;

            // Deduplicate change events
            // For objects, this simple check might not be enough, but for primitives it works well.
            // Since this fixes the double-event issue on Enter (strings), it's sufficient.
            if (this.formData[field] === value) return;

            this.formData[field] = value;

            this.dispatchEvent(new CustomEvent('form-changed', {
                detail: {
                    field: field,
                    value: value,
                    formData: this.formData
                },
                bubbles: true,
                composed: true
            }));
        });

        this.addEventListener('form-field-action', (e) => {
            // Re-dispatch or handle specific field actions
        });

        this.addEventListener('form-key-action', (e) => {
            e.stopPropagation();
            const { action, field } = e.detail;

            if (!action) return;

            // Handle 'focus:FIELD_NAME'
            if (action.startsWith('focus:')) {
                const targetFieldName = action.split(':')[1];
                const targetField = this.querySelector(`ts-form-field[field-name="${targetFieldName}"]`);
                if (targetField && typeof targetField.setFocus === 'function') {
                    // Slight delay to ensure previous event is finished (e.g. keyup)
                    requestAnimationFrame(() => targetField.setFocus());
                } else {
                    console.warn(`Target field for focus not found: ${targetFieldName}`);
                }
            }
            // Handle 'click:ACTION_NAME' or 'submit'
            else if (action.startsWith('click:') || action === 'submit') {
                const actionName = action === 'submit' ? 'submit' : action.split(':')[1];

                let btn = this.buttons[actionName];

                // If action is 'submit' and no specific button named 'submit' exists, try to find a primary button
                if (!btn && actionName === 'submit') {
                    const buttons = Object.values(this.buttons);
                    btn = buttons.find(b => b.variant === 'primary' && !b.disabled && b.style.display !== 'none');
                }

                if (btn && !btn.disabled && btn.style.display !== 'none') {
                    btn.click();
                } else {
                    console.warn(`Button for action '${actionName}' not found or disabled`);
                }
            }
            // Handle 'next' (optional) - focus next field in DOM
            else if (action === 'next') {
                const allFields = Array.from(this.querySelectorAll('ts-form-field'));
                const currentIndex = allFields.findIndex(f => f.getAttribute('field-name') === field);
                if (currentIndex >= 0 && currentIndex < allFields.length - 1) {
                    const nextField = allFields[currentIndex + 1];
                    if (nextField && typeof nextField.setFocus === 'function') {
                        nextField.setFocus();
                    }
                }
            }
        });

        this.addEventListener('form-table-action', (e) => {
            // Re-dispatch table actions from fields
            // e.detail contains { field, action, originalDetail }
            // We can just let it bubble or re-dispatch if needed.
            // Since bubbles: true is set in ts-form-field, it should bubble up.
            // But if we want to capture it at ts-form level and maybe modify it, we can.
            // For now, let's just log it or ensure it propagates.
        });
    }

    showImportResults(fieldName, results) {
        // Find the field element
        const field = this.querySelector(`ts-form-field[field-name="${fieldName}"]`);
        if (field && typeof field.showImportResults === 'function') {
            field.showImportResults(results);
        } else {
            console.warn(`Field ${fieldName} not found or does not support showImportResults`);
        }
    }

    render() {
        const layout = this.getAttribute('layout');
        const fields = this.getAttribute('fields');
        const errors = this.getAttribute('errors');
        const buttons = this.getAttribute('buttons');
        const values = this.getAttribute('values');

        if (!layout || !fields) {
            return;
        }

        try {
            const layoutConfig = JSON.parse(layout);
            const fieldsConfig = JSON.parse(fields);
            // Store fields config for later use
            this.fieldsConfig = fieldsConfig;
            const errorsConfig = errors ? JSON.parse(errors) : {};
            const buttonsConfig = buttons ? JSON.parse(buttons) : [];
            const valuesConfig = values ? JSON.parse(values) : {};

            // Merge values into formData
            this.formData = { ...this.formData, ...valuesConfig };

            // Ensure structure exists
            this.ensureStructure();

            // Get container
            const container = this.querySelector('.ts-form-container');
            container.innerHTML = ''; // Clear container content for re-render

            // Create form element
            const form = document.createElement('form');
            form.noValidate = true;
            // Styles are now in CSS


            // Render Tabs
            if (layoutConfig.tabs) {
                const tabGroup = document.createElement('sl-tab-group');
                let hasAnyInvalidTab = false;

                layoutConfig.tabs.forEach((tab, index) => {
                    const slTab = document.createElement('sl-tab');
                    slTab.slot = 'nav';
                    slTab.panel = `tab-${index}`;
                    slTab.textContent = tab.label;

                    // Set active tab if specified
                    const activeTabAttr = this.getAttribute('active-tab');
                    if (activeTabAttr !== null) {
                        if (parseInt(activeTabAttr) === index) {
                            slTab.active = true;
                        }
                    } else if (index === 0) { // Default to first tab if no active-tab specified
                        slTab.active = true;
                    }

                    // Check if tab has any errors
                    const hasErrors = tab.rows.some(row => row.some(col => errorsConfig[col.field]));
                    if (hasErrors) {
                        slTab.classList.add('invalid');
                        hasAnyInvalidTab = true;
                    }

                    const slPanel = document.createElement('sl-tab-panel');
                    slPanel.name = `tab-${index}`;
                    if (activeTabAttr !== null) {
                        if (parseInt(activeTabAttr) === index) {
                            slPanel.active = true;
                        }
                    } else if (index === 0) { // Default to first tab if no active-tab specified
                        slPanel.active = true;
                    }

                    // Check if tab should be full height
                    // Heuristic: if tab has 1 row, 1 col, and that col is type 'table'
                    let isFullHeight = false;
                    if (tab.rows && tab.rows.length === 1 && tab.rows[0].length === 1) {
                        const fieldName = tab.rows[0][0].field;
                        if (fieldsConfig[fieldName] && fieldsConfig[fieldName].type === 'table') {
                            isFullHeight = true;
                        }
                    }

                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'tab-content';
                    if (isFullHeight) {
                        contentDiv.classList.add('full-height');
                    }

                    // Render rows in tab
                    if (tab.rows) {
                        tab.rows.forEach(row => {
                            const rowDiv = document.createElement('div');
                            rowDiv.className = 'form-row';
                            rowDiv.style.gridTemplateColumns = row.map(col => col.width || '1fr').join(' ');

                            row.forEach(col => {
                                const colDiv = document.createElement('div');
                                colDiv.className = 'form-col';

                                if (col.align) {
                                    colDiv.style.display = 'flex';
                                    colDiv.style.justifyContent = col.align === 'right' ? 'flex-end' : (col.align === 'center' ? 'center' : 'flex-start');
                                }

                                if (col.type === 'empty') {
                                    rowDiv.appendChild(colDiv);
                                    return;
                                }

                                if (col.type === 'separator') {
                                    const fieldElement = document.createElement('ts-form-field');
                                    fieldElement.setAttribute('config', JSON.stringify({ type: 'separator', label: col.label }));
                                    fieldElement.setAttribute('field-name', `separator-${Math.random().toString(36).substr(2, 9)}`);
                                    colDiv.appendChild(fieldElement);
                                    rowDiv.appendChild(colDiv);
                                    return;
                                }

                                const fieldConfig = fieldsConfig[col.field];
                                if (fieldConfig) {
                                    const fieldElement = document.createElement('ts-form-field');
                                    fieldElement.setAttribute('config', JSON.stringify(fieldConfig));
                                    fieldElement.setAttribute('field-name', col.field);

                                    const value = this.formData[col.field];
                                    if (value !== undefined && value !== null) {
                                        if (typeof value === 'object') {
                                            fieldElement.setAttribute('value', JSON.stringify(value));
                                        } else {
                                            fieldElement.setAttribute('value', value);
                                        }
                                    }

                                    if (errorsConfig[col.field]) {
                                        fieldElement.setAttribute('error', errorsConfig[col.field]);
                                    }

                                    colDiv.appendChild(fieldElement);
                                }

                                rowDiv.appendChild(colDiv);
                            });

                            contentDiv.appendChild(rowDiv);
                        });
                    }

                    slPanel.appendChild(contentDiv);
                    tabGroup.appendChild(slTab);
                    tabGroup.appendChild(slPanel);
                });
                if (hasAnyInvalidTab) {
                    tabGroup.classList.add('invalid');
                    // Dynamically set indicator color based on active tab
                    const updateIndicator = () => {
                        const activeTab = tabGroup.querySelector('sl-tab[active]');
                        if (activeTab && activeTab.classList.contains('invalid')) {
                            tabGroup.style.setProperty('--indicator-color', 'var(--sl-color-danger-600)');
                        } else {
                            tabGroup.style.setProperty('--indicator-color', 'var(--sl-color-primary-600)');
                        }
                    };
                    tabGroup.addEventListener('sl-tab-show', () => setTimeout(updateIndicator, 0));
                    // Initial check after DOM is ready
                    setTimeout(updateIndicator, 0);
                }

                form.appendChild(tabGroup);
            } else if (layoutConfig.rows) {
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'form-content-wrapper';
                contentWrapper.style.padding = '1rem';
                contentWrapper.style.overflow = 'auto';
                contentWrapper.style.scrollbarGutter = 'stable'; /* Prevent layout shift */
                contentWrapper.style.overflow = 'auto';
                contentWrapper.style.scrollbarGutter = 'stable'; /* Prevent layout shift */
                this.renderRows(layoutConfig.rows, fieldsConfig, errorsConfig, contentWrapper);
                form.appendChild(contentWrapper);
            }

            const actions = document.createElement('div');
            actions.className = 'form-actions';


            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.gap = '0.5rem';
            const centerDiv = document.createElement('div');
            centerDiv.style.display = 'flex';
            centerDiv.style.gap = '0.5rem';
            const rightDiv = document.createElement('div');
            rightDiv.style.display = 'flex';
            rightDiv.style.gap = '0.5rem';

            actions.appendChild(leftDiv);
            actions.appendChild(centerDiv);
            actions.appendChild(rightDiv);

            let hasVisibleButtons = false;

            if (buttons) {
                const buttonsConfig = JSON.parse(buttons);
                buttonsConfig.forEach(btn => {
                    if (!btn.hidden) {
                        hasVisibleButtons = true;
                    }
                    const button = document.createElement('sl-button');
                    button.variant = btn.variant || 'primary';
                    button.textContent = btn.label || btn.action;
                    button.type = 'button'; // Prevent default submit
                    if (btn.disabled) {
                        button.disabled = true;
                    }
                    if (btn.hidden) {
                        button.style.display = 'none';
                    }
                    button.addEventListener('click', () => {
                        this.lastAction = btn.action;
                        if (btn.action === 'export-data') {
                            this.exportFormData();
                            return;
                        }
                        if (btn.action === 'import-data') {
                            this.importFormData();
                            return;
                        }
                        if (btn.confirmation) {
                            this.showConfirmationDialog(btn.confirmation, () => {
                                this.dispatchEvent(new CustomEvent('form-submit', {
                                    detail: {
                                        formData: this.getSubmissionData(),
                                        action: btn.action
                                    },
                                    bubbles: true,
                                    composed: true
                                }));
                            });
                        } else {
                            this.dispatchEvent(new CustomEvent('form-submit', {
                                detail: {
                                    formData: this.getSubmissionData(),
                                    action: btn.action
                                },
                                bubbles: true,
                                composed: true
                            }));
                        }
                    });
                    this.buttons[btn.action] = button;
                    const position = btn.position || 'right';
                    if (position === 'left') {
                        leftDiv.appendChild(button);
                    } else if (position === 'center') {
                        centerDiv.appendChild(button);
                    } else {
                        rightDiv.appendChild(button);
                    }
                });
            } else {
                hasVisibleButtons = true; // Default submit button is visible
                const submitButton = document.createElement('sl-button');
                submitButton.variant = 'primary';
                submitButton.textContent = 'Submit';
                submitButton.type = 'button';
                submitButton.addEventListener('click', () => {
                    this.lastAction = 'submit';
                    this.dispatchEvent(new CustomEvent('form-submit', {
                        detail: {
                            formData: this.getSubmissionData(),
                            action: 'submit'
                        },
                        bubbles: true,
                        composed: true
                    }));
                });
                this.buttons['submit'] = submitButton;
                rightDiv.appendChild(submitButton);
            }

            if (!hasVisibleButtons) {
                actions.style.display = 'none';
            }

            form.addEventListener('submit', this.handleSubmit.bind(this));
            form.appendChild(actions);
            container.appendChild(form);

        } catch (e) {
            console.error('Failed to parse form configuration:', e);
            this.innerHTML = '<p>Error: Invalid form configuration.</p>';
        }
    }

    renderRows(rows, fieldsConfig, errorsConfig, parent) {
        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'form-row';
            rowDiv.style.gridTemplateColumns = row.map(col => col.width || '1fr').join(' ');

            row.forEach(col => {
                const colDiv = document.createElement('div');
                colDiv.className = 'form-col';

                if (col.align) {
                    colDiv.style.display = 'flex';
                    colDiv.style.justifyContent = col.align === 'right' ? 'flex-end' : (col.align === 'center' ? 'center' : 'flex-start');
                }

                if (col.type === 'empty') {
                    rowDiv.appendChild(colDiv);
                    return;
                }

                if (col.type === 'separator') {
                    const fieldElement = document.createElement('ts-form-field');
                    fieldElement.setAttribute('config', JSON.stringify({ type: 'separator', label: col.label }));
                    fieldElement.setAttribute('field-name', `separator-${Math.random().toString(36).substr(2, 9)}`);
                    colDiv.appendChild(fieldElement);
                    rowDiv.appendChild(colDiv);
                    return;
                }

                const fieldConfig = fieldsConfig[col.field];
                if (fieldConfig) {
                    const fieldContainer = document.createElement('div');
                    // Padding removed to fix vertical gap issue

                    const fieldComponent = document.createElement('ts-form-field');
                    fieldComponent.setAttribute('field-name', col.field);
                    fieldComponent.setAttribute('config', JSON.stringify(fieldConfig));

                    const value = this.formData[col.field];
                    if (value !== undefined && value !== null) {
                        if (typeof value === 'object') {
                            fieldComponent.setAttribute('value', JSON.stringify(value));
                        } else {
                            fieldComponent.setAttribute('value', value);
                        }
                    }

                    const error = errorsConfig[col.field];
                    if (error) {
                        fieldComponent.setAttribute('error', error);
                    }

                    fieldContainer.appendChild(fieldComponent);
                    rowDiv.appendChild(fieldContainer);
                }
            });
            parent.appendChild(rowDiv);
        });
    }

    getSubmissionData() {
        const submissionData = { ...this.formData };

        if (this.fieldsConfig) {
            Object.keys(this.fieldsConfig).forEach(fieldName => {
                const config = this.fieldsConfig[fieldName];
                if (config.excludeFromSubmit) {
                    delete submissionData[fieldName];
                }
            });
        }

        return submissionData;
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    async exportFormData() {
        const process = async (obj) => {
            if (Array.isArray(obj)) {
                return Promise.all(obj.map(item => process(item)));
            } else if (obj instanceof File) {
                const base64 = await this.fileToBase64(obj);
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
                    newObj[key] = await process(obj[key]);
                }
                return newObj;
            }
            return obj;
        };

        try {
            const exportData = await process(this.formData);
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `form-data-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
            alert('Export failed: ' + e.message);
        }
    }

    importFormData() {
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
                    this.formData = data;
                    this.requestRender();
                } catch (err) {
                    console.error('Import failed', err);
                    alert('Import failed: Invalid JSON');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    handleSubmit(event) {
        event.preventDefault();
        // Implicit submission (Enter key) is disabled as per user request
        // We only prevent the default form submission (page reload)
        // The form-submit event is only dispatched by button clicks
    }

    disableButton(action) {
        if (this.buttons[action]) {
            this.buttons[action].disabled = true;
        }
    }

    enableButton(action) {
        if (this.buttons[action]) {
            this.buttons[action].disabled = false;
        }
    }

    hideButton(action) {
        if (this.buttons[action]) {
            this.buttons[action].style.display = 'none';
        }
    }

    showButton(action) {
        if (this.buttons[action]) {
            this.buttons[action].style.display = '';
        }
    }

    showConfirmationDialog(confirmation, onConfirm) {
        const dialog = document.createElement('sl-dialog');
        dialog.label = confirmation.title || 'Confirm';
        dialog.open = true;
        dialog.size = 'medium';
        dialog.style.fontFamily = 'var(--sl-font-sans)';

        const content = document.createElement('div');
        content.textContent = confirmation.text || 'Are you sure?';
        dialog.appendChild(content);

        const footer = document.createElement('div');
        footer.slot = 'footer';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';

        const leftDiv = document.createElement('div');
        leftDiv.style.display = 'flex';
        leftDiv.style.gap = '0.5rem';
        const centerDiv = document.createElement('div');
        centerDiv.style.display = 'flex';
        centerDiv.style.gap = '0.5rem';
        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.gap = '0.5rem';

        footer.appendChild(leftDiv);
        footer.appendChild(centerDiv);
        footer.appendChild(rightDiv);

        confirmation.buttons.forEach(btn => {
            const button = document.createElement('sl-button');
            button.variant = btn.variant || 'primary';
            button.textContent = btn.label || btn.action;
            button.addEventListener('click', () => {
                dialog.hide();
                if (btn.confirm) {
                    onConfirm();
                }
            });
            const position = btn.position || 'right';
            if (position === 'left') {
                leftDiv.appendChild(button);
            } else if (position === 'center') {
                centerDiv.appendChild(button);
            } else {
                rightDiv.appendChild(button);
            }
        });

        dialog.appendChild(footer);
        document.body.appendChild(dialog);
    }
}

customElements.define('ts-form', TSForm);
