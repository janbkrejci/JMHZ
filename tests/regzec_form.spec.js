import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load Generated Scenarios
const scenarios = require('./test_scenarios.json');

// File Fields to handle specially during validation
const fileFields = ['999102', '999103', '999104', '999146', '999145', '999105'];

async function fillForm(page, data) {
    const tabs = page.locator('sl-tab:not([disabled])');
    const tabCount = await tabs.count();

    for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        await tab.click();
        await page.waitForTimeout(1000); // Wait for Shoelace tab animation

        const visibleFields = await page.locator('ts-form-field:visible').all();
        console.log(`Tab ${i}: Found ${visibleFields.length} visible fields.`);

        for (const fieldWrapper of visibleFields) {
            const fieldName = await fieldWrapper.getAttribute('field-name');
            if (!fieldName) continue;

            if (data.hasOwnProperty(fieldName)) {
                // console.log(`Filling ${fieldName}`);
                const value = data[fieldName];

                // Special Handling for Files
                const fileUpload = fieldWrapper.locator('ts-file-upload');
                if (await fileUpload.count() > 0) {
                    const fileInput = fieldWrapper.locator('input[type="file"]');
                    if (await fileInput.count() > 0) {
                        await fileInput.setInputFiles({
                            name: 'test.txt',
                            mimeType: 'text/plain',
                            buffer: Buffer.from('This is a test file content')
                        });
                    }
                    continue;
                }

                // Standard Fields
                await fieldWrapper.evaluate((el, val) => {
                    if ('value' in el) {
                        el.value = val;
                    }
                    el.dispatchEvent(new CustomEvent('field-change', {
                        detail: { field: el.getAttribute('field-name'), value: val },
                        bubbles: true
                    }));
                }, value);
            }
        }
    }
}

function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

async function runTestFlow(page, scenarioData, testInfo) {
    await page.goto('http://localhost:8000/docs/new_regzec_form.html');
    await expect(page.locator('ts-form')).toBeVisible();

    const checkBtn = page.locator('sl-button', { hasText: 'Zkontrolovat data' });

    // 1. Fill Form
    console.log(`[${scenarioData['999101'] || 'Unknown'}] Filling form... Keys in dataset: ${Object.keys(scenarioData).length}`);
    await fillForm(page, scenarioData);

    // 2. Check Data
    if (await checkBtn.isVisible()) {
        await checkBtn.click();
        await page.waitForTimeout(1000);

        // Log errors if any
        const form = page.locator('ts-form');
        const errors = await form.getAttribute('errors');
        if (errors && errors !== '{}') {
            console.log("Validation Errors:", errors);
        }
    }

    // 3. Save 1
    const saveBtn = page.locator('sl-button', { hasText: 'Uložit dotazník' });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    const downloadPromise1 = page.waitForEvent('download');
    await saveBtn.click();
    const download1 = await downloadPromise1;

    // Save Download 1
    const safeTitle = testInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const saveDir = path.join(__dirname, '..', 'test-results', 'downloads', testInfo.project.name);
    if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
    }
    const filename1 = `${safeTitle}_step1.json`;
    await download1.saveAs(path.join(saveDir, filename1));
    console.log(`Saved download 1 to ${path.join(testInfo.project.name, filename1)}`);

    const result1String = await streamToString(await download1.createReadStream());
    const result1 = JSON.parse(result1String);

    console.log("Save 1 successful.");

    // 4. Reload (Open Empty)
    await page.goto('http://localhost:8000/docs/new_regzec_form.html');
    await expect(page.locator('ts-form')).toBeVisible();

    // 5. Import Data
    console.log("Importing data...");
    // Trigger file chooser via "Načíst data" button
    // The button likely triggers an input. If ts-form handles it, it might create a hidden input.
    // We can try waiting for filechooser when clicking the button.
    const importBtn = page.locator('sl-button[label="Načíst data"]').or(page.locator('sl-button', { hasText: 'Načíst data' })).first();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await importBtn.click();
    const fileChooser = await fileChooserPromise;

    // Create a temporary file to upload (reusing the downloaded content)
    // Or just pass buffer? setFiles accepts buffer.
    await fileChooser.setFiles({
        name: 'import.json',
        mimeType: 'application/json',
        buffer: Buffer.from(result1String)
    });

    await page.waitForTimeout(1000); // Wait for import parse

    // 6. Check Data again
    if (await checkBtn.isVisible()) {
        await checkBtn.click();
        await page.waitForTimeout(1000);
    }

    // 7. Save 2
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    const downloadPromise2 = page.waitForEvent('download');
    await saveBtn.click();
    const download2 = await downloadPromise2;

    // Save Download 2
    const filename2 = `${safeTitle}_step2.json`;
    await download2.saveAs(path.join(saveDir, filename2));
    console.log(`Saved download 2 to ${path.join(testInfo.project.name, filename2)}`);

    const result2String = await streamToString(await download2.createReadStream());
    const result2 = JSON.parse(result2String);

    console.log("Save 2 successful.");

    // 8. Verify Both Files Match Scenario Data
    // Prepare Expected Data
    const expectedData = { ...scenarioData };
    fileFields.forEach(f => delete expectedData[f]);

    // Validation Function
    const validate = (res, label) => {
        expect(res, `${label} match failed`).toMatchObject(expect.objectContaining(expectedData));

        fileFields.forEach(f => {
            // Only check if we EXPECTED a file (implicit mode might skip if input data skipped it)
            // But fillForm ALWAYS fills files if logic triggers.
            // Wait, fillForm logic: `if (data.hasOwnProperty(fieldName))`
            // If Implicit mode skips key, fillForm skips file upload.
            // So result won't have file?
            // Actually `generate_scenarios.py` keeps file keys (no default value usually).
            // So they act as normal fields.

            if (scenarioData.hasOwnProperty(f)) {
                const fileVal = res[f];
                expect(fileVal, `${label} file ${f} missing`).toBeDefined();
                if (Array.isArray(fileVal)) {
                    expect(fileVal.length).toBeGreaterThan(0);
                    expect(fileVal[0]._is_file).toBe(true);
                } else {
                    expect(fileVal._is_file).toBe(true);
                }
            }
        });
    };

    validate(result1, "Result 1");
    validate(result2, "Result 2");

    // Verify Consistency between 1 and 2
    expect(result1).toEqual(result2);
}

test.describe('RegZec Form Scenarios', () => {
    test.setTimeout(180000); // Increased timeout for long workflow

    for (const scenario of scenarios) {
        test(`Scenario: ${scenario.label}`, async ({ page }, testInfo) => {
            await runTestFlow(page, scenario.data, testInfo);
        });
    }
});
