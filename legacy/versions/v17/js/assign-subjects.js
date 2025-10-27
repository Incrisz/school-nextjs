function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function authHeaders(extra = {}) {
    return Object.assign(
        {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getCookie('token')}`,
        },
        extra
    );
}

function unpackCollection(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }
    if (payload && payload.data && Array.isArray(payload.data.data)) {
        return payload.data.data;
    }
    return [];
}

const subjectState = {
    subjects: [],
    classes: [],
    armsByClass: new Map(),
    sectionsByArm: new Map(),
    editingId: null,
    table: {
        page: 1,
        perPage: 10,
        search: '',
        school_class_id: '',
        class_arm_id: '',
        class_section_id: '',
    },
};

const subjectEls = {};

document.addEventListener('DOMContentLoaded', async () => {
    cacheSubjectElements();
    bindSubjectEvents();

    await Promise.all([
        loadSubjects(),
        loadClasses(),
    ]);

    populateSubjectOptions();
    populateClassOptions();

    refreshAssignments();
});

function cacheSubjectElements() {
    subjectEls.form = document.getElementById('subject-assignment-form');
    subjectEls.subjectSelect = document.getElementById('form-subject');
    subjectEls.classSelect = document.getElementById('form-class');
    subjectEls.armSelect = document.getElementById('form-arm');
    subjectEls.sectionSelect = document.getElementById('form-section');
    subjectEls.resetButton = document.getElementById('subject-assignment-reset');
    subjectEls.assignmentId = document.getElementById('assignment-id');

    subjectEls.filterSearch = document.getElementById('filter-search');
    subjectEls.filterClass = document.getElementById('filter-class');
    subjectEls.filterArm = document.getElementById('filter-arm');
    subjectEls.filterSection = document.getElementById('filter-section');
    subjectEls.filterApply = document.getElementById('filter-apply');
    subjectEls.filterReset = document.getElementById('filter-reset');

    subjectEls.tableBody = document.getElementById('subject-assignment-table');
    subjectEls.summary = document.getElementById('subject-assignment-summary');
    subjectEls.pagination = document.getElementById('subject-assignment-pagination');
}

function bindSubjectEvents() {
    if (subjectEls.classSelect) {
        subjectEls.classSelect.addEventListener('change', async () => {
            const classId = subjectEls.classSelect.value;
            await ensureArmsLoaded(classId);
            populateArmOptions(subjectEls.armSelect, classId, true);
            populateSectionOptions(subjectEls.sectionSelect, '');
        });
    }

    if (subjectEls.armSelect) {
        subjectEls.armSelect.addEventListener('change', async () => {
            const classId = subjectEls.classSelect.value;
            const armId = subjectEls.armSelect.value;
            await ensureSectionsLoaded(classId, armId);
            populateSectionOptions(subjectEls.sectionSelect, armId);
        });
    }

    if (subjectEls.resetButton) {
        subjectEls.resetButton.addEventListener('click', () => resetSubjectForm());
    }

    if (subjectEls.form) {
        subjectEls.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitSubjectAssignment();
        });
    }

    if (subjectEls.filterClass) {
        subjectEls.filterClass.addEventListener('change', async () => {
            const classId = subjectEls.filterClass.value;
            await ensureArmsLoaded(classId);
            populateArmOptions(subjectEls.filterArm, classId, false);
            populateSectionOptions(subjectEls.filterSection, '');
        });
    }

    if (subjectEls.filterArm) {
        subjectEls.filterArm.addEventListener('change', async () => {
            const classId = subjectEls.filterClass.value;
            const armId = subjectEls.filterArm.value;
            await ensureSectionsLoaded(classId, armId);
            populateSectionOptions(subjectEls.filterSection, armId);
        });
    }

    if (subjectEls.filterApply) {
        subjectEls.filterApply.addEventListener('click', (event) => {
            event.preventDefault();
            subjectState.table.search = subjectEls.filterSearch.value.trim();
            subjectState.table.school_class_id = subjectEls.filterClass.value;
            subjectState.table.class_arm_id = subjectEls.filterArm.value;
            subjectState.table.class_section_id = subjectEls.filterSection.value;
            subjectState.table.page = 1;
            refreshAssignments();
        });
    }

    if (subjectEls.filterReset) {
        subjectEls.filterReset.addEventListener('click', (event) => {
            event.preventDefault();
            if (subjectEls.filterSearch) subjectEls.filterSearch.value = '';
            if (subjectEls.filterClass) subjectEls.filterClass.value = '';
            populateArmOptions(subjectEls.filterArm, '', false);
            populateSectionOptions(subjectEls.filterSection, '');
            subjectState.table = {
                page: 1,
                perPage: 10,
                search: '',
                school_class_id: '',
                class_arm_id: '',
                class_section_id: '',
            };
            refreshAssignments();
        });
    }
}

async function loadSubjects() {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subjects?per_page=200`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load subjects.');
        }
        const payload = await response.json();
        subjectState.subjects = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function loadClasses() {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load classes.');
        }
        const payload = await response.json();
        subjectState.classes = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateSubjectOptions() {
    if (!subjectEls.subjectSelect) return;
    const options = ['<option value="">Select subject</option>']
        .concat(subjectState.subjects.map((subject) => `<option value="${subject.id}">${subject.name}${subject.code ? ` (${subject.code})` : ''}</option>`));
    subjectEls.subjectSelect.innerHTML = options.join('');
}

function populateClassOptions() {
    const formOptions = ['<option value="">Select class</option>']
        .concat(subjectState.classes.map((schoolClass) => `<option value="${schoolClass.id}">${schoolClass.name}</option>`));
    if (subjectEls.classSelect) {
        subjectEls.classSelect.innerHTML = formOptions.join('');
    }

    const filterOptions = ['<option value="">All classes</option>']
        .concat(subjectState.classes.map((schoolClass) => `<option value="${schoolClass.id}">${schoolClass.name}</option>`));
    if (subjectEls.filterClass) {
        subjectEls.filterClass.innerHTML = filterOptions.join('');
    }
}

async function ensureArmsLoaded(classId) {
    if (!classId || subjectState.armsByClass.has(classId)) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load class arms.');
        }
        const payload = await response.json();
        subjectState.armsByClass.set(classId, unpackCollection(payload));
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function ensureSectionsLoaded(classId, armId) {
    if (!classId || !armId) {
        return;
    }
    const cacheKey = `${classId}:${armId}`;
    if (subjectState.sectionsByArm.has(cacheKey)) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load class sections.');
        }
        const payload = await response.json();
        subjectState.sectionsByArm.set(cacheKey, unpackCollection(payload));
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateArmOptions(select, classId, required) {
    if (!select) return;
    const arms = classId ? (subjectState.armsByClass.get(classId) ?? []) : [];
    const placeholder = required ? 'Select class arm' : 'All class arms';
    const options = [`<option value="">${placeholder}</option>`]
        .concat(arms.map((arm) => `<option value="${arm.id}">${arm.name}</option>`));
    select.innerHTML = options.join('');
}

function populateSectionOptions(select, armId, required = false) {
    if (!select) return;
    let sections = [];
    if (armId) {
        for (const [key, value] of subjectState.sectionsByArm.entries()) {
            if (key.endsWith(`:${armId}`)) {
                sections = value;
                break;
            }
        }
    }
    const placeholder = required ? 'Select class section' : 'All sections';
    const options = [`<option value="">${placeholder}</option>`]
        .concat(sections.map((section) => `<option value="${section.id}">${section.name}</option>`));
    select.innerHTML = options.join('');
}

async function submitSubjectAssignment() {
    const payload = {
        subject_id: subjectEls.subjectSelect.value,
        school_class_id: subjectEls.classSelect.value,
        class_arm_id: subjectEls.armSelect.value,
        class_section_id: subjectEls.sectionSelect.value || null,
    };

    if (!payload.subject_id || !payload.school_class_id || !payload.class_arm_id) {
        alert('Subject, class, and class arm are required.');
        return;
    }

    const isEdit = Boolean(subjectState.editingId);
    const url = isEdit
        ? `${backend_url}/api/v1/settings/subject-assignments/${subjectState.editingId}`
        : `${backend_url}/api/v1/settings/subject-assignments`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || 'Unable to save assignment.');
        }
        alert(data.message || 'Assignment saved successfully.');
        resetSubjectForm();
        refreshAssignments();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function resetSubjectForm() {
    subjectState.editingId = null;
    if (subjectEls.assignmentId) subjectEls.assignmentId.value = '';
    if (subjectEls.form) subjectEls.form.reset();
    populateArmOptions(subjectEls.armSelect, '', true);
    populateSectionOptions(subjectEls.sectionSelect, '');
}

