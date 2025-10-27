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

const teacherState = {
    subjects: [],
    teachers: [],
    sessions: [],
    termsBySession: new Map(),
    editingId: null,
    table: {
        page: 1,
        perPage: 10,
        search: '',
        subject_id: '',
        staff_id: '',
        session_id: '',
        term_id: '',
    },
};

const teacherEls = {};

document.addEventListener('DOMContentLoaded', async () => {
    cacheTeacherElements();
    bindTeacherEvents();

    await Promise.all([
        loadTeacherSubjects(),
        loadTeachers(),
        loadSessions(),
    ]);

    populateTeacherSelects();
    refreshTeacherAssignments();
});

function cacheTeacherElements() {
    teacherEls.form = document.getElementById('teacher-assignment-form');
    teacherEls.assignmentId = document.getElementById('teacher-assignment-id');
    teacherEls.subjectSelect = document.getElementById('teacher-subject');
    teacherEls.teacherSelect = document.getElementById('teacher-staff');
    teacherEls.sessionSelect = document.getElementById('teacher-session');
    teacherEls.termSelect = document.getElementById('teacher-term');
    teacherEls.resetButton = document.getElementById('teacher-assignment-reset');

    teacherEls.filterSearch = document.getElementById('filter-search');
    teacherEls.filterSession = document.getElementById('filter-session');
    teacherEls.filterTerm = document.getElementById('filter-term');
    teacherEls.filterTeacher = document.getElementById('filter-staff');
    teacherEls.filterApply = document.getElementById('filter-apply');
    teacherEls.filterReset = document.getElementById('filter-reset');

    teacherEls.tableBody = document.getElementById('teacher-assignment-table');
    teacherEls.summary = document.getElementById('teacher-assignment-summary');
    teacherEls.pagination = document.getElementById('teacher-assignment-pagination');
}

function bindTeacherEvents() {
    if (teacherEls.sessionSelect) {
        teacherEls.sessionSelect.addEventListener('change', async () => {
            const sessionId = teacherEls.sessionSelect.value;
            await ensureTerms(sessionId);
            populateTerms(teacherEls.termSelect, sessionId, true);
        });
    }

    if (teacherEls.resetButton) {
        teacherEls.resetButton.addEventListener('click', () => resetTeacherForm());
    }

    if (teacherEls.form) {
        teacherEls.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await submitTeacherAssignment();
        });
    }

    // Filters
    if (teacherEls.filterSession) {
        teacherEls.filterSession.addEventListener('change', async () => {
            const sessionId = teacherEls.filterSession.value;
            await ensureTerms(sessionId);
            populateTerms(teacherEls.filterTerm, sessionId, false);
        });
    }

    if (teacherEls.filterApply) {
        teacherEls.filterApply.addEventListener('click', (event) => {
            event.preventDefault();
            teacherState.table.search = teacherEls.filterSearch.value.trim();
            teacherState.table.session_id = teacherEls.filterSession.value;
            teacherState.table.term_id = teacherEls.filterTerm.value;
            teacherState.table.staff_id = teacherEls.filterTeacher.value;
            teacherState.table.page = 1;
            refreshTeacherAssignments();
        });
    }

    if (teacherEls.filterReset) {
        teacherEls.filterReset.addEventListener('click', (event) => {
            event.preventDefault();
            if (teacherEls.filterSearch) teacherEls.filterSearch.value = '';
            if (teacherEls.filterSession) teacherEls.filterSession.value = '';
            populateTerms(teacherEls.filterTerm, '', false);
            if (teacherEls.filterTeacher) teacherEls.filterTeacher.value = '';
            teacherState.table = {
                page: 1,
                perPage: 10,
                search: '',
                subject_id: '',
                staff_id: '',
                session_id: '',
                term_id: '',
            };
            refreshTeacherAssignments();
        });
    }
}

