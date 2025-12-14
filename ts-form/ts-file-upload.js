export class TSFileUpload extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.files = [];
        this.multiple = false;
        this.accept = '*';
        this.label = 'Nahrát soubory';
    }

    static get observedAttributes() {
        return ['multiple', 'accept', 'label', 'inner-label', 'value', 'error', 'required'];
    }

    get required() {
        return this.hasAttribute('required');
    }

    set required(val) {
        if (val) {
            this.setAttribute('required', '');
        } else {
            this.removeAttribute('required');
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'multiple') {
            this.multiple = newValue !== null && newValue !== 'false';
        } else if (name === 'accept') {
            this.accept = newValue || '*';
        } else if (name === 'label') {
            this.label = newValue;
        } else if (name === 'inner-label') {
            this.innerLabel = newValue;
        } else if (name === 'value') {
            // Handle initial value if needed (e.g. existing files)
        } else if (name === 'error') {
            this.error = newValue;
            this.updateError();
        } else if (name === 'required') {
            // Just re-render to show/hide asterisk
            if (this.hasRendered) this.render();
        }

        if (this.hasRendered) {
            if (name === 'multiple') {
                this.updateUploadText();
            } else if (name === 'label' || name === 'inner-label') {
                this.render(); // Re-render for label change is safer as it affects multiple places
            }
        } else {
            this.render();
        }
    }
    // ... (skip to render method part)
    // Since I can't skip nicely in one replace block for non-contiguous changes, I will use multi_replace for this file actually.
    // Wait, I should use multi_replace_file_content as per instructions for non-contiguous edits.
    // Canceling this tool call to use multi_replace_file_content.

    updateError() {
        if (!this.errorContainer) return;
        this.errorContainer.textContent = this.error || '';
        this.errorContainer.style.display = this.error ? 'block' : 'none';

        if (this.error) {
            this.classList.add('input-invalid');
        } else {
            this.classList.remove('input-invalid');
        }
    }

    connectedCallback() {
        this.render(); // Always render on connect, subsequent renders are handled by attributeChangedCallback or explicit calls
        if (!this.hasListeners) {
            this.setupEventListeners();
            this.hasListeners = true;
        }
        this.updateError();
    }

    setupEventListeners() {
        this.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.classList.add('drag-over');
        });

        this.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.classList.remove('drag-over');
        });

        this.addEventListener('drop', (e) => {
            e.preventDefault();
            this.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
    }

    // ... (rest of methods)

    // ... handleFiles, removeFile, etc ... (skipping to render)
    // Wait, I can't skip in replace_file_content if I want to update render too.
    // I am replacing connectedCallback AND setupEventListeners AND render needs modification.
    // They are far apart? connectedCallback is line 71. render is 162.
    // I should use multi_replace.


    handleFiles(fileList) {
        const newFiles = Array.from(fileList);
        if (this.multiple) {
            this.files = [...this.files, ...newFiles];
        } else {
            this.files = [newFiles[0]];
        }
        this.renderFileList();
        this.dispatchChange();
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.renderFileList();
        this.dispatchChange();
    }

    downloadFile(index) {
        const file = this.files[index];
        const a = document.createElement('a');

        if (file instanceof File) {
            a.href = URL.createObjectURL(file);
        } else if (file.data) {
            // Assume base64 data URI
            a.href = file.data;
        } else {
            return;
        }

        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (file instanceof File) {
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
    }

    set value(val) {
        if (!val) {
            this.files = [];
        } else if (Array.isArray(val)) {
            this.files = val;
        } else {
            this.files = [val];
        }
        this.renderFileList();
    }

    get value() {
        return this.files;
    }

    dispatchChange() {
        this.dispatchEvent(new CustomEvent('sl-change', {
            detail: {
                files: this.files
            },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        // Removed guard to allow re-rendering
        this.hasRendered = true;

        this.shadowRoot.innerHTML = '';
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                font-family: var(--sl-font-sans);
            }
            .drop-zone {
                border: 2px dashed var(--sl-color-neutral-300);
                border-radius: var(--sl-border-radius-medium);
                padding: 2rem;
                text-align: center;
                cursor: pointer;
                transition: border-color 0.2s, background-color 0.2s;
                background: var(--sl-color-neutral-0);
            }
            .drop-zone:hover {
                border-color: var(--sl-color-primary-500);
                background: var(--sl-color-primary-50);
            }
            :host(.drag-over) .drop-zone {
                border-color: var(--sl-color-primary-600);
                background: var(--sl-color-primary-100);
            }
            :host(.input-invalid) .drop-zone {
                border-color: var(--sl-color-danger-500);
            }
            .file-upload-label {
                display: block;
                margin-bottom: var(--sl-spacing-2x-small);
                font-size: var(--sl-input-label-font-size-medium);
                font-weight: var(--sl-font-weight-semibold);
                color: var(--sl-input-label-color);
            }
            :host(.input-invalid) .file-upload-label {
                color: var(--sl-color-danger-700);
            }
            .error-message {
                color: var(--sl-color-danger-500);
                font-size: var(--sl-font-size-small);
                margin-top: var(--sl-spacing-2x-small);
                display: none;
            }
            .file-list:not(:empty) {
                margin-top: 1rem;
            }
            .file-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .file-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.5rem;
                background: var(--sl-color-neutral-100);
                border-radius: var(--sl-border-radius-small);
                font-size: var(--sl-font-size-small);
            }
            .file-info {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                overflow: hidden;
            }
            .file-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .upload-icon {
                font-size: 2rem;
                color: var(--sl-color-neutral-400);
                margin-bottom: 0.5rem;
            }
            input[type="file"] {
                display: none;
            }
        `;
        this.shadowRoot.appendChild(style);

        const container = document.createElement('div');

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = this.multiple;
        input.accept = this.accept;
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
            input.value = ''; // Reset to allow selecting same file again
        });

        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.innerHTML = `
            <div class="upload-icon">
                <sl-icon name="cloud-upload"></sl-icon>
            </div>
            <div>${this.innerLabel || this.label}</div>
            <div class="upload-text" style="font-size: 0.8em; color: var(--sl-color-neutral-500); margin-top: 0.25rem;">
                ${this.multiple ? 'Přetáhněte soubory sem nebo klikněte pro nahrání' : 'Přetáhněte soubor sem nebo klikněte pro nahrání'}
            </div>
        `;
        dropZone.addEventListener('click', () => input.click());

        if (this.label) {
            const labelEl = document.createElement('label');
            labelEl.innerHTML = this.label + (this.required ? ' <span>*</span>' : '');
            labelEl.className = 'file-upload-label';
            labelEl.setAttribute('part', 'label');
            container.appendChild(labelEl);
        }

        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        this.errorContainer = errorContainer;

        const fileListContainer = document.createElement('div');
        fileListContainer.className = 'file-list';
        this.fileListContainer = fileListContainer;

        container.appendChild(input);
        container.appendChild(dropZone);
        container.appendChild(errorContainer); // Insert error between dropZone and fileList
        container.appendChild(fileListContainer);
        this.shadowRoot.appendChild(container);

        this.updateError();
        this.renderFileList(); // Ensure any existing files are rendered
    }

    renderFileList() {
        if (!this.fileListContainer) return;
        this.fileListContainer.innerHTML = '';

        this.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';

            const info = document.createElement('div');
            info.className = 'file-info';

            const icon = document.createElement('sl-icon');
            icon.name = 'file-earmark';

            const name = document.createElement('span');
            name.className = 'file-name';
            name.textContent = file.name;

            const size = document.createElement('span');
            size.style.color = 'var(--sl-color-neutral-500)';
            size.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;

            info.appendChild(icon);
            info.appendChild(name);
            info.appendChild(size);

            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '0.25rem';

            const downloadBtn = document.createElement('sl-icon-button');
            downloadBtn.name = 'cloud-download';
            downloadBtn.label = 'Stáhnout';
            downloadBtn.dataset.index = index; // verified attribute
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadFile(index);
            });

            const removeBtn = document.createElement('sl-icon-button');
            removeBtn.name = 'x';
            removeBtn.label = 'Odstranit';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(index);
            });

            actionsDiv.appendChild(downloadBtn);
            actionsDiv.appendChild(removeBtn);

            item.appendChild(info);
            item.appendChild(actionsDiv);
            this.fileListContainer.appendChild(item);
        });
    }

    updateUploadText() {
        const textEl = this.shadowRoot.querySelector('.upload-text');
        if (textEl) {
            textEl.textContent = this.multiple
                ? 'Přetáhněte soubory sem nebo klikněte pro nahrání'
                : 'Přetáhněte soubor sem nebo klikněte pro nahrání';
        }
        const input = this.shadowRoot.querySelector('input[type="file"]');
        if (input) {
            input.multiple = this.multiple;
        }
    }
}

customElements.define('ts-file-upload', TSFileUpload);
