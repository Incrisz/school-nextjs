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
    role: '',
    sortBy: 'full_name',
    sortDirection: 'asc'
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    fetchStaff();
});

function cacheElements() {
    elements.searchInput = document.getElementById('staff-search');
    elements.roleSelect = document.getElementById('filter-role');
    elements.tableBody = document.getElementById('staff-table-body');
    elements.summary = document.getElementById('staff-summary');
    elements.pagination = document.getElementById('staff-pagination');
    elements.searchBtn = document.getElementById('staff-search-btn');
    elements.resetBtn = document.getElementById('staff-reset-btn');
    elements.sortableHeaders = document.querySelectorAll('th.sortable');
}

function bindEvents() {
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', () => {
            state.search = elements.searchInput.value.trim();
            state.page = 1;
            fetchStaff();
        });
    }

    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            if (elements.roleSelect) elements.roleSelect.value = '';
            state.search = '';
            state.role = '';
            state.page = 1;
            state.sortBy = 'full_name';
            state.sortDirection = 'asc';
            fetchStaff();
        });
    }

    if (elements.roleSelect) {
        elements.roleSelect.addEventListener('change', () => {
            state.role = elements.roleSelect.value;
            state.page = 1;
            fetchStaff();
        });
    }

    if (elements.searchInput) {
        elements.searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                state.search = elements.searchInput.value.trim();
                state.page = 1;
                fetchStaff();
            }
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
            fetchStaff();
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

async function fetchStaff() {
    if (elements.tableBody) {
        elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
    }

    try {
        const params = new URLSearchParams({
            page: state.page,
            per_page: state.perPage,
            sortBy: state.sortBy,
            sortDirection: state.sortDirection
        });

        if (state.search) params.append('search', state.search);
        if (state.role) params.append('role', state.role);

        const response = await fetch(`${backend_url}/api/v1/staff?${params.toString()}`, {
            headers: getHeaders()
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to load staff');
        }

        const payload = await response.json();
        renderTable(payload.data || []);
        renderSummary(payload);
        renderPagination(payload);
    } catch (error) {
        console.error('Error loading staff:', error);
        if (elements.tableBody) {
            elements.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }
}

function renderTable(staffList) {
    if (!elements.tableBody) return;

    if (!Array.isArray(staffList) || staffList.length === 0) {
        elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No staff found.</td></tr>';
        return;
    }

    const rows = staffList.map((staff) => {
        const email = staff.email || staff.user?.email || 'N/A';
        const phone = staff.phone || staff.user?.phone || 'N/A';
        const gender = staff.gender ? staff.gender.charAt(0).toUpperCase() + staff.gender.slice(1) : 'N/A';
        return `<tr>
            <td>${staff.full_name || staff.user?.name || 'N/A'}</td>
            <td>${email}</td>
            <td>${phone}</td>
            <td>${staff.role || 'N/A'}</td>
            <td>${gender}</td>
            <td>
                <a class="btn btn-sm btn-outline-primary" href="edit-staff.html?id=${staff.id}">Edit</a>
                <button class="btn btn-sm btn-outline-danger ml-2" data-action="delete" data-id="${staff.id}">Delete</button>
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
    elements.summary.textContent = total > 0 ? `Showing ${from}-${to} of ${total} staff` : '';
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
        const link = document.createElement('a');
        link.className = 'page-link';
        link.href = '#';
        link.textContent = label;
        link.addEventListener('click', (event) => {
            event.preventDefault();
            if (disabled || active) return;
            state.page = page;
            fetchStaff();
        });
        li.appendChild(link);
        return li;
    };

    elements.pagination.appendChild(createItem(current - 1, '«', current <= 1));

    const pages = buildPageRange(current, last);
    pages.forEach((page) => {
        if (page === '…') {
            const ellipsis = document.createElement('li');
            ellipsis.className = 'page-item disabled';
            ellipsis.innerHTML = '<span class="page-link">…</span>';
            elements.pagination.appendChild(ellipsis);
        } else {
            elements.pagination.appendChild(createItem(page, page, false, page === current));
        }
    });

    elements.pagination.appendChild(createItem(current + 1, '»', current >= last));
}

function buildPageRange(current, last) {
    const delta = 2;
    const range = [];
    const start = Math.max(1, current - delta);
    const end = Math.min(last, current + delta);
    for (let page = start; page <= end; page++) {
        range.push(page);
    }
    if (start > 1) {
        range.unshift('…');
        range.unshift(1);
    }
    if (end < last) {
        range.push('…');
        range.push(last);
    }
    return range;
}

async function handleDelete(staffId) {
    if (!confirm('Are you sure you want to delete this staff profile?')) {
        return;
    }

    try {
        const response = await fetch(`${backend_url}/api/v1/staff/${staffId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete staff');
        }

        alert('Staff deleted successfully.');
        fetchStaff();
    } catch (error) {
        console.error('Error deleting staff:', error);
        alert(`Error: ${error.message}`);
    }
}