async function loadTeacherSubjects() {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subjects?per_page=200`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load subjects.');
        const payload = await response.json();
        teacherState.subjects = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function loadTeachers() {
    try {
        const response = await fetch(`${backend_url}/api/v1/staff?per_page=200`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load teachers.');
        const payload = await response.json();
        teacherState.teachers = unpackCollection(payload);
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
        teacherState.sessions = unpackCollection(payload);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateTeacherSelects() {
    if (teacherEls.subjectSelect) {
        teacherEls.subjectSelect.innerHTML = ['<option value="">Select subject</option>']
            .concat(teacherState.subjects.map((subject) => `<option value="${subject.id}">${subject.name}${subject.code ? ` (${subject.code})` : ''}</option>`))
            .join('');
    }

    const teacherOptions = ['<option value="">Select teacher</option>']
        .concat(teacherState.teachers.map((staff) => `<option value="${staff.id}">${staff.full_name || staff.user?.name || 'N/A'}</option>`));
    if (teacherEls.teacherSelect) {
        teacherEls.teacherSelect.innerHTML = teacherOptions.join('');
    }

    const sessionOptions = ['<option value="">Select session</option>']
        .concat(teacherState.sessions.map((session) => `<option value="${session.id}">${session.name}</option>`));
    if (teacherEls.sessionSelect) {
        teacherEls.sessionSelect.innerHTML = sessionOptions.join('');
    }
    if (teacherEls.filterSession) {
        teacherEls.filterSession.innerHTML = ['<option value="">All sessions</option>'].concat(sessionOptions.slice(1)).join('');
    }

    if (teacherEls.filterTeacher) {
        teacherEls.filterTeacher.innerHTML = ['<option value="">All teachers</option>'].concat(teacherOptions.slice(1)).join('');
    }
}

async function ensureTerms(sessionId) {
    if (!sessionId || teacherState.termsBySession.has(sessionId)) return;
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load terms.');
        const payload = await response.json();
        teacherState.termsBySession.set(sessionId, unpackCollection(payload));
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function populateTerms(select, sessionId, required) {
    if (!select) return;
    const terms = sessionId ? (teacherState.termsBySession.get(sessionId) ?? []) : [];
    const placeholder = required ? 'Select term' : 'All terms';
    const options = [`<option value="">${placeholder}</option>`]
        .concat(terms.map((term) => `<option value="${term.id}">${term.name}</option>`));
    select.innerHTML = options.join('');
}

async function submitTeacherAssignment() {
    const payload = {
        subject_id: teacherEls.subjectSelect.value,
        staff_id: teacherEls.teacherSelect.value,
        session_id: teacherEls.sessionSelect.value,
        term_id: teacherEls.termSelect.value,
    };

    if (!payload.subject_id || !payload.staff_id || !payload.session_id || !payload.term_id) {
        alert('Please complete all required fields.');
        return;
    }

    const isEdit = Boolean(teacherState.editingId);
    const url = isEdit
        ? `${backend_url}/api/v1/settings/subject-teacher-assignments/${teacherState.editingId}`
        : `${backend_url}/api/v1/settings/subject-teacher-assignments`;
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
        resetTeacherForm();
        refreshTeacherAssignments();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function resetTeacherForm() {
    teacherState.editingId = null;
    if (teacherEls.assignmentId) teacherEls.assignmentId.value = '';
    if (teacherEls.form) teacherEls.form.reset();
    populateTerms(teacherEls.termSelect, '', true);
}

async function refreshTeacherAssignments() {
    if (!teacherEls.tableBody) return;
    teacherEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    try {
        const params = new URLSearchParams({
            page: teacherState.table.page,
            per_page: teacherState.table.perPage,
            sortDirection: 'desc',
        });

        if (teacherState.table.search) params.append('search', teacherState.table.search);
        if (teacherState.table.subject_id) params.append('subject_id', teacherState.table.subject_id);
        if (teacherState.table.staff_id) params.append('staff_id', teacherState.table.staff_id);
        if (teacherState.table.session_id) params.append('session_id', teacherState.table.session_id);
        if (teacherState.table.term_id) params.append('term_id', teacherState.table.term_id);

        const response = await fetch(`${backend_url}/api/v1/settings/subject-teacher-assignments?${params.toString()}`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load assignments.');
        const payload = await response.json();
        renderTeacherAssignments(payload);
    } catch (error) {
        console.error(error);
        teacherEls.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
        if (teacherEls.summary) teacherEls.summary.textContent = '';
        if (teacherEls.pagination) teacherEls.pagination.innerHTML = '';
    }
}

function renderTeacherAssignments(payload) {
    const data = unpackCollection(payload);
    if (!data.length) {
        teacherEls.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No assignments found.</td></tr>';
    } else {
        teacherEls.tableBody.innerHTML = data.map((item) => {
            const subjectName = item.subject?.name ?? 'N/A';
            const subjectCode = item.subject?.code ? ` (${item.subject.code})` : '';
            const teacherName = item.staff?.full_name || item.staff?.user?.name || 'N/A';
            const sessionName = item.session?.name ?? 'N/A';
            const termName = item.term?.name ?? 'N/A';
            const updatedAt = formatDateTime(item.updated_at);
            return `<tr>
                <td>${subjectName}${subjectCode}</td>
                <td>${teacherName}</td>
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

    teacherEls.tableBody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
        button.addEventListener('click', () => handleTeacherEdit(button.dataset.id));
    });
    teacherEls.tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => handleTeacherDelete(button.dataset.id));
    });

    const from = payload.from ?? 0;
    const to = payload.to ?? 0;
    const total = payload.total ?? 0;
    if (teacherEls.summary) {
        teacherEls.summary.textContent = total > 0 ? `Showing ${from}-${to} of ${total} assignments` : '';
    }

    renderTeacherPagination(payload);
}

