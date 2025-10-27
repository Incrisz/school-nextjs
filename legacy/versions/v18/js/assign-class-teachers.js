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

const classTeacherState = {
    teachers: [],
    classes: [],
    armsByClass: new Map(),
    sectionsByArm: new Map(),
    sessions: [],
    termsBySession: new Map(),
    editingId: null,
    table: {
        page: 1,
        perPage: 10,
        search: '',
        staff_id: '',
        school_class_id: '',
        class_arm_id: '',
        class_section_id: '',
        session_id: '',
        term_id: '',
    },
};

const classTeacherEls = {};

document.addEventListener('DOMContentLoaded', async () => {
    cacheClassTeacherElements();
    bindClassTeacherEvents();

    await Promise.all([
        loadTeachers(),
        loadClasses(),
        loadSessions(),
    ]);

    populateSelects();
    refreshClassTeacherAssignments();
});

function cacheClassTeacherElements() {
    classTeacherEls.form = document.getElementById('class-teacher-form');
    classTeacherEls.assignmentId = document.getElementById('class-teacher-id');
    classTeacherEls.teacherSelect = document.getElementById('class-teacher-staff');
    classTeacherEls.classSelect = document.getElementById('class-teacher-class');
    classTeacherEls.armSelect = document.getElementById('class-teacher-arm');
    classTeacherEls.sectionSelect = document.getElementById('class-teacher-section');
    classTeacherEls.sessionSelect = document.getElementById('class-teacher-session');
    classTeacherEls.termSelect = document.getElementById('class-teacher-term');
    classTeacherEls.resetButton = document.getElementById('class-teacher-reset');

    classTeacherEls.filterSearch = document.getElementById('class-teacher-filter-search');
    classTeacherEls.filterClass = document.getElementById('class-teacher-filter-class');
    classTeacherEls.filterArm = document.getElementById('class-teacher-filter-arm');
    classTeacherEls.filterSection = document.getElementById('class-teacher-filter-section');
    classTeacherEls.filterSession = document.getElementById('class-teacher-filter-session');
    classTeacherEls.filterTerm = document.getElementById('class-teacher-filter-term');
    classTeacherEls.filterApply = document.getElementById('class-teacher-filter-apply');
    classTeacherEls.filterReset = document.getElementById('class-teacher-filter-reset');

    classTeacherEls.tableBody = document.getElementById('class-teacher-table');
    classTeacherEls.summary = document.getElementById('class-teacher-summary');
    classTeacherEls.pagination = document.getElementById('class-teacher-pagination');
}

