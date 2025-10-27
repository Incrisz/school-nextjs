const gradeState = {
    scales: [],
    selectedScaleId: '',
    deletedRangeIds: new Set(),
};

const gradeEls = {};

document.addEventListener('DOMContentLoaded', async () => {
    cacheGradeElements();
    bindGradeEvents();
    await loadGradeScales();
});

function cacheGradeElements() {
    gradeEls.scaleSelect = document.getElementById('grade-scale-select');
    gradeEls.tableBody = document.getElementById('grade-range-table');
    gradeEls.addButton = document.getElementById('add-grade-row');
    gradeEls.saveButton = document.getElementById('save-grade-scale');
    gradeEls.info = document.getElementById('grade-scale-info');
    gradeEls.error = document.getElementById('grade-scale-error');
}

function bindGradeEvents() {
    if (gradeEls.scaleSelect) {
        gradeEls.scaleSelect.addEventListener('change', () => {
            gradeState.selectedScaleId = gradeEls.scaleSelect.value;
            gradeState.deletedRangeIds.clear();
            renderGradeRanges();
        });
    }

    if (gradeEls.addButton) {
        gradeEls.addButton.addEventListener('click', (event) => {
            event.preventDefault();
            addEmptyGradeRow();
        });
    }

    if (gradeEls.saveButton) {
        gradeEls.saveButton.addEventListener('click', async (event) => {
            event.preventDefault();
            await saveGradeRanges();
        });
    }
}

async function loadGradeScales() {
    showGradeInfo('Loading grading scales...');
    clearGradeError();
    try {
        const response = await fetch(`${backend_url}/api/v1/grades/scales`, {
            headers: gradeAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error('Failed to load grading scales.');
        }
        const payload = await response.json();
        gradeState.scales = Array.isArray(payload.data) ? payload.data : [];
        populateScaleSelect();
        renderGradeRanges();
        clearGradeInfo();
    } catch (error) {
        console.error(error);
        showGradeError(error.message);
    }
}

function populateScaleSelect() {
    if (!gradeEls.scaleSelect) return;
    if (!gradeState.scales.length) {
        gradeEls.scaleSelect.innerHTML = '<option value="">No grading scale available</option>';
        return;
    }

    const options = gradeState.scales.map((scale) => {
        return `<option value="${scale.id}">${escapeHtml(scale.name)}</option>`;
    });
    gradeEls.scaleSelect.innerHTML = options.join('');

    if (!gradeState.selectedScaleId) {
        gradeState.selectedScaleId = gradeState.scales[0].id;
    }
    gradeEls.scaleSelect.value = gradeState.selectedScaleId;
}

function getSelectedScale() {
    return gradeState.scales.find((scale) => scale.id === gradeState.selectedScaleId) || null;
}

function renderGradeRanges() {
    if (!gradeEls.tableBody) return;
    const scale = getSelectedScale();
    gradeEls.tableBody.innerHTML = '';

    if (!scale) {
        gradeEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No grading scale selected.</td></tr>';
        return;
    }

    if (!Array.isArray(scale.grade_ranges) || !scale.grade_ranges.length) {
        gradeEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No grade ranges defined.</td></tr>';
        return;
    }

    const rows = scale.grade_ranges
        .slice()
        .sort((a, b) => a.min_score - b.min_score)
        .map((range) => createGradeRow(range));

    gradeEls.tableBody.innerHTML = rows.join('');
    attachRowEvents();
}

function createGradeRow(range) {
    const idAttr = range.id ? `data-id="${range.id}"` : '';
    const label = range.grade_label || '';
    const min = range.min_score ?? '';
    const max = range.max_score ?? '';
    const description = range.description ?? '';
    const gradePoint = range.grade_point ?? '';
    const removable = !range.locked;

    return `
        <tr ${idAttr}>
            <td>
                <input type="text" class="form-control grade-label-input" value="${escapeHtml(label)}" maxlength="50" required>
            </td>
            <td>
                <input type="number" class="form-control min-score-input" value="${escapeHtml(String(min))}" min="0" max="100" step="1" required>
            </td>
            <td>
                <input type="number" class="form-control max-score-input" value="${escapeHtml(String(max))}" min="0" max="100" step="1" required>
            </td>
            <td>
                <textarea class="form-control description-input" maxlength="255">${escapeHtml(description)}</textarea>
            </td>
            <td>
                <input type="number" class="form-control grade-point-input" value="${escapeHtml(String(gradePoint))}" min="0" max="10" step="0.01">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger delete-grade-row" ${removable ? '' : 'disabled'}>
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function addEmptyGradeRow() {
    if (!gradeEls.tableBody) return;

    const tempId = `new-${Date.now()}`;
    const rowHtml = `
        <tr data-temp-id="${tempId}">
            <td>
                <input type="text" class="form-control grade-label-input" placeholder="Grade label" maxlength="50" required>
            </td>
            <td>
                <input type="number" class="form-control min-score-input" placeholder="Min" min="0" max="100" step="1" required>
            </td>
            <td>
                <input type="number" class="form-control max-score-input" placeholder="Max" min="0" max="100" step="1" required>
            </td>
            <td>
                <textarea class="form-control description-input" maxlength="255" placeholder="Description"></textarea>
            </td>
            <td>
                <input type="number" class="form-control grade-point-input" placeholder="Point" min="0" max="10" step="0.01">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger delete-grade-row">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;

    if (!gradeEls.tableBody.querySelector('tr td')) {
        gradeEls.tableBody.innerHTML = rowHtml;
    } else {
        gradeEls.tableBody.insertAdjacentHTML('beforeend', rowHtml);
    }

    attachRowEvents();
}

function attachRowEvents() {
    if (!gradeEls.tableBody) return;
    gradeEls.tableBody.querySelectorAll('.delete-grade-row').forEach((button) => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            if (!row) return;
            const id = row.dataset.id;
            if (id) {
                gradeState.deletedRangeIds.add(id);
            }
            row.remove();
        });
    });
}

