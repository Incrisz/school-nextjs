const API_BASE_PATH = '/api/v1';
let rolesState = {
    roles: [],
    permissions: [],
    editingId: null,
    permissionFilter: '',
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

function asArray(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }
    return [];
}

async function makeApiRequest(endpoint, method = 'GET', body = undefined) {
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

function showAlert(message, type = 'success') {
    const container = $('#rolesAlert');
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
    $('#addRoleBtn').on('click', () => openRoleModal());
    $('#roleForm').on('submit', submitRoleForm);
    $('#roleSearch').on('input', filterRoles);
    $('#permissionSearch').on('input', (event) => {
        rolesState.permissionFilter = String(event.target.value || '').trim().toLowerCase();

        const selected = getSelectedPermissionIds();
        renderPermissionCheckboxes(selected);
    });
    $(document).on('change', '.permission-checkbox', updatePermissionCounter);

    loadInitialData();
});

async function loadInitialData() {
    await loadPermissions();
    await loadRoles();
}

async function loadPermissions() {
    try {
        const payload = await makeApiRequest('/permissions?per_page=200', 'GET');
        rolesState.permissions = asArray(payload);
        renderPermissionCheckboxes();
    } catch (error) {
        console.error('Unable to fetch permissions:', error);
        showAlert(error.message || 'Unable to load permissions.', 'danger');
        rolesState.permissions = [];
        renderPermissionCheckboxes();
    }
}

function groupPermissionsByCategory(permissions) {
    const grouped = {};

    permissions.forEach((permission) => {
        const rawName = String(permission?.name ?? '');
        const parts = rawName.split('.');
        const groupKey = parts.length > 1 ? parts[0] : 'general';
        const displayParts = parts.length > 1 ? parts.slice(1) : parts;
        const displayName = displayParts.join(' ').replace(/[-_.]/g, ' ');

        if (!grouped[groupKey]) {
            grouped[groupKey] = [];
        }

        grouped[groupKey].push({
            ...permission,
            displayName,
        });
    });

    return grouped;
}

function getSelectedPermissionIds() {
    return Array.from(document.querySelectorAll('.permission-checkbox:checked'))
        .map((checkbox) => String(checkbox.value));
}