function bindClassTeacherEvents() {
    if (classTeacherEls.classSelect) {
        classTeacherEls.classSelect.addEventListener('change', async () => {
            const classId = classTeacherEls.classSelect.value;
            await ensureArmsLoaded(classId);
            populateArmOptions(classTeacherEls.armSelect, classId, true);
            populateSectionOptions(classTeacherEls.sectionSelect, '', true);
        });
    }

    if (classTeacherEls.armSelect) {
        classTeacherEls.armSelect.addEventListener('change', async () => {
            const classId = classTeacherEls.classSelect.value;
            const armId = classTeacherEls.armSelect.value;
            await ensureSectionsLoaded(classId, armId);
            populateSectionOptions(classTeacherEls.sectionSelect, armId, false);
        });
    }

    if (classTeacherEls.sessionSelect) {
        classTeacherEls.sessionSelect.addEventListener('change', async () => {
            const sessionId = classTeacherEls.sessionSelect.value;
            await ensureTermsLoaded(sessionId);
            populateTermOptions(classTeacherEls.termSelect, sessionId, true);
        });
    }

    if (classTeacherEls.resetButton) {
        classTeacherEls.resetButton.addEventListener('click', () => resetClassTeacherForm());
    }

    if (classTeacherEls.form) {
        classTeacherEls.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitClassTeacherAssignment();
        });
    }

    if (classTeacherEls.filterClass) {
        classTeacherEls.filterClass.addEventListener('change', async () => {
            const classId = classTeacherEls.filterClass.value;
            await ensureArmsLoaded(classId);
            populateArmOptions(classTeacherEls.filterArm, classId, false);
            populateSectionOptions(classTeacherEls.filterSection, '', false);
        });
    }

    if (classTeacherEls.filterArm) {
        classTeacherEls.filterArm.addEventListener('change', async () => {
            const classId = classTeacherEls.filterClass.value;
            const armId = classTeacherEls.filterArm.value;
            await ensureSectionsLoaded(classId, armId);
            populateSectionOptions(classTeacherEls.filterSection, armId, false);
        });
    }

    if (classTeacherEls.filterSession) {
        classTeacherEls.filterSession.addEventListener('change', async () => {
            const sessionId = classTeacherEls.filterSession.value;
            await ensureTermsLoaded(sessionId);
            populateTermOptions(classTeacherEls.filterTerm, sessionId, false);
        });
    }

    if (classTeacherEls.filterApply) {
        classTeacherEls.filterApply.addEventListener('click', (event) => {
            event.preventDefault();
            classTeacherState.table.search = classTeacherEls.filterSearch.value.trim();
            classTeacherState.table.school_class_id = classTeacherEls.filterClass.value;
            classTeacherState.table.class_arm_id = classTeacherEls.filterArm.value;
            classTeacherState.table.class_section_id = classTeacherEls.filterSection.value;
            classTeacherState.table.session_id = classTeacherEls.filterSession.value;
            classTeacherState.table.term_id = classTeacherEls.filterTerm.value;
            classTeacherState.table.page = 1;
            refreshClassTeacherAssignments();
        });
    }

    if (classTeacherEls.filterReset) {
        classTeacherEls.filterReset.addEventListener('click', (event) => {
            event.preventDefault();
            if (classTeacherEls.filterSearch) classTeacherEls.filterSearch.value = '';
            if (classTeacherEls.filterClass) classTeacherEls.filterClass.value = '';
            populateArmOptions(classTeacherEls.filterArm, '', false);
            populateSectionOptions(classTeacherEls.filterSection, '', false);
            if (classTeacherEls.filterSession) classTeacherEls.filterSession.value = '';
            populateTermOptions(classTeacherEls.filterTerm, '', false);
            classTeacherState.table = {
                page: 1,
                perPage: 10,
                search: '',
                staff_id: '',
                school_class_id: '',
                class_arm_id: '',
                class_section_id: '',
                session_id: '',
                term_id: '',
            };
            refreshClassTeacherAssignments();
        });
    }
}