async function saveGradeRanges() {
    clearGradeMessages();

    const scale = getSelectedScale();
    if (!scale) {
        showGradeError('Select a grading scale before saving.');
        return;
    }

    const payload = buildRangesPayload();
    if (!payload) {
        return; // error message already shown
    }

    payload.deleted_ids = Array.from(gradeState.deletedRangeIds);

    disableGradeActions(true);
    showGradeInfo('Saving grading scale...');

    try {
        const response = await fetch(`${backend_url}/api/v1/grades/scales/${scale.id}/ranges`, {
            method: 'PUT',
            headers: gradeAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = data.message || 'Unable to save grading scale.';
            throw new Error(message);
        }

        const updatedScale = data.data;
        mergeUpdatedScale(updatedScale);
        gradeState.deletedRangeIds.clear();

        renderGradeRanges();
        showGradeInfo(data.message || 'Grading scale updated successfully.');
    } catch (error) {
        console.error(error);
        showGradeError(error.message);
    } finally {
        disableGradeActions(false);
    }
}

function buildRangesPayload() {
    if (!gradeEls.tableBody) return null;

    const rows = Array.from(gradeEls.tableBody.querySelectorAll('tr'));
    if (!rows.length) {
        showGradeError('Define at least one grade range.');
        return null;
    }

    const ranges = [];
    let hasError = false;

    rows.forEach((row, index) => {
        const labelInput = row.querySelector('.grade-label-input');
        const minInput = row.querySelector('.min-score-input');
        const maxInput = row.querySelector('.max-score-input');
        const descriptionInput = row.querySelector('.description-input');
        const gradePointInput = row.querySelector('.grade-point-input');

        const label = (labelInput?.value || '').trim();
        const min = Number(minInput?.value ?? NaN);
        const max = Number(maxInput?.value ?? NaN);
        const description = (descriptionInput?.value || '').trim();
        const gradePoint = gradePointInput?.value === '' ? null : Number(gradePointInput.value);

        if (!label || Number.isNaN(min) || Number.isNaN(max)) {
            row.classList.add('table-danger');
            hasError = true;
            return;
        }

        if (min < 0 || min > 100 || max < 0 || max > 100 || min > max) {
            row.classList.add('table-danger');
            hasError = true;
            return;
        }

        row.classList.remove('table-danger');

        ranges.push({
            id: row.dataset.id || null,
            min_score: min,
            max_score: max,
            grade_label: label,
            description: description || null,
            grade_point: gradePoint,
            order_index: index,
        });
    });

    if (hasError) {
        showGradeError('Please fix the highlighted rows before saving.');
        return null;
    }

    return { ranges };
}

function mergeUpdatedScale(updatedScale) {
    if (!updatedScale) return;
    const index = gradeState.scales.findIndex((scale) => scale.id === updatedScale.id);
    if (index !== -1) {
        gradeState.scales[index] = updatedScale;
    } else {
        gradeState.scales.push(updatedScale);
    }
}

function disableGradeActions(disabled) {
    if (gradeEls.saveButton) gradeEls.saveButton.disabled = disabled;
    if (gradeEls.addButton) gradeEls.addButton.disabled = disabled;
    if (gradeEls.scaleSelect) gradeEls.scaleSelect.disabled = disabled;
}

function showGradeInfo(message) {
    if (!gradeEls.info) return;
    gradeEls.info.textContent = message;
    gradeEls.info.classList.remove('d-none');
}

function showGradeError(message) {
    if (!gradeEls.error) return;
    gradeEls.error.textContent = message;
    gradeEls.error.classList.remove('d-none');
}

function clearGradeInfo() {
    if (!gradeEls.info) return;
    gradeEls.info.textContent = '';
    gradeEls.info.classList.add('d-none');
}

function clearGradeError() {
    if (!gradeEls.error) return;
    gradeEls.error.textContent = '';
    gradeEls.error.classList.add('d-none');
}

function clearGradeMessages() {
    clearGradeInfo();
    clearGradeError();
}

function gradeAuthHeaders(extra = {}) {
    return Object.assign(
        {
            Accept: 'application/json',
            Authorization: `Bearer ${getCookie('token')}`,
        },
        extra
    );
}

function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
