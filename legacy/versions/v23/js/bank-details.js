// Bank Details Management
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

const API_BASE_PATH = '/api/v1';

let bankDetails = [];

function asArray(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }
    return [];
}

// Initialize page
$(document).ready(function() {
    loadBankDetails();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    $('#bankDetailForm').on('submit', handleBankDetailSubmit);
}

// Load bank details
async function loadBankDetails() {
    try {
        const payload = await makeApiRequest('/fees/bank-details?per_page=100', 'GET');
        bankDetails = asArray(payload);
        renderBankDetails(bankDetails);
    } catch (error) {
        console.error('Error loading bank details:', error);
        showAlert(error.message || 'Error loading bank details', 'danger');
        $('#bankDetailsTableBody').html(`
            <tr><td colspan="7" class="text-center text-danger">Error loading bank details</td></tr>
        `);
    }
}

// Render bank details table
function renderBankDetails(details) {
    const tbody = $('#bankDetailsTableBody');
    
    if (!Array.isArray(details) || details.length === 0) {
        tbody.html(`
            <tr>
                <td colspan="7" class="text-center">
                    No bank accounts found. Add your first bank account to start.
                </td>
            </tr>
        `);
        return;
    }
    
    tbody.empty();
    details.forEach(detail => {
        const detailId = detail?.id || '';
        const defaultAction = detail?.is_default
            ? '<span class="badge bg-primary"><i class="fas fa-star"></i> Default</span>'
            : (detailId
                ? `<button class="btn btn-sm btn-outline-primary" onclick="setDefaultBank('${detailId}')">
                        <i class="fas fa-star"></i> Set Default
                   </button>`
                : '<span class="text-muted">—</span>');
        tbody.append(`
            <tr>
                <td>${escapeHtml(detail?.bank_name)}</td>
                <td>${escapeHtml(detail?.account_name)}</td>
                <td><strong>${escapeHtml(detail?.account_number)}</strong></td>
                <td>${escapeHtml(detail?.branch || '-')}</td>
                <td>
                    <span class="badge bg-${detail?.is_active ? 'success' : 'secondary'}">
                        ${detail?.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    ${defaultAction}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editBankDetail('${detailId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBankDetail('${detailId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });
}

// Show bank detail modal
function showBankDetailModal(detailId = null) {
    $('#bankDetailId').val('');
    $('#bankDetailForm')[0].reset();
    $('#isActive').prop('checked', true);
    $('#isDefault').prop('checked', false);
    $('#bankDetailModalTitle').text('Add Bank Account');
    
    if (detailId) {
        const detail = bankDetails.find(d => d.id === detailId);
        if (detail) {
            $('#bankDetailId').val(detail.id);
            $('#bankName').val(detail.bank_name);
            $('#accountName').val(detail.account_name);
            $('#accountNumber').val(detail.account_number);
            $('#bankCode').val(detail.bank_code || '');
            $('#branch').val(detail.branch || '');
            $('#isDefault').prop('checked', detail.is_default);
            $('#isActive').prop('checked', detail.is_active);
            $('#bankDetailModalTitle').text('Edit Bank Account');
        }
    }
    
    $('#bankDetailModal').modal('show');
}

// Handle bank detail form submission
async function handleBankDetailSubmit(e) {
    e.preventDefault();
    
    const detailId = $('#bankDetailId').val();
    const sanitizeOptional = (value) => {
        const trimmed = (value || '').trim();
        return trimmed === '' ? null : trimmed;
    };

    const data = {
        bank_name: $('#bankName').val().trim(),
        account_name: $('#accountName').val().trim(),
        account_number: $('#accountNumber').val().trim(),
        bank_code: sanitizeOptional($('#bankCode').val()),
        branch: sanitizeOptional($('#branch').val()),
        is_default: $('#isDefault').is(':checked'),
        is_active: $('#isActive').is(':checked')
    };

    if (!data.bank_name || !data.account_name || !data.account_number) {
        showAlert('Bank name, account name, and account number are required.', 'warning');
        return;
    }
    
    try {
        const method = detailId ? 'PUT' : 'POST';
        const url = detailId ? `/fees/bank-details/${detailId}` : '/fees/bank-details';
        
        await makeApiRequest(url, method, data);
        
        $('#bankDetailModal').modal('hide');
        showAlert(`Bank account ${detailId ? 'updated' : 'added'} successfully`, 'success');
        await loadBankDetails();
    } catch (error) {
        console.error('Error saving bank detail:', error);
        showAlert(error.message || 'Error saving bank account', 'danger');
    }
}

// Edit bank detail
function editBankDetail(detailId) {
    showBankDetailModal(detailId);
}

// Delete bank detail
async function deleteBankDetail(detailId) {
    if (!detailId) {
        showAlert('Unable to delete bank account: invalid identifier.', 'danger');
        return;
    }

    if (!confirm('Are you sure you want to delete this bank account?')) {
        return;
    }
    
    try {
        await makeApiRequest(`/fees/bank-details/${detailId}`, 'DELETE');
        showAlert('Bank account deleted successfully', 'success');
        await loadBankDetails();
    } catch (error) {
        console.error('Error deleting bank detail:', error);
        showAlert(error.message || 'Error deleting bank account', 'danger');
    }
}

// Set default bank
async function setDefaultBank(detailId) {
    if (!detailId) {
        showAlert('Unable to set default bank account: invalid identifier.', 'danger');
        return;
    }

    try {
        await makeApiRequest(`/fees/bank-details/${detailId}/set-default`, 'PUT');
        showAlert('Default bank account updated successfully', 'success');
        await loadBankDetails();
    } catch (error) {
        console.error('Error setting default bank:', error);
        showAlert(error.message || 'Error setting default bank account', 'danger');
    }
}

// Utility functions
async function makeApiRequest(endpoint, method = 'GET', data = null) {
    const token = getCookie('token');
    if (!token) {
        window.location.href = '../v10/login.html';
        throw new Error('Authentication required.');
    }

    const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const options = {
        method,
        headers,
        credentials: 'include',
    };

    if (data !== null && !['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase())) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = resolveUrl(`${API_BASE_PATH}${normalizedEndpoint}`);
    const response = await fetch(url, options);

    if (response.status === 401) {
        window.location.href = '../v10/login.html';
        throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 204 || method.toUpperCase() === 'DELETE') {
        return null;
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        return {};
    }

    if (!response.ok) {
        const message = payload?.message || payload?.error || 'An error occurred';
        throw new Error(message);
    }

    return payload ?? {};
}

function showAlert(message, type = 'info') {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('.content-area .container-fluid').prepend(alertHtml);
    
    setTimeout(() => {
        $('.alert').fadeOut(function() {
            $(this).remove();
        });
    }, 5000);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