async function loadTeachers() {
    try {
        const response = await fetch(`${backend_url}/api/v1/staff?per_page=200`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load teachers.');
        const payload = await response.json();
        classTeacherState.teachers = unpackCollection(payload);
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
        if (!response.ok) throw new Error('Unable to load classes.');
        const payload = await response.json();
        classTeacherState.classes = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function loadSessions() {
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions?per_page=200`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load sessions.');
        const payload = await response.json();
        classTeacherState.sessions = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateSelects() {
    if (classTeacherEls.teacherSelect) {
        classTeacherEls.teacherSelect.innerHTML = ['<option value="">Select teacher</option>']
            .concat(classTeacherState.teachers.map((staff) => `<option value="${staff.id}">${staff.full_name || staff.user?.name || 'N/A'}</option>`))
            .join('');
    }

    const classOptions = ['<option value="">Select class</option>']
        .concat(classTeacherState.classes.map((schoolClass) => `<option value="${schoolClass.id}">${schoolClass.name}</option>`));
    if (classTeacherEls.classSelect) {
        classTeacherEls.classSelect.innerHTML = classOptions.join('');
    }
    if (classTeacherEls.filterClass) {
        classTeacherEls.filterClass.innerHTML = ['<option value="">All classes</option>'].concat(classOptions.slice(1)).join('');
    }

    populateSectionOptions(classTeacherEls.sectionSelect, '', true);
    populateSectionOptions(classTeacherEls.filterSection, '', false);

    const sessionOptions = ['<option value="">Select session</option>']
        .concat(classTeacherState.sessions.map((session) => `<option value="${session.id}">${session.name}</option>`));
    if (classTeacherEls.sessionSelect) {
        classTeacherEls.sessionSelect.innerHTML = sessionOptions.join('');
    }
    if (classTeacherEls.filterSession) {
        classTeacherEls.filterSession.innerHTML = ['<option value="">All sessions</option>'].concat(sessionOptions.slice(1)).join('');
    }
}

async function ensureArmsLoaded(classId) {
    if (!classId || classTeacherState.armsByClass.has(classId)) {
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
        classTeacherState.armsByClass.set(classId, unpackCollection(payload));
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
    if (classTeacherState.sectionsByArm.has(cacheKey)) {
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
        classTeacherState.sectionsByArm.set(cacheKey, unpackCollection(payload));
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateSectionOptions(select, armId, required) {
    if (!select) return;
    let sections = [];
    if (armId) {
        for (const [key, value] of classTeacherState.sectionsByArm.entries()) {
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

async function ensureTermsLoaded(sessionId) {
    if (!sessionId || classTeacherState.termsBySession.has(sessionId)) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, {
            headers: authHeaders(),
        });
        if (!response.ok) {
            throw new Error('Unable to load terms.');
        }
        const payload = await response.json();
        classTeacherState.termsBySession.set(sessionId, unpackCollection(payload));
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateArmOptions(select, classId, required) {
    if (!select) return;
    const arms = classId ? (classTeacherState.armsByClass.get(classId) ?? []) : [];
    const placeholder = required ? 'Select class arm' : 'All class arms';
    const options = [`<option value="">${placeholder}</option>`]
        .concat(arms.map((arm) => `<option value="${arm.id}">${arm.name}</option>`));
    select.innerHTML = options.join('');
}

function populateTermOptions(select, sessionId, required) {
    if (!select) return;
    const terms = sessionId ? (classTeacherState.termsBySession.get(sessionId) ?? []) : [];
    const placeholder = required ? 'Select term' : 'All terms';
    const options = [`<option value="">${placeholder}</option>`]
        .concat(terms.map((term) => `<option value="${term.id}">${term.name}</option>`));
    select.innerHTML = options.join('');
}

async function submitClassTeacherAssignment() {
    const payload = {
        staff_id: classTeacherEls.teacherSelect.value,
        school_class_id: classTeacherEls.classSelect.value,
        class_arm_id: classTeacherEls.armSelect.value,
        class_section_id: classTeacherEls.sectionSelect ? (classTeacherEls.sectionSelect.value || null) : null,
        session_id: classTeacherEls.sessionSelect.value,
        term_id: classTeacherEls.termSelect.value,
    };

    if (!payload.staff_id || !payload.school_class_id || !payload.class_arm_id || !payload.session_id || !payload.term_id) {
        alert('Please complete all required fields.');
        return;
    }

    const isEdit = Boolean(classTeacherState.editingId);
    const url = isEdit
        ? `${backend_url}/api/v1/settings/class-teachers/${classTeacherState.editingId}`
        : `${backend_url}/api/v1/settings/class-teachers`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to save assignment.');
        alert(data.message || 'Assignment saved successfully.');
        resetClassTeacherForm();
        refreshClassTeacherAssignments();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function resetClassTeacherForm() {
    classTeacherState.editingId = null;
    if (classTeacherEls.assignmentId) classTeacherEls.assignmentId.value = '';
    if (classTeacherEls.form) classTeacherEls.form.reset();
    populateArmOptions(classTeacherEls.armSelect, '', true);
    populateSectionOptions(classTeacherEls.sectionSelect, '', true);
    populateTermOptions(classTeacherEls.termSelect, '', true);
}

async function refreshClassTeacherAssignments() {
    if (!classTeacherEls.tableBody) return;
    classTeacherEls.tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: classTeacherState.table.page,
            per_page: classTeacherState.table.perPage,
        });

        if (classTeacherState.table.search) params.append('search', classTeacherState.table.search);
        if (classTeacherState.table.school_class_id) params.append('school_class_id', classTeacherState.table.school_class_id);
        if (classTeacherState.table.class_arm_id) params.append('class_arm_id', classTeacherState.table.class_arm_id);
        if (classTeacherState.table.class_section_id) params.append('class_section_id', classTeacherState.table.class_section_id);
        if (classTeacherState.table.session_id) params.append('session_id', classTeacherState.table.session_id);
        if (classTeacherState.table.term_id) params.append('term_id', classTeacherState.table.term_id);

        const response = await fetch(`${backend_url}/api/v1/settings/class-teachers?${params.toString()}`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load assignments.');
        const payload = await response.json();
        renderClassTeacherAssignments(payload);
    } catch (error) {
        console.error(error);
        classTeacherEls.tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${error.message}</td></tr>`;
        if (classTeacherEls.summary) classTeacherEls.summary.textContent = '';
        if (classTeacherEls.pagination) classTeacherEls.pagination.innerHTML = '';
    }
}

function renderClassTeacherAssignments(payload) {
    const data = unpackCollection(payload);
    if (!data.length) {
        classTeacherEls.tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No assignments found.</td></tr>';
    } else {
        classTeacherEls.tableBody.innerHTML = data.map((item) => {
            const teacherName = item.staff?.full_name || item.staff?.user?.name || 'N/A';
            const className = item.school_class?.name ?? 'N/A';
            const armName = item.class_arm?.name ?? 'N/A';
            const sectionName = item.class_section?.name ?? 'All';
            const sessionName = item.session?.name ?? 'N/A';
            const termName = item.term?.name ?? 'N/A';
            const updatedAt = formatDateTime(item.updated_at);
            return `<tr>
                <td>${teacherName}</td>
                <td>${className}</td>
                <td>${armName}</td>
                <td>${sectionName}</td>
                <td>${sessionName}</td>
                <td>${termName}</td>
                <td>${updatedAt}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary mr-2" data-action="edit" data-id="${item.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    classTeacherEls.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
        button.addEventListener('click', () => handleClassTeacherEdit(button.dataset.id));
    });
    classTeacherEls.tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => handleClassTeacherDelete(button.dataset.id));
    });

    const from = payload.from ?? 0;
    const to = payload.to ?? 0;
    const total = payload.total ?? 0;
    if (classTeacherEls.summary) {
        classTeacherEls.summary.textContent = total > 0 ? `Showing ${from}-${to} of ${total} assignments` : '';
    }

    renderClassTeacherPagination(payload);
}

function renderClassTeacherPagination(payload) {
    if (!classTeacherEls.pagination) return;
    const current = payload.current_page ?? 1;
    const last = payload.last_page ?? 1;
    classTeacherState.table.page = current;
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
                if (page !== classTeacherState.table.page) {
                    classTeacherState.table.page = page;
                    refreshClassTeacherAssignments();
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

    classTeacherEls.pagination.innerHTML = '';
    classTeacherEls.pagination.appendChild(createItem(current - 1, '«', current <= 1));

    if (last <= 7) {
        for (let page = 1; page <= last; page++) {
            classTeacherEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
    } else {
        classTeacherEls.pagination.appendChild(createItem(1, 1, false, current === 1));
        let start = Math.max(2, current - 2);
        let end = Math.min(last - 1, current + 2);
        if (start > 2) classTeacherEls.pagination.appendChild(createEllipsis());
        for (let page = start; page <= end; page++) {
            classTeacherEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
        if (end < last - 1) classTeacherEls.pagination.appendChild(createEllipsis());
        classTeacherEls.pagination.appendChild(createItem(last, last, false, current === last));
    }

    classTeacherEls.pagination.appendChild(createItem(current + 1, '»', current >= last));
}

async function handleClassTeacherEdit(id) {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/class-teachers/${id}`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load assignment.');
        const payload = await response.json();
        const assignment = payload.data || payload;
        classTeacherState.editingId = assignment.id;
        if (classTeacherEls.assignmentId) classTeacherEls.assignmentId.value = assignment.id;

        classTeacherEls.teacherSelect.value = assignment.staff_id;
        classTeacherEls.classSelect.value = assignment.school_class_id;
        await ensureArmsLoaded(assignment.school_class_id);
        populateArmOptions(classTeacherEls.armSelect, assignment.school_class_id, true);
        classTeacherEls.armSelect.value = assignment.class_arm_id;
        await ensureSectionsLoaded(assignment.school_class_id, assignment.class_arm_id);
        populateSectionOptions(classTeacherEls.sectionSelect, assignment.class_arm_id, false);
        if (classTeacherEls.sectionSelect) {
            classTeacherEls.sectionSelect.value = assignment.class_section_id ?? '';
        }

        classTeacherEls.sessionSelect.value = assignment.session_id;
        await ensureTermsLoaded(assignment.session_id);
        populateTermOptions(classTeacherEls.termSelect, assignment.session_id, true);
        classTeacherEls.termSelect.value = assignment.term_id;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function handleClassTeacherDelete(id) {
    if (!confirm('Are you sure you want to remove this assignment?')) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/settings/class-teachers/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to delete assignment.');
        alert(data.message || 'Assignment removed successfully.');
        refreshClassTeacherAssignments();
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
