const API_BASE_PATH = '/api/v1';

const state = {
    users: [],
    roles: [],
    pagination: {
        current_page: 1,
        per_page: 25,
        total: 0,
        last_page: 1,
    },
    search: '',
    roleFilter: '',
    editingUserId: null,
};

const resolveUrl = (typeof window !== 'undefined' && typeof window.resolveBackendUrl === 'function')
    ? window.resolveBackendUrl
    : (path) => {
        if (!path) return '';
        const base = typeof backend_url === 'string' ? backend_url.replace(/\/$/, '') : '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/')) return `${base}${path}`;
        return `${base}/${path}`;
    };

function getCookie(name) {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

function extractErrorMessage(payload, fallback = 'An unexpected error occurred.') {
    if (!payload) {
        return fallback;
    }
    if (typeof payload.message === 'string' && payload.message.trim() !== '') {
        return payload.message;
    }
    if (payload.errors && typeof payload.errors === 'object') {
        const messages = Object.values(payload.errors)
            .flat()
            .filter(Boolean);
        if (messages.length) {
            return messages.join(' ');
        }
    }
    return fallback;
}

async function makeApiRequest(endpoint, method = 'GET', body) {
    const token = getCookie('token');
    if (!token) {
        throw new Error('Authentication token is missing. Please login again.');
    }

    const url = resolveUrl(`${API_BASE_PATH}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = extractErrorMessage(data, `Request failed with status ${response.status}`);
        throw new Error(message);
    }

    return data;
}

function showAlert(message, type = 'success') {
    const container = $('#userRolesAlert');
    if (!message) {
        container.html('');
        return;
    }

    container.html(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `);
}

$(document).ready(() => {
    $('#userSearch').on('input', (event) => {
        state.search = String(event.target.value || '').trim();
        state.pagination.current_page = 1;
        loadUsers();
    });

    $('#refreshUsersBtn').on('click', () => loadUsers());

    $('#pageSizeSelect').on('change', (event) => {
        state.pagination.per_page = parseInt(event.target.value, 10) || 25;
        state.pagination.current_page = 1;
        loadUsers();
    });

    $('#roleFilter').on('input', (event) => {
        state.roleFilter = String(event.target.value || '').trim().toLowerCase();
        renderRoleCheckboxes(getSelectedRoleIds());
    });

    $('#userRoleForm').on('submit', submitUserRoleForm);

    $(document).on('change', '.user-role-checkbox', updateSelectedRoleCount);

    loadRoles().then(loadUsers);
});

async function loadRoles() {
    try {
        const payload = await makeApiRequest('/roles?per_page=200', 'GET');
        state.roles = Array.isArray(payload.data) ? payload.data : payload;
    } catch (error) {
        console.error('Unable to load roles:', error);
        showAlert(error.message || 'Unable to load roles.', 'danger');
        state.roles = [];
    }
}

async function loadUsers(page = null) {
    if (page !== null) {
        state.pagination.current_page = page;
    }

    const params = new URLSearchParams();
    params.append('per_page', state.pagination.per_page.toString());
    params.append('page', state.pagination.current_page.toString());
    if (state.search) {
        params.append('search', state.search);
    }

    try {
        const payload = await makeApiRequest(`/users?${params.toString()}`, 'GET');
        const dataArray = Array.isArray(payload.data) ? payload.data : [];

        state.users = dataArray;
        state.pagination.current_page = payload.current_page || 1;
        state.pagination.per_page = payload.per_page || state.pagination.per_page;
        state.pagination.total = payload.total || dataArray.length;
        state.pagination.last_page = payload.last_page || 1;

        renderUsers();
        renderPagination();
    } catch (error) {
        console.error('Unable to load users:', error);
        showAlert(error.message || 'Unable to load users.', 'danger');
        $('#usersTableBody').html(`
            <tr><td colspan="4" class="text-center text-danger">Failed to load users</td></tr>
        `);
        $('#usersPagination').html('');
    }
}

function renderUsers() {
    const tbody = $('#usersTableBody');

    if (!Array.isArray(state.users) || state.users.length === 0) {
        tbody.html('<tr><td colspan="4" class="text-center text-muted">No users found.</td></tr>');
        return;
    }

    const rows = state.users.map((user) => {
        const roleNames = Array.isArray(user.roles)
            ? user.roles.map((role) => role?.name).filter(Boolean)
            : [];
        const roleSummary = roleNames.length
            ? escapeHtml(roleNames.join(', '))
            : '<span class="badge badge-secondary">No roles</span>';

        return `
            <tr>
                <td>${escapeHtml(user.name || '')}</td>
                <td>${escapeHtml(user.email || '')}</td>
                <td>${roleSummary}</td>
                <td class="text-right">
                    <button class="btn btn-sm btn-primary" onclick="openUserRoleModal('${user.id}')">
                        <i class="fas fa-user-shield mr-1"></i>Assign Roles
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.html(rows.join(''));
}

function renderPagination() {
    const container = $('#usersPagination');
    container.empty();

    const { current_page: currentPage, last_page: lastPage } = state.pagination;

    if (lastPage <= 1) {
        return;
    }

    const createPageItem = (page, label = null, disabled = false, active = false) => {
        const classes = ['page-item'];
        if (disabled) classes.push('disabled');
        if (active) classes.push('active');

        return `
            <li class="${classes.join(' ')}">
                <a class="page-link" href="#" data-page="${page}">${escapeHtml(label ?? page.toString())}</a>
            </li>
        `;
    };

    container.append(createPageItem(currentPage - 1, 'Previous', currentPage === 1));

    for (let page = 1; page <= lastPage; page += 1) {
        if (page === 1 || page === lastPage || Math.abs(page - currentPage) <= 1) {
            container.append(createPageItem(page, page.toString(), false, page === currentPage));
        } else if (Math.abs(page - currentPage) === 2) {
            container.append('<li class="page-item disabled"><span class="page-link">…</span></li>');
        }
    }

    container.append(createPageItem(currentPage + 1, 'Next', currentPage === lastPage));

    container.find('.page-link').on('click', (event) => {
        event.preventDefault();
        const page = parseInt(event.target.getAttribute('data-page'), 10);
        if (!Number.isNaN(page) && page >= 1 && page <= lastPage && page !== currentPage) {
            loadUsers(page);
        }
    });
}

function openUserRoleModal(userId) {
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
        showAlert('Selected user could not be found.', 'danger');
        return;
    }

    state.editingUserId = userId;
    $('#userIdField').val(userId);
    $('#userSummary').text(user.name || '—');
    $('#userEmailSummary').text(user.email || '');

    const selectedRoleIds = Array.isArray(user.roles)
        ? user.roles.map((role) => String(role.id))
        : [];

    renderRoleCheckboxes(selectedRoleIds);
    $('#roleFilter').val(state.roleFilter);
    updateSelectedRoleCount();

    $('#userRoleModal').modal('show');
}

function getSelectedRoleIds() {
    return Array.from(document.querySelectorAll('.user-role-checkbox:checked'))
        .map((checkbox) => String(checkbox.value));
}

function renderRoleCheckboxes(selectedIds = []) {
    const container = $('#rolesCheckboxList');
    container.empty();

    if (!Array.isArray(state.roles) || state.roles.length === 0) {
        container.html('<p class="text-muted mb-0">No roles available.</p>');
        return;
    }

    const filterTerm = state.roleFilter;
    const filteredRoles = state.roles.filter((role) => {
        if (!filterTerm) {
            return true;
        }

        const name = String(role?.name ?? '').toLowerCase();
        const description = String(role?.description ?? '').toLowerCase();
        return name.includes(filterTerm) || description.includes(filterTerm);
    });

    if (!filteredRoles.length) {
        container.html('<p class="text-muted mb-0">No roles match your search.</p>');
        return;
    }

    filteredRoles.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

    filteredRoles.forEach((role) => {
        const checkboxId = `assign-role-${role.id}`;
        const isChecked = selectedIds.includes(String(role.id));

        container.append(`
            <div class="custom-control custom-checkbox mb-2">
                <input type="checkbox" class="custom-control-input user-role-checkbox" id="${checkboxId}" value="${role.id}" ${isChecked ? 'checked' : ''}>
                <label class="custom-control-label" for="${checkboxId}">
                    ${escapeHtml(role.name || '')}
                    ${role.description ? `<small class="d-block text-muted">${escapeHtml(role.description)}</small>` : ''}
                </label>
            </div>
        `);
    });

    updateSelectedRoleCount();
}

function updateSelectedRoleCount() {
    const selectedCount = document.querySelectorAll('.user-role-checkbox:checked').length;
    $('#selectedRolesCount').text(selectedCount);
}

async function submitUserRoleForm(event) {
    event.preventDefault();
    showAlert('');

    const userId = state.editingUserId;
    if (!userId) {
        showAlert('No user is selected.', 'danger');
        return;
    }

    const selectedRoleIds = getSelectedRoleIds().map((value) => Number(value));

    try {
        await makeApiRequest(`/users/${userId}/roles`, 'PUT', {
            roles: selectedRoleIds,
        });

        showAlert('User roles updated successfully.');
        $('#userRoleModal').modal('hide');
        await loadUsers(state.pagination.current_page);
    } catch (error) {
        console.error('Unable to update user roles:', error);
        showAlert(error.message || 'Unable to update user roles.', 'danger');
    }
}

window.openUserRoleModal = openUserRoleModal;