function renderTeacherPagination(payload) {
    if (!teacherEls.pagination) return;
    const current = payload.current_page ?? 1;
    const last = payload.last_page ?? 1;
    teacherState.table.page = current;

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
                if (page !== teacherState.table.page) {
                    teacherState.table.page = page;
                    refreshTeacherAssignments();
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

    teacherEls.pagination.innerHTML = '';
    teacherEls.pagination.appendChild(createItem(current - 1, '«', current <= 1));

    if (last <= 7) {
        for (let page = 1; page <= last; page++) {
            teacherEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
    } else {
        teacherEls.pagination.appendChild(createItem(1, 1, false, current === 1));
        let start = Math.max(2, current - 2);
        let end = Math.min(last - 1, current + 2);
        if (start > 2) teacherEls.pagination.appendChild(createEllipsis());
        for (let page = start; page <= end; page++) {
            teacherEls.pagination.appendChild(createItem(page, page, false, page === current));
        }
        if (end < last - 1) teacherEls.pagination.appendChild(createEllipsis());
        teacherEls.pagination.appendChild(createItem(last, last, false, current === last));
    }

    teacherEls.pagination.appendChild(createItem(current + 1, '»', current >= last));
}

async function handleTeacherEdit(id) {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subject-teacher-assignments/${id}`, {
            headers: authHeaders(),
        });
        if (!response.ok) throw new Error('Unable to load assignment.');
        const payload = await response.json();
        const assignment = payload.data || payload;
        teacherState.editingId = assignment.id;
        if (teacherEls.assignmentId) teacherEls.assignmentId.value = assignment.id;

        teacherEls.subjectSelect.value = assignment.subject_id;
        teacherEls.teacherSelect.value = assignment.staff_id;

        teacherEls.sessionSelect.value = assignment.session_id;
        await ensureTerms(assignment.session_id);
        populateTerms(teacherEls.termSelect, assignment.session_id, true);
        teacherEls.termSelect.value = assignment.term_id;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function handleTeacherDelete(id) {
    if (!confirm('Are you sure you want to remove this assignment?')) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subject-teacher-assignments/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to delete assignment.');
        alert(data.message || 'Assignment removed successfully.');
        refreshTeacherAssignments();
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