function renderPermissionCheckboxes(selectedIds = []) {
    const container = $('#rolePermissionsList');
    container.empty();

    if (!rolesState.permissions.length) {
        container.html('<p class="text-muted mb-0">No permissions available.</p>');
        updatePermissionCounter();
        return;
    }

    const filterTerm = rolesState.permissionFilter;
    const filteredPermissions = rolesState.permissions.filter((permission) => {
        if (!filterTerm) {
            return true;
        }

        const name = String(permission?.name ?? '').toLowerCase();
        const description = String(permission?.description ?? '').toLowerCase();

        return name.includes(filterTerm) || description.includes(filterTerm);
    });

    const grouped = groupPermissionsByCategory(filteredPermissions);
    const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    groupKeys.forEach((groupKey) => {
        const permissions = grouped[groupKey].sort((a, b) =>
            String(a.displayName || '').localeCompare(String(b.displayName || ''))
        );

        const groupId = `permission-group-${groupKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const groupTitle = groupKey.replace(/[-_]/g, ' ');

        const groupBlock = $(`
            <div class="permission-group mb-3">
                <h6 class="text-uppercase text-muted small mb-2">${escapeHtml(groupTitle)}</h6>
                <div class="row" id="${groupId}"></div>
            </div>
        `);

        permissions.forEach((permission) => {
            const checkboxId = `permission-${permission.id}`;
            const isChecked = selectedIds.includes(permission.id) || selectedIds.includes(String(permission.id));

            groupBlock.find(`#${groupId}`).append(`
                <div class="col-sm-6 col-lg-4 mb-2">
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox"
                               class="custom-control-input permission-checkbox"
                               id="${checkboxId}"
                               value="${permission.id}"
                               ${isChecked ? 'checked' : ''}>
                        <label class="custom-control-label" for="${checkboxId}">
                            ${escapeHtml(permission.displayName || permission.name || '')}
                        </label>
                    </div>
                </div>
            `);
        });

        container.append(groupBlock);
    });

    if (!groupKeys.length) {
        container.html('<p class="text-muted mb-0">No permissions match your search.</p>');
    }

    updatePermissionCounter();
}

async function loadRoles() {
    try {
        const payload = await makeApiRequest('/roles?per_page=100', 'GET');
        rolesState.roles = asArray(payload);
        renderRoles(rolesState.roles);
    } catch (error) {
        console.error('Unable to fetch roles:', error);
        showAlert(error.message || 'Unable to load roles.', 'danger');
        $('#rolesTableBody').html(`
            <tr><td colspan="5" class="text-center text-danger">Failed to load roles</td></tr>
        `);
    }
}

function renderRoles(list) {
    const tbody = $('#rolesTableBody');

    if (!Array.isArray(list) || list.length === 0) {
        tbody.html('<tr><td colspan="5" class="text-center text-muted">No roles found.</td></tr>');
        return;
    }

    const rows = list.map((role) => {
        const permissionsSummary = formatPermissionSummary(role);
        return `
            <tr>
                <td>${escapeHtml(role.name)}</td>
                <td>${escapeHtml(role.description || '-')}</td>
                <td>${permissionsSummary}</td>
                <td>${escapeHtml(formatDateTime(role.updated_at))}</td>
                <td class="text-right">
                    <button class="btn btn-sm btn-primary mr-1" onclick="openRoleModal(${Number(role.id)})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRole(${Number(role.id)})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.html(rows.join(''));
}

function formatPermissionSummary(role) {
    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    if (!permissions.length) {
        return '<span class="badge badge-secondary">None</span>';
    }

    const names = permissions.map((permission) => permission?.name).filter(Boolean);
    const preview = names.slice(0, 3).join(', ');
    const remaining = names.length - 3;
    if (remaining > 0) {
        return `${escapeHtml(preview)} <span class="text-muted">(+${remaining} more)</span>`;
    }

    return escapeHtml(preview);
}

function filterRoles() {
    const term = $('#roleSearch').val().trim().toLowerCase();
    if (!term) {
        renderRoles(rolesState.roles);
        return;
    }

    const filtered = rolesState.roles.filter((role) => {
        const name = String(role?.name ?? '').toLowerCase();
        const description = String(role?.description ?? '').toLowerCase();
        const permissions = Array.isArray(role.permissions)
            ? role.permissions.map((perm) => String(perm?.name ?? '').toLowerCase())
            : [];

        return (
            name.includes(term)
            || description.includes(term)
            || permissions.some((perm) => perm.includes(term))
        );
    });

    renderRoles(filtered);
}

function openRoleModal(roleId = null) {
    rolesState.editingId = roleId;
    showAlert('');

    const modalTitle = $('#roleModalTitle');
    const saveButton = $('#saveRoleBtn');

    if (roleId) {
        const role = rolesState.roles.find((item) => Number(item.id) === Number(roleId));
        if (!role) {
            showAlert('Selected role could not be found.', 'danger');
            return;
        }

        $('#roleId').val(role.id);
        $('#roleName').val(role.name || '');
        $('#roleDescription').val(role.description || '');

        const selectedPermissions = Array.isArray(role.permissions)
            ? role.permissions.map((permission) => String(permission.id))
            : [];
        renderPermissionCheckboxes(selectedPermissions);

        modalTitle.text('Edit Role');
        saveButton.text('Update Role');
    } else {
        $('#roleId').val('');
        $('#roleName').val('');
        $('#roleDescription').val('');
        renderPermissionCheckboxes([]);

        modalTitle.text('Create Role');
        saveButton.text('Create Role');
    }

    $('#roleModal').modal('show');
}

function updatePermissionCounter() {
    const selected = document.querySelectorAll('.permission-checkbox:checked');
    $('#rolePermissionsCount').text(selected.length);
}

async function submitRoleForm(event) {
    event.preventDefault();
    showAlert('');

    const roleId = rolesState.editingId;
    const name = $('#roleName').val().trim();
    const description = $('#roleDescription').val().trim();
    const permissions = Array.from(document.querySelectorAll('.permission-checkbox:checked'))
        .map((checkbox) => Number(checkbox.value));

    if (!name) {
        showAlert('Role name is required.', 'danger');
        return;
    }

    const payload = {
        name,
        description: description || null,
        permissions,
    };

    try {
        if (roleId) {
            await makeApiRequest(`/roles/${roleId}`, 'PUT', payload);
            showAlert('Role updated successfully.');
        } else {
            await makeApiRequest('/roles', 'POST', payload);
            showAlert('Role created successfully.');
        }

        $('#roleModal').modal('hide');
        await loadRoles();
        await loadPermissions();
        $('#roleSearch').val('');
    } catch (error) {
        console.error('Unable to save role:', error);
        showAlert(error.message || 'Unable to save role.', 'danger');
    }
}

async function deleteRole(roleId) {
    const role = rolesState.roles.find((item) => Number(item.id) === Number(roleId));
    if (!role) {
        showAlert('Role not found.', 'danger');
        return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete the role "${role.name}"?`);
    if (!confirmed) {
        return;
    }

    try {
        await makeApiRequest(`/roles/${roleId}`, 'DELETE');
        showAlert('Role deleted successfully.');
        await loadRoles();
        $('#roleSearch').val('');
    } catch (error) {
        console.error('Unable to delete role:', error);
        showAlert(error.message || 'Unable to delete role.', 'danger');
    }
}

window.openRoleModal = openRoleModal;
window.deleteRole = deleteRole;
