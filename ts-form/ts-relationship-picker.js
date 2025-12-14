export class TSRelationshipPicker extends HTMLElement {
    constructor() {
        super();
        this.selectedItems = [];
        this.availableItems = []; // Mock data source
        this.mode = 'single'; // 'single' or 'multiple'
        this.targetEntity = '';
        this.displayFields = [];
        this.chipDisplayFields = []; // Fields to show in selected chips
        this.valueField = 'id';
        this.label = '';
    }

    static get observedAttributes() {
        return ['mode', 'target-entity', 'display-fields', 'chip-display-fields', 'value-field', 'value', 'label', 'options'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        if (name === 'mode') this.mode = newValue;
        if (name === 'target-entity') this.targetEntity = newValue;
        if (name === 'display-fields') {
            try {
                this.displayFields = JSON.parse(newValue);
            } catch (e) {
                this.displayFields = [newValue];
            }
        }
        if (name === 'chip-display-fields') {
            try {
                this.chipDisplayFields = JSON.parse(newValue);
            } catch (e) {
                this.chipDisplayFields = [newValue];
            }
        }
        if (name === 'value-field') this.valueField = newValue;
        if (name === 'label') {
            this.label = newValue;
            this.render(); // Re-render to show label
        }
        if (name === 'options') {
            try {
                this.availableItems = JSON.parse(newValue);
                // Re-evaluate value if options loaded after value
                this.updateSelectedFromValue();
            } catch (e) {
                console.error('Failed to parse options for relationship picker:', e);
                this.availableItems = [];
            }
        }
        if (name === 'value') {
            this.updateSelectedFromValue();
        }
    }

    updateSelectedFromValue() {
        const valAttr = this.getAttribute('value');
        if (!valAttr) return;

        let val;
        try {
            val = JSON.parse(valAttr);
        } catch (e) {
            val = valAttr;
        }

        if (this.mode === 'single') {
            const item = this.availableItems.find(i => i[this.valueField] == val);
            if (item) {
                this.selectedItems = [item];
            }
        } else {
            if (Array.isArray(val)) {
                this.selectedItems = this.availableItems.filter(i => val.includes(i[this.valueField]));
            }
        }
        this.renderSelectedItems();
    }

    connectedCallback() {
        this.render();

        // Add ResizeObserver with debouncing to prevent loop errors
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            this.resizeTimeout = setTimeout(() => {
                this.updateVisibleChips();
            }, 10);
        });

        // We need to observe the container, but it might not be created yet if render() hasn't run.
        // render() creates this.selectedContainer.
        if (this.selectedContainer) {
            this.resizeObserver.observe(this.selectedContainer);
        }
    }

    disconnectedCallback() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    render() {
        this.innerHTML = '';
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                font-family: var(--sl-font-sans);
                width: 100%;
                max-width: 100%;
            }
            .picker-container {
                display: flex;
                flex-direction: column;
                gap: var(--sl-spacing-2x-small);
                width: 100%; /* Constrain parent width */
                max-width: 100%;
            }
            .label {
                font-size: var(--sl-input-label-font-size-medium);
                font-weight: var(--sl-font-weight-semibold);
                color: var(--sl-input-label-color);
            }
            .selected-items {
                display: flex;
                flex-wrap: nowrap; /* Prevent wrapping to second line */
                gap: 0.5rem;
                height: 2.5rem; /* Fixed height */
                width: 100%; /* Prevent horizontal expansion */
                max-width: 100%; /* Enforce width limit */
                min-width: 0; /* Allow shrinking below content size */
                box-sizing: border-box; /* Include padding in width */
                padding: 0.5rem;
                border: 1px solid var(--sl-input-border-color);
                border-radius: var(--sl-input-border-radius-medium);
                background: var(--sl-input-background-color);
                cursor: pointer;
                transition: var(--sl-transition-fast) border-color, var(--sl-transition-fast) box-shadow;
                overflow: hidden;
                align-items: center; /* Vertically center all content */
            }
            .selected-items sl-tag {
                flex-shrink: 0; /* Prevent tags from shrinking */
            }
            .selected-items:hover {
                border-color: var(--sl-input-border-color-hover);
            }
            .selected-items:focus-within {
                border-color: var(--sl-color-primary-500);
                box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-input-focus-ring-color);
            }
            .selected-items.empty {
                color: var(--sl-input-placeholder-color);
                font-size: var(--sl-font-size-medium);
            }
            .selected-items::after {
                content: none;
            }
            .picker-icon {
                font-size: var(--sl-font-size-medium);
                color: var(--sl-color-neutral-500);
            }
            .picker-icon.clear-icon {
                cursor: pointer;
                color: var(--sl-color-neutral-400);
                margin-right: 0.25rem;
                transition: color 0.2s;
            }
            .picker-icon.clear-icon:hover {
                color: var(--sl-color-danger-500);
            }
            .picker-controls {
                display: flex;
                align-items: center;
                margin-left: auto; /* Push to right */
                flex-shrink: 0;
                padding-right: var(--sl-spacing-small);
            }
            .search-results {
                margin-top: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                max-height: 300px;
                overflow-y: auto;
            }
            .results-table {
                width: 100%;
                border-collapse: collapse;
                font-size: var(--sl-font-size-small);
            }
            .results-table tr {
                border-bottom: 1px solid var(--sl-color-neutral-200);
                cursor: pointer;
                transition: background-color 0.1s;
            }
            .results-table tr:last-child {
                border-bottom: none;
            }
            .results-table tr:hover {
                background-color: var(--sl-color-primary-50);
            }
            .results-table tr.selected {
                background-color: var(--sl-color-primary-100);
            }
            .results-table td {
                padding: 0.5rem;
                text-align: left;
            }
            .results-table td.icon-cell {
                width: auto;
                text-align: right;
                padding-right: 1rem;
            }
        `;
        this.appendChild(style);

        const container = document.createElement('div');
        container.className = 'picker-container';

        if (this.label) {
            const labelEl = document.createElement('label');
            labelEl.className = 'label';
            labelEl.textContent = this.label;
            container.appendChild(labelEl);
        }

        const selectedContainer = document.createElement('div');
        selectedContainer.className = 'selected-items';
        selectedContainer.addEventListener('click', (e) => {
            if (e.target.closest('sl-tag')) return;
            if (e.target.closest('.clear-icon')) return; // Ignore clear button click
            this.openDialog();
        });

        this.selectedContainer = selectedContainer;
        this.renderSelectedItems();

        container.appendChild(selectedContainer);
        this.appendChild(container);

        if (this.resizeObserver) {
            this.resizeObserver.observe(this.selectedContainer);
        }
    }

    renderSelectedItems() {
        // Clear content but keep visibility logic if needed
        this.selectedContainer.innerHTML = '';
        this.selectedContainer.classList.remove('empty');

        // Wrapper for tags to separate them from controls
        // Actually, we can just append tags and then the controls div which has margin-left: auto

        if (this.selectedItems.length === 0) {
            const placeholder = document.createElement('span');
            placeholder.textContent = 'Žádné položky nevybrány';
            placeholder.style.color = 'var(--sl-input-placeholder-color)';
            this.selectedContainer.appendChild(placeholder);
            this.selectedContainer.classList.add('empty');
        } else {
            this.selectedItems.forEach(item => {
                const tag = document.createElement('sl-tag');
                tag.variant = 'primary';
                tag.removable = true;
                tag.size = 'medium';

                // Use chipDisplayFields if available, otherwise fallback to displayFields
                const fieldsToShow = (this.chipDisplayFields && this.chipDisplayFields.length > 0)
                    ? this.chipDisplayFields
                    : this.displayFields.slice(0, 1);

                const displayText = fieldsToShow.map(field => item[field]).join(' - ');
                tag.textContent = displayText;

                tag.addEventListener('sl-remove', (e) => {
                    e.stopPropagation();
                    this.removeItem(item);
                });

                this.selectedContainer.appendChild(tag);
            });
        }

        // Controls Container (Clear + Chevron)
        const controls = document.createElement('div');
        controls.className = 'picker-controls';

        // Clear Button (only if items selected)
        if (this.selectedItems.length > 0) {
            const clearBtn = document.createElement('sl-icon');
            clearBtn.name = 'x-circle-fill';
            clearBtn.className = 'picker-icon clear-icon';
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedItems = [];
                this.renderSelectedItems();
                this.dispatchChange();
            });
            controls.appendChild(clearBtn);
        }

        // Chevron
        const chevron = document.createElement('sl-icon');
        chevron.name = 'chevron-down';
        chevron.className = 'picker-icon';
        controls.appendChild(chevron);

        this.selectedContainer.appendChild(controls);

        // Update visible chips logic if needed (only if items > 0)
        if (this.selectedItems.length > 0) {
            customElements.whenDefined('sl-tag').then(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this.updateVisibleChips();
                    });
                });
            });
        }
    }

    updateVisibleChips() {
        if (!this.selectedContainer || this.selectedItems.length === 0) return;

        const tags = Array.from(this.selectedContainer.querySelectorAll('sl-tag:not(.summary-tag)'));
        const existingSummary = this.selectedContainer.querySelector('.summary-tag');
        if (existingSummary) existingSummary.remove();

        // Reset all tags to visible
        tags.forEach(tag => tag.style.display = '');

        if (tags.length === 0) return;

        // Get container width (excluding padding)
        const containerStyle = window.getComputedStyle(this.selectedContainer);
        const paddingLeft = parseFloat(containerStyle.paddingLeft);
        const paddingRight = parseFloat(containerStyle.paddingRight);

        // Get gap from computed style or default to 8px
        const gapStr = containerStyle.gap || '8px';
        const gap = parseFloat(gapStr) || 8;

        // Get controls width
        const controls = this.selectedContainer.querySelector('.picker-controls');
        let controlsWidth = 0;
        if (controls) {
            controlsWidth = controls.getBoundingClientRect().width;
        }

        // Calculate available width: Container - Padding - Controls - Gap (if controls exist) - Safety Margin
        let availableWidth = this.selectedContainer.clientWidth - paddingLeft - paddingRight - 2;

        if (controlsWidth > 0) {
            availableWidth -= (controlsWidth + gap);
        }

        // Calculate total width of all tags
        let totalWidth = 0;
        const tagWidths = tags.map(tag => {
            // Use ceil to be safe with sub-pixels
            const w = Math.ceil(tag.getBoundingClientRect().width);
            totalWidth += w + gap;
            return w;
        });
        totalWidth -= gap; // Remove last gap

        // If everything fits, we're done
        if (totalWidth <= availableWidth) return;

        // Create summary tag to measure it
        const summary = document.createElement('sl-tag');
        summary.className = 'summary-tag';
        summary.variant = 'neutral';
        summary.size = 'medium';
        summary.style.cursor = 'pointer';
        summary.style.flexShrink = '0';
        summary.textContent = `A další, celkem (${tags.length})`;

        // Temporarily append to measure
        summary.style.visibility = 'hidden';
        summary.style.position = 'absolute';
        this.selectedContainer.appendChild(summary);

        // Add extra buffer to summary width just in case
        let summaryWidth = Math.ceil(summary.getBoundingClientRect().width);

        // Fallback if summary width is suspiciously small (e.g. not upgraded/rendered yet)
        if (summaryWidth < 20) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const style = window.getComputedStyle(this.selectedContainer);
            context.font = style.font; // Inherit font from container
            const textWidth = context.measureText(summary.textContent).width;
            // Add generous padding for the tag (approx 32px for padding + border)
            summaryWidth = Math.ceil(textWidth) + 32;
        } else {
            summaryWidth += 4; // Small buffer for rendered tag
        }

        summary.remove();
        summary.style.visibility = '';
        summary.style.position = '';

        summary.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDialog();
        });

        // Calculate how many tags fit with summary
        let currentWidth = summaryWidth + gap;
        let visibleCount = 0;

        for (let i = 0; i < tagWidths.length; i++) {
            if (currentWidth + tagWidths[i] <= availableWidth) {
                currentWidth += tagWidths[i] + gap;
                visibleCount++;
            } else {
                break;
            }
        }

        // Hide tags that don't fit
        for (let i = 0; i < tags.length; i++) {
            tags[i].style.display = (i < visibleCount) ? '' : 'none';
        }

        // Insert summary
        if (visibleCount < tags.length) {
            if (visibleCount > 0) {
                const insertAfter = tags[visibleCount - 1];
                if (insertAfter.nextSibling) {
                    this.selectedContainer.insertBefore(summary, insertAfter.nextSibling);
                } else {
                    this.selectedContainer.appendChild(summary);
                }
            } else {
                this.selectedContainer.insertBefore(summary, this.selectedContainer.firstChild);
            }
        }
    }

    removeItem(item) {
        this.selectedItems = this.selectedItems.filter(i => i[this.valueField] !== item[this.valueField]);
        this.renderSelectedItems();
        this.dispatchChange();
    }

    addItem(item) {
        if (this.mode === 'single') {
            this.selectedItems = [item];
        } else {
            if (!this.selectedItems.find(i => i[this.valueField] === item[this.valueField])) {
                this.selectedItems.push(item);
            }
        }
        this.renderSelectedItems();
        this.dispatchChange();
    }

    dispatchChange() {
        const value = this.mode === 'single'
            ? (this.selectedItems[0] ? this.selectedItems[0][this.valueField] : null)
            : this.selectedItems.map(i => i[this.valueField]);

        this.dispatchEvent(new CustomEvent('sl-change', {
            detail: {
                value: value,
                items: this.selectedItems
            },
            bubbles: true,
            composed: true
        }));
    }

    openDialog() {
        const dialog = document.createElement('sl-dialog');
        dialog.label = `Vybrat ${this.targetEntity}`;
        dialog.style.setProperty('--width', '600px');
        dialog.style.fontFamily = 'var(--sl-font-sans)'; // Ensure header and content use sans-serif

        const content = document.createElement('div');

        const searchInput = document.createElement('sl-input');
        searchInput.placeholder = 'Hledat...';
        searchInput.clearable = true;
        searchInput.addEventListener('sl-input', (e) => this.filterResults(e.target.value, resultsContainer, dialog));

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';

        content.appendChild(searchInput);
        content.appendChild(resultsContainer);

        dialog.appendChild(content);

        const footer = document.createElement('div');
        footer.slot = 'footer';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.alignItems = 'center';
        footer.style.width = '100%';

        const closeBtn = document.createElement('sl-button');
        closeBtn.textContent = 'Zavřít';
        closeBtn.addEventListener('click', () => dialog.hide());

        footer.appendChild(closeBtn);
        dialog.appendChild(footer);

        document.body.appendChild(dialog);

        // Initial render of results
        this.filterResults('', resultsContainer, dialog);

        // Use requestAnimationFrame to ensure element is in DOM before opening
        requestAnimationFrame(() => {
            dialog.open = true;
        });

        dialog.addEventListener('sl-after-show', () => {
            searchInput.focus();
        });

        dialog.addEventListener('sl-after-hide', () => dialog.remove());
    }

    filterResults(query, container, dialog) {
        container.innerHTML = '';
        const lowerQuery = query.toLowerCase();

        const filtered = this.availableItems.filter(item => {
            return this.displayFields.some(field =>
                String(item[field]).toLowerCase().includes(lowerQuery)
            );
        });

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--sl-color-neutral-500); padding: 1rem;">Žádné výsledky</div>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'results-table';
        table.style.fontFamily = 'var(--sl-font-sans)'; // Ensure sans-serif font
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = 'var(--sl-font-size-small)';

        filtered.forEach(item => {
            const row = document.createElement('tr');

            const isSelected = this.selectedItems.some(i => i[this.valueField] === item[this.valueField]);
            if (isSelected) row.classList.add('selected');

            // Render each display field as a cell
            this.displayFields.forEach((field, index) => {
                const cell = document.createElement('td');
                cell.textContent = item[field];

                // Apply compact styling to all but the last data column
                if (index < this.displayFields.length - 1) {
                    cell.style.width = '1%';
                    cell.style.whiteSpace = 'nowrap';
                }

                row.appendChild(cell);
            });

            // Icon cell
            const iconCell = document.createElement('td');
            iconCell.className = 'icon-cell';
            const actionIcon = document.createElement('sl-icon');
            actionIcon.name = isSelected ? 'check-circle-fill' : 'circle';
            actionIcon.style.color = isSelected ? 'var(--sl-color-success-500)' : 'var(--sl-color-neutral-400)';
            iconCell.appendChild(actionIcon);
            row.appendChild(iconCell);

            row.addEventListener('click', () => {
                if (this.mode === 'single') {
                    // Allow unselect in single mode by clicking on selected item
                    const currentlySelected = this.selectedItems.some(i => i[this.valueField] === item[this.valueField]);

                    if (currentlySelected) {
                        // Clicking on already selected item = unselect
                        this.selectedItems = [];
                        this.renderSelectedItems();
                        this.dispatchChange();
                        if (dialog) dialog.hide();
                    } else {
                        // Clicking on unselected item = select
                        this.addItem(item);
                        if (dialog) dialog.hide();
                    }
                } else {
                    // Recalculate isSelected state dynamically
                    const currentlySelected = this.selectedItems.some(i => i[this.valueField] === item[this.valueField]);

                    if (currentlySelected) {
                        this.removeItem(item);
                        row.classList.remove('selected');
                        actionIcon.name = 'circle';
                        actionIcon.style.color = 'var(--sl-color-neutral-400)';
                    } else {
                        this.addItem(item);
                        row.classList.add('selected');
                        actionIcon.name = 'check-circle-fill';
                        actionIcon.style.color = 'var(--sl-color-success-500)';
                    }
                }
            });

            table.appendChild(row);
        });

        container.appendChild(table);
    }
}

customElements.define('ts-relationship-picker', TSRelationshipPicker);
