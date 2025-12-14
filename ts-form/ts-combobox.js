export class TSCombobox extends HTMLElement {
    constructor() {
        super();
        this.options = [];
        this._value = '';
        this.isOpen = false;
        this.filteredOptions = [];
    }

    static get observedAttributes() {
        return ['label', 'value', 'options', 'disabled', 'placeholder', 'required', 'error', 'allow-custom', 'allow-empty'];
    }

    get allowCustom() {
        return this.hasAttribute('allow-custom');
    }

    set allowCustom(val) {
        if (val) {
            this.setAttribute('allow-custom', '');
        } else {
            this.removeAttribute('allow-custom');
        }
    }

    get allowEmpty() {
        return this.hasAttribute('allow-empty');
    }

    set allowEmpty(val) {
        if (val) {
            this.setAttribute('allow-empty', '');
        } else {
            this.removeAttribute('allow-empty');
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (name === 'options') {
                try {
                    this.options = JSON.parse(newValue);
                    this.filteredOptions = [...this.options];
                } catch (e) {
                    this.options = [];
                    this.filteredOptions = [];
                }
            } else if (name === 'value') {
                this._value = newValue;
            }
            this.render();
        }
    }

    getDisplayValue(value) {
        if (value === null || value === undefined || value === '') return '';
        const option = this.options.find(opt => {
            const optVal = (opt && opt.value !== undefined) ? opt.value : opt;
            return String(optVal) === String(value);
        });
        if (option) {
            return option.label || option.value || option;
        }
        return value;
    }

    connectedCallback() {
        this.render();
        document.addEventListener('click', this.handleDocumentClick.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleDocumentClick.bind(this));
    }

    handleDocumentClick(e) {
        if (!this.contains(e.target)) {
            this.isOpen = false;
            this.renderDropdown(); // Only re-render dropdown state
            this.updateIconState();
            this.validateInput();
        }
    }

    validateInput() {
        const input = this.querySelector('sl-input');
        if (!input) return;

        const text = input.value.trim();
        if (!text) {
            if (this.allowEmpty) {
                this.handleSelect(''); // Clear allowed
            } else {
                // Not allowed to be empty, revert if possible
                if (this._value) {
                    input.value = this.getDisplayValue(this._value);
                } else {
                    // No previous value, but empty not allowed.
                    // If strict mode, maybe clear? Or keep empty?
                    // Usually "not allow empty" means "required", but here it means "don't allow clearing a valid value".
                    // If there was no value, we can't force one.
                    this.handleSelect('');
                }
            }
            return;
        }

        // Find option matching label (case-insensitive)
        const option = this.options.find(opt => {
            const label = opt.label || opt.value || opt;
            return String(label).toLowerCase() === text.toLowerCase();
        });

        if (option) {
            // Found strict match (or case-insensitive match)
            const val = option.value || option;
            if (this._value !== val) {
                this.handleSelect(val);
            } else {
                // Just normalize display if needed
                input.value = this.getDisplayValue(val);
            }
        } else {
            // No match
            if (this.allowCustom) {
                if (this._value !== text) {
                    this._value = text;
                    this.dispatchEvent(new CustomEvent('sl-change', {
                        detail: { value: text },
                        bubbles: true,
                        composed: true
                    }));
                }
            } else {
                // Strict mode: Revert to previous valid value if exists
                if (this._value) {
                    input.value = this.getDisplayValue(this._value);
                    // No change event emitted as value is restored
                } else {
                    // No previous value, clear
                    this.handleSelect('');
                }
            }
        }
    }

    toggleDropdown(e) {
        e.preventDefault(); // Prevent focus loss/blur logic interference
        e.stopPropagation();

        if (this.isOpen) {
            this.isOpen = false;
            this.renderDropdown();
            this.updateIconState();
        } else {
            this.isOpen = true;
            this.handleFocus(); // This will select text and render dropdown
        }
    }

    updateIconState() {
        const icon = this.querySelector('.combobox-icon');
        if (icon) {
            icon.classList.toggle('open', this.isOpen);
        }
    }

    handleInput(e) {
        const value = e.target.value;
        // Do NOT update this._value here (wait for commit/blur)
        // Do NOT emit sl-change here (wait for commit/blur)

        this.isOpen = true;
        this.updateIconState();

        if (!value) {
            this.filteredOptions = [...this.options];
        } else {
            const lowerValue = value.toLowerCase();
            this.filteredOptions = this.options.filter(opt => {
                const label = opt.label || opt.value || opt;
                return String(label).toLowerCase().includes(lowerValue);
            });
        }

        this.renderDropdown();
    }

    handleSelect(value) {
        const oldValue = this._value;
        this._value = value;
        this.isOpen = false;
        this.updateIconState();

        if (oldValue !== value) {
            this.dispatchEvent(new CustomEvent('sl-change', {
                detail: { value: this._value },
                bubbles: true,
                composed: true
            }));
        }

        // Update input value
        const input = this.querySelector('sl-input');
        if (input) {
            input.value = this.getDisplayValue(value);
        }
        this.renderDropdown();
    }

    handleFocus() {
        this.isOpen = true;
        this.updateIconState();

        // Select all text on focus
        const input = this.querySelector('sl-input');
        if (input) {
            setTimeout(() => input.select(), 0);
        }

        if (input && input.value) {
            const lowerValue = input.value.toLowerCase();
            this.filteredOptions = this.options.filter(opt => {
                const label = opt.label || opt.value || opt;
                return String(label).toLowerCase().includes(lowerValue);
            });
        } else {
            this.filteredOptions = [...this.options];
        }
        this.renderDropdown();
    }

    render() {
        this.innerHTML = '';
        const label = this.getAttribute('label');
        const disabled = this.hasAttribute('disabled');
        const placeholder = this.getAttribute('placeholder') || '';
        const required = this.hasAttribute('required');
        const error = this.getAttribute('error');

        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '100%';

        const input = document.createElement('sl-input');
        input.classList.add('combobox-input');
        if (label) input.label = label;
        input.value = this.getDisplayValue(this._value);
        input.disabled = disabled;
        input.placeholder = placeholder;
        input.required = required;
        if (error) input.classList.add('input-invalid');
        input.setAttribute('autocomplete', 'off');

        const icon = document.createElement('sl-icon');
        icon.classList.add('combobox-icon');
        icon.slot = 'suffix';
        icon.name = 'chevron-down';
        icon.name = 'chevron-down';
        // Use mousedown to prevent focus change before click
        icon.addEventListener('mousedown', (e) => e.preventDefault());
        icon.addEventListener('click', this.toggleDropdown.bind(this));
        input.appendChild(icon);
        input.appendChild(icon);

        input.addEventListener('sl-input', this.handleInput.bind(this));
        input.addEventListener('sl-focus', this.handleFocus.bind(this));

        // Handle Escape to revert
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                // Revert to previous valid value
                input.value = this.getDisplayValue(this._value);
                this.isOpen = false;
                this.renderDropdown();
                this.updateIconState();
                input.blur();
            }
        });
        // Also validate on blur (tabbing away)
        input.addEventListener('sl-blur', () => {
            // Small timeout to allow click events on dropdown items to fire first
            setTimeout(() => {
                if (this.isOpen) {
                    this.isOpen = false;
                    this.renderDropdown();
                    this.updateIconState();
                }
                this.validateInput();
            }, 150);
        });

        // Suppress internal sl-change events
        input.addEventListener('sl-change', (e) => {
            e.stopPropagation();
        });

        container.appendChild(input);

        const dropdown = document.createElement('div');
        dropdown.className = 'ts-combobox-dropdown';
        // Styles will be applied via inline styles in renderDropdown or a style block

        container.appendChild(dropdown);
        this.appendChild(container);

        // Add styles once
        if (!this.querySelector('style')) {
            const style = document.createElement('style');
            style.textContent = `
                .ts-combobox-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    max-height: 200px;
                    overflow-y: auto;
                    background: var(--sl-color-neutral-0);
                    border: 1px solid var(--sl-color-neutral-200);
                    border-radius: var(--sl-border-radius-medium);
                    box-shadow: var(--sl-shadow-medium);
                    z-index: 1000;
                    margin-top: 4px;
                    display: none;
                }
                .ts-combobox-item {
                    padding: var(--sl-spacing-small) var(--sl-spacing-medium);
                    cursor: pointer;
                    transition: background-color 0.1s;
                    color: var(--sl-color-neutral-700);
                    font-family: var(--sl-font-sans);
                    font-size: var(--sl-font-size-medium);
                }
                .ts-combobox-item:hover {
                    background-color: var(--sl-color-primary-50);
                    color: var(--sl-color-primary-700);
                }
                sl-input.combobox-input::part(suffix) {
                    padding-inline-end: var(--sl-input-spacing-medium, 0.75rem);
                    color: var(--sl-input-icon-color, currentColor);
                }
                .combobox-icon {
                    margin: 0 !important;
                    transition: transform 0.2s ease;
                    cursor: pointer;
                }
                .combobox-icon.open {
                    transform: rotate(180deg);
                }
                .ts-combobox-empty {
                    padding: var(--sl-spacing-small) var(--sl-spacing-medium);
                    color: var(--sl-color-neutral-500);
                    font-family: var(--sl-font-sans);
                    font-size: var(--sl-font-size-medium);
                    font-style: italic;
                    cursor: default;
                }
            `;
            this.appendChild(style);
        }

        this.renderDropdown();
    }

    renderDropdown() {
        const dropdown = this.querySelector('.ts-combobox-dropdown');
        if (!dropdown) return;

        if (this.isOpen && this.filteredOptions.length > 0) {
            dropdown.style.display = 'block';
            dropdown.innerHTML = '';

            this.filteredOptions.forEach(opt => {
                const val = opt.value || opt;
                const lbl = opt.label || val;

                const item = document.createElement('div');
                item.className = 'ts-combobox-item';
                item.textContent = lbl;
                item.addEventListener('click', () => this.handleSelect(val));

                dropdown.appendChild(item);
            });
        } else if (this.isOpen) {
            // Show "Nic nenalezeno..." if open but no options match
            dropdown.style.display = 'block';
            dropdown.innerHTML = '';
            const empty = document.createElement('div');
            empty.className = 'ts-combobox-empty';
            empty.textContent = 'Nic nenalezeno...';
            dropdown.appendChild(empty);
        } else {
            dropdown.style.display = 'none';
        }
    }
}

customElements.define('ts-combobox', TSCombobox);