async function refreshAssignments() {
    if (!subjectEls.tableBody) return;
    subjectEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: subjectState.table.page,
            per_page: subjectState.table.perPage,
        });

        if (subjectState.table.search) params.append('search', subjectState.table.search);
        if (subjectState.table.school_class_id) params.append('school_class_id', subjectState.table.school_class_id);
        if (subjectState.table.class_arm_id) params.append('class_arm_id', subjectState.table.class_arm_id);
        if (subjectState.table.class_section_id) params.append('class_section_id', subjectState.table.class_section_id);

        const response = await fetch(`${backend_url}/api/v1/settings/subject-assignments?${params.toString()}`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load assignments.');
        }
        const payload = await response.json();
        renderAssignments(payload);
    } catch (error) {
        console.error(error);
        subjectEls.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
        if (subjectEls.summary) subjectEls.summary.textContent = '';
        if (subjectEls.pagination) subjectEls.pagination.innerHTML = '';
    }
}

function renderAssignments(payload) {
    const data = Array.isArray(payload.data) ? payload.data : [];
    if (!data.length) {
        subjectEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No assignments found.</td></tr>';
    } else {
        subjectEls.tableBody.innerHTML = data.map((item) => {
            const subjectName = item.subject?.name ?? 'N/A';
            const subjectCode = item.subject?.code ? ` (${item.subject.code})` : '';
            const className = item.school_class?.name ?? 'N/A';
            const armName = item.class_arm?.name ?? 'N/A';
            const sectionName = item.class_section?.name ?? 'All';
            const updatedAt = formatDateTime(item.updated_at);
            return `<tr>
                <td>${subjectName}${subjectCode}</td>
                <td>${className}</td>
                <td>${armName}</td>
                <td>${sectionName}</td>
                <td>${updatedAt}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary mr-2" data-action="edit" data-id="${item.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    subjectEls.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
        button.addEventListener('click', () => handleSubjectEdit(button.dataset.id));
    });
    subjectEls.tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => handleSubjectDelete(button.dataset.id));
    });

    const from = payload.from ?? 0;
    const to = payload.to ?? 0;
    const total = payload.total ?? 0;
    if (subjectEls.summary) {
        subjectEls.summary.textContent = total > 0 ? `Showing ${from}-${to} of ${total} assignments` : '';
    }

    renderSubjectPagination(payload);
}

function renderSubjectPagination(payload) {
    if (!subjectEls.pagination) return;
    const current = payload.current_page ?? 1;
    const last = payload.last_page ?? 1;
    subjectState.table.page = current;

    const createItem = (page, label = page, disabled = false, active = false) => {
        const li = document.createElement('li');
        li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;
        if (!disabled) {
            a.addEventListener('click', (event) => {
                event.preventDefault();
                if (page !== subjectState.table.page) {
                    subjectState.table.page = page;
                    refreshAssignments();
                }
            });
        }
        li.appendChild(a);
        return li;
    };

    const createEllipsis = () => {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        const span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '…';
        li.appendChild(span);
        return li;
    };

    subjectEls.pagination.innerHTML = '';
    subjectEls.pagination.appendChild(createItem(current - 1, '«', current <= 1));

    if (last <= 7) {
        for (let page = 1; page <= last; page++) {
            subjectEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
    } else {
        subjectEls.pagination.appendChild(createItem(1, 1, false, current === 1));
        let start = Math.max(2, current - 2);
        let end = Math.min(last - 1, current + 2);
        if (start > 2) subjectEls.pagination.appendChild(createEllipsis());
        for (let page = start; page <= end; page++) {
            subjectEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
        if (end < last - 1) subjectEls.pagination.appendChild(createEllipsis());
        subjectEls.pagination.appendChild(createItem(last, last, false, current === last));
    }

    subjectEls.pagination.appendChild(createItem(current + 1, '»', current >= last));
}

async function handleSubjectEdit(id) {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subject-assignments/${id}`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load assignment.');
        const payload = await response.json();
        const assignment = payload.data || payload;
        subjectState.editingId = assignment.id;
        if (subjectEls.assignmentId) subjectEls.assignmentId.value = assignment.id;

        subjectEls.subjectSelect.value = assignment.subject_id;
        subjectEls.classSelect.value = assignment.school_class_id;
        await ensureArmsLoaded(assignment.school_class_id);
        populateArmOptions(subjectEls.armSelect, assignment.school_class_id, true);
        subjectEls.armSelect.value = assignment.class_arm_id;
        await ensureSectionsLoaded(assignment.school_class_id, assignment.class_arm_id);
        populateSectionOptions(subjectEls.sectionSelect, assignment.class_arm_id);
        subjectEls.sectionSelect.value = assignment.class_section_id ?? '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function handleSubjectDelete(id) {
    if (!confirm('Are you sure you want to remove this assignment?')) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subject-assignments/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to delete assignment.');
        alert(data.message || 'Assignment removed successfully.');
        refreshAssignments();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
}
