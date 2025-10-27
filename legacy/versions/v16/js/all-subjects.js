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

function getHeaders() {
    return {
        'Accept': 'application/json',
        'Authorization': `Bearer ${getCookie('token')}`
    };
}

const state = {
    page: 1,
    perPage: 10,
    search: '',
    sortBy: 'name',
    sortDirection: 'asc'
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    highlightSort();
    fetchSubjects();
});

function cacheElements() {
    elements.searchInput = document.getElementById('subject-search');
    elements.perPageSelect = document.getElementById('subject-per-page');
    elements.searchBtn = document.getElementById('subject-search-btn');
    elements.resetBtn = document.getElementById('subject-reset-btn');
    elements.refreshBtn = document.getElementById('subjects-refresh');
    elements.tableBody = document.getElementById('subjects-table-body');
    elements.summary = document.getElementById('subjects-summary');
    elements.pagination = document.getElementById('subjects-pagination');
    elements.sortableHeaders = document.querySelectorAll('th.sortable');
}

function bindEvents() {
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', () => {
            state.search = elements.searchInput.value.trim();
            state.page = 1;
            fetchSubjects();
        });
    }

    if (elements.searchInput) {
        elements.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                state.search = elements.searchInput.value.trim();
                state.page = 1;
                fetchSubjects();
            }
        });
    }

    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            if (elements.searchInput) elements.searchInput.value = '';
            if (elements.perPageSelect) elements.perPageSelect.value = '10';
            state.search = '';
            state.page = 1;
            state.perPage = 10;
            state.sortBy = 'name';
            state.sortDirection = 'asc';
            highlightSort();
            fetchSubjects();
        });
    }

    if (elements.perPageSelect) {
        elements.perPageSelect.addEventListener('change', () => {
            const value = parseInt(elements.perPageSelect.value, 10);
            state.perPage = Number.isNaN(value) ? 10 : value;
            state.page = 1;
            fetchSubjects();
        });
    }

    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', (event) => {
            event.preventDefault();
            fetchSubjects();
        });
    }

    elements.sortableHeaders.forEach((header) => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (!column) return;

            if (state.sortBy === column) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortBy = column;
                state.sortDirection = 'asc';
            }

            highlightSort();
            fetchSubjects();
        });
    });
}

function highlightSort() {
    elements.sortableHeaders.forEach((header) => {
        header.classList.remove('sorting-asc', 'sorting-desc');
        if (header.dataset.sort === state.sortBy) {
            header.classList.add(state.sortDirection === 'asc' ? 'sorting-asc' : 'sorting-desc');
        }
    });
}

async function fetchSubjects() {
    if (elements.tableBody) {
        elements.tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    }

    try {
        const params = new URLSearchParams({
            page: state.page,
            per_page: state.perPage,
            sortBy: state.sortBy,
            sortDirection: state.sortDirection
        });

        if (state.search) {
            params.append('search', state.search);
        }

        const response = await fetch(`${backend_url}/api/v1/settings/subjects?${params.toString()}`, {
            headers: getHeaders()
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to load subjects');
        }

        const payload = await response.json();
        renderTable(payload.data || []);
        renderSummary(payload);
        renderPagination(payload);
    } catch (error) {
        console.error('Error loading subjects:', error);
        if (elements.tableBody) {
            elements.tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${error.message}</td></tr>`;
        }
        if (elements.summary) {
            elements.summary.textContent = '';
        }
        if (elements.pagination) {
            elements.pagination.innerHTML = '';
        }
    }
}

function renderTable(subjects) {
    if (!elements.tableBody) return;

    if (!Array.isArray(subjects) || subjects.length === 0) {
        elements.tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No subjects found.</td></tr>';
        return;
    }

    const rows = subjects.map((subject) => {
        const description = subject.description ? subject.description : '—';
        return `<tr>
            <td>${subject.name || 'N/A'}</td>
            <td>${subject.code || '—'}</td>
            <td>${description}</td>
            <td>${formatDate(subject.created_at)}</td>
            <td>
                <a class="btn btn-sm btn-outline-primary" href="edit-subject.html?id=${subject.id}">Edit</a>
                <button class="btn btn-sm btn-outline-danger ml-2" data-action="delete" data-id="${subject.id}">Delete</button>
            </td>
        </tr>`;
    }).join('');

    elements.tableBody.innerHTML = rows;
    elements.tableBody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
        button.addEventListener('click', () => handleDelete(button.dataset.id));
    });
}

function renderSummary(payload) {
    if (!elements.summary) return;
    const from = payload.from ?? 0;
    const to = payload.to ?? 0;
    const total = payload.total ?? 0;
    elements.summary.textContent = total > 0 ? `Showing ${from}-${to} of ${total} subjects` : '';
}

function renderPagination(payload) {
    if (!elements.pagination) return;
    const current = payload.current_page ?? 1;
    const last = payload.last_page ?? 1;

    state.page = current;
    elements.pagination.innerHTML = '';

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
                if (state.page !== page) {
                    state.page = page;
                    fetchSubjects();
                }
            });
        }
        li.appendChild(a);
        return li;
    };

    elements.pagination.appendChild(createItem(current - 1, '«', current <= 1));

    const addRange = (from, to) => {
        for (let page = from; page <= to; page++) {
            elements.pagination.appendChild(createItem(page, page, false, page === current));
        }
    };

    if (last <= 7) {
        addRange(1, last);
    } else {
        addRange(1, 1);

        const start = Math.max(2, current - 2);
        const end = Math.min(last - 1, current + 2);

        if (start > 2) {
            elements.pagination.appendChild(createEllipsis());
        }

        addRange(start, end);

        if (end < last - 1) {
            elements.pagination.appendChild(createEllipsis());
        }

        addRange(last, last);
    }

    elements.pagination.appendChild(createItem(current + 1, '»', current >= last));
}

function createEllipsis() {
    const li = document.createElement('li');
    li.className = 'page-item disabled';
    const span = document.createElement('span');
    span.className = 'page-link';
    span.textContent = '…';
    li.appendChild(span);
    return li;
}

async function handleDelete(id) {
    if (!id) return;
    const confirmed = confirm('Are you sure you want to delete this subject?');
    if (!confirmed) return;

    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subjects/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const message = data.message || 'Failed to delete subject.';
            throw new Error(message);
        }

        alert('Subject deleted successfully.');
        fetchSubjects();
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert(`Error: ${error.message}`);
    }
}

function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
