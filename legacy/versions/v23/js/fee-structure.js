// Fee Structure Management
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

let feeItems = [];
let sessions = [];
let classes = [];

function asArray(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && Array.isArray(payload.data)) {
        return payload.data;
    }
    return [];
}

function formatCurrency(value) {
    const amount = Number(value ?? 0);
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Initialize page
$(document).ready(function() {
    loadInitialData();
    setupEventListeners();
});

// Load initial data
async function loadInitialData() {
    try {
        await Promise.all([
            loadFeeItems(),
            loadSessions(),
            loadClasses()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showAlert('Error loading initial data', 'danger');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Fee Item form
    $('#feeItemForm').on('submit', handleFeeItemSubmit);
    
    // Fee Structure form
    $('#feeStructureForm').on('submit', handleFeeStructureSubmit);
    
    // Copy Structure form
    $('#copyStructureForm').on('submit', handleCopyStructure);
    
    // Search and filter
    $('#searchFeeItems').on('keyup', filterFeeItems);
    $('#filterCategory').on('change', filterFeeItems);
    
    // Session change for terms
    $('#filterSession, #structureSession, #fromSession, #toSession').on('change', function() {
        const sessionId = $(this).val();
        const targetSelect = $(this).attr('id').replace('Session', 'Term');
        if (sessionId) {
            loadTermsForSession(sessionId, `#${targetSelect}`);
        } else {
            $(`#${targetSelect}`).html('<option value="">Select Term</option>');
        }
    });
    
    // Fee item change to populate default amount
    $('#structureFeeItem').on('change', function() {
        const feeItemId = $(this).val();
        const feeItem = feeItems.find(item => item.id === feeItemId);
        if (feeItem) {
            $('#structureAmount').val(feeItem.default_amount);
        }
    });
}

// Load fee items
async function loadFeeItems() {
    try {
        const payload = await makeApiRequest('/fees/items?per_page=100', 'GET');
        feeItems = asArray(payload);
        renderFeeItems(feeItems);
        populateFeeItemSelects();
    } catch (error) {
        console.error('Error loading fee items:', error);
        showAlert(error.message || 'Error loading fee items', 'danger');
        $('#feeItemsTableBody').html(`
            <tr><td colspan="5" class="text-center text-danger">Error loading fee items</td></tr>
        `);
    }
}

// Render fee items table
function renderFeeItems(items) {
    const tbody = $('#feeItemsTableBody');
    
    if (items.length === 0) {
        tbody.html(`
            <tr><td colspan="5" class="text-center">No fee items found</td></tr>
        `);
        return;
    }
    
    tbody.empty();
    items.forEach(item => {
        tbody.append(`
            <tr>
                <td>${escapeHtml(item.name || '')}</td>
                <td>${escapeHtml(item.category || '-')}</td>
                <td>${formatCurrency(item.default_amount)}</td>
                <td>
                    <span class="badge bg-${item.is_active ? 'success' : 'secondary'}">
                        ${item.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editFeeItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFeeItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });
}

// Filter fee items
function filterFeeItems() {
    const searchTerm = $('#searchFeeItems').val().toLowerCase();
    const category = $('#filterCategory').val();
    
    const filtered = feeItems.filter(item => {
        const name = String(item?.name ?? '').toLowerCase();
        const description = String(item?.description ?? '').toLowerCase();
        const matchesSearch = !searchTerm || name.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !category || (item?.category || '') === category;
        return matchesSearch && matchesCategory;
    });
    
    renderFeeItems(filtered);
}

// Show fee item modal
function showFeeItemModal(itemId = null) {
    $('#feeItemId').val('');
    $('#feeItemForm')[0].reset();
    $('#feeItemActive').prop('checked', true);
    $('#feeItemModalTitle').text('Add Fee Item');
    
    if (itemId) {
        const item = feeItems.find(i => i.id === itemId);
        if (item) {
            $('#feeItemId').val(item.id);
            $('#feeItemName').val(item.name);
            $('#feeItemCategory').val(item.category || '');
            $('#feeItemAmount').val(item.default_amount ?? '');
            $('#feeItemDescription').val(item.description || '');
            $('#feeItemActive').prop('checked', item.is_active);
            $('#feeItemModalTitle').text('Edit Fee Item');
        }
    }
    
    $('#feeItemModal').modal('show');
}

// Handle fee item form submission
async function handleFeeItemSubmit(e) {
    e.preventDefault();
    
    const feeItemId = $('#feeItemId').val();
    const amountValue = Number($('#feeItemAmount').val());
    if (!Number.isFinite(amountValue)) {
        showAlert('Enter a valid amount for the fee item.', 'warning');
        return;
    }

    const data = {
        name: $('#feeItemName').val(),
        category: $('#feeItemCategory').val() || null,
        default_amount: amountValue,
        description: $('#feeItemDescription').val() || null,
        is_active: $('#feeItemActive').is(':checked')
    };
    
    try {
        const method = feeItemId ? 'PUT' : 'POST';
        const url = feeItemId ? `/fees/items/${feeItemId}` : '/fees/items';
        
        await makeApiRequest(url, method, data);
        
        $('#feeItemModal').modal('hide');
        showAlert(`Fee item ${feeItemId ? 'updated' : 'created'} successfully`, 'success');
        await loadFeeItems();
    } catch (error) {
        console.error('Error saving fee item:', error);
        showAlert(error.message || 'Error saving fee item', 'danger');
    }
}

// Edit fee item
function editFeeItem(itemId) {
    showFeeItemModal(itemId);
}

// Delete fee item
async function deleteFeeItem(itemId) {
    if (!confirm('Are you sure you want to delete this fee item?')) {
        return;
    }
    
    try {
        await makeApiRequest(`/fees/items/${itemId}`, 'DELETE');
        showAlert('Fee item deleted successfully', 'success');
        await loadFeeItems();
    } catch (error) {
        console.error('Error deleting fee item:', error);
        showAlert(error.message || 'Error deleting fee item', 'danger');
    }
}

// Load sessions
async function loadSessions() {
    try {
        const payload = await makeApiRequest('/sessions', 'GET');
        sessions = asArray(payload);
        populateSessionSelects();
    } catch (error) {
        console.error('Error loading sessions:', error);
        showAlert(error.message || 'Error loading sessions', 'danger');
    }
}

// Load classes
async function loadClasses() {
    try {
        const payload = await makeApiRequest('/classes', 'GET');
        classes = asArray(payload);
        populateClassSelects();
    } catch (error) {
        console.error('Error loading classes:', error);
        showAlert(error.message || 'Error loading classes', 'danger');
    }
}

// Load terms for a session
async function loadTermsForSession(sessionId, targetSelect) {
    try {
        const payload = await makeApiRequest(`/sessions/${sessionId}/terms`, 'GET');
        const sessionTerms = asArray(payload);
        
        $(targetSelect).html('<option value="">Select Term</option>');

        sessionTerms.forEach(term => {
            $(targetSelect).append(`<option value="${term.id}">${escapeHtml(term.name || '')}</option>`);
        });
    } catch (error) {
        console.error('Error loading terms:', error);
        showAlert(error.message || 'Error loading terms', 'danger');
        $(targetSelect).html('<option value="">Select Term</option>');
    }
}

// Populate select dropdowns
function populateSessionSelects() {
    const selects = ['#filterSession', '#structureSession', '#fromSession', '#toSession'];
    selects.forEach(select => {
        $(select).html('<option value="">Select Session</option>');
        sessions.forEach(session => {
            $(select).append(`<option value="${session.id}">${escapeHtml(session.name)}</option>`);
        });
    });
}

function populateClassSelects() {
    const selects = ['#filterClass', '#structureClass', '#fromClass', '#toClass'];
    selects.forEach(select => {
        const isFilter = select === '#filterClass';
        $(select).html(isFilter ? '<option value="">All Classes</option>' : '<option value="">Select Class</option>');
        classes.forEach(cls => {
            $(select).append(`<option value="${cls.id}">${escapeHtml(cls.name || '')}</option>`);
        });
    });
}

function populateFeeItemSelects() {
    $('#structureFeeItem').html('<option value="">Select Fee Item</option>');
    feeItems.filter(item => item.is_active).forEach(item => {
        $('#structureFeeItem').append(`<option value="${item.id}">${escapeHtml(item.name || '')}</option>`);
    });
}

// Show fee structure modal
function showFeeStructureModal() {
    $('#feeStructureForm')[0].reset();
    $('#structureMandatory').prop('checked', true);
    $('#feeStructureModal').modal('show');
}

// Handle fee structure form submission
async function handleFeeStructureSubmit(e) {
    e.preventDefault();
    
    const amountValue = Number($('#structureAmount').val());
    if (!Number.isFinite(amountValue)) {
        showAlert('Enter a valid amount for the fee structure.', 'warning');
        return;
    }

    const data = {
        class_id: $('#structureClass').val(),
        session_id: $('#structureSession').val(),
        term_id: $('#structureTerm').val(),
        fee_item_id: $('#structureFeeItem').val(),
        amount: amountValue,
        is_mandatory: $('#structureMandatory').is(':checked')
    };
    
    try {
        await makeApiRequest('/fees/structures', 'POST', data);
        
        $('#feeStructureModal').modal('hide');
        showAlert('Fee structure created successfully', 'success');
        
        // Reload if viewing the same session/term
        if ($('#filterSession').val() && $('#filterTerm').val()) {
            await loadFeeStructures();
        }
    } catch (error) {
        console.error('Error creating fee structure:', error);
        showAlert(error.message || 'Error creating fee structure', 'danger');
    }
}

// Load fee structures
async function loadFeeStructures() {
    const sessionId = $('#filterSession').val();
    const termId = $('#filterTerm').val();
    const classId = $('#filterClass').val();
    
    if (!sessionId || !termId) {
        showAlert('Please select both session and term', 'warning');
        return;
    }
    
    try {
        const payload = await makeApiRequest(
            `/fees/structures/by-session-term?session_id=${sessionId}&term_id=${termId}`,
            'GET'
        );
        let structures = asArray(payload);
        if (classId) {
            structures = structures.filter(structure => structure?.class?.id === classId);
        }
        renderFeeStructures(structures);
    } catch (error) {
        console.error('Error loading fee structures:', error);
        showAlert(error.message || 'Error loading fee structures', 'danger');
        $('#feeStructuresContainer').html(`
            <p class="text-center text-danger">Error loading fee structures</p>
        `);
    }
}

// Render fee structures
function renderFeeStructures(structures) {
    const container = $('#feeStructuresContainer');
    
    if (!Array.isArray(structures) || structures.length === 0) {
        container.html(`
            <p class="text-center text-muted">No fee structures found for this session and term</p>
        `);
        return;
    }
    
    container.empty();
    
    structures.forEach(structure => {
        const className = structure?.class?.name ? escapeHtml(structure.class.name) : 'Class';
        const totalAmount = formatCurrency(structure?.total_amount);
        const classCard = $(`
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0">
                        ${className} - 
                        Total: ${totalAmount}
                    </h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Fee Item</th>
                                    <th>Amount (₦)</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);
        
        const tbody = classCard.find('tbody');
        (Array.isArray(structure?.fee_items) ? structure.fee_items : []).forEach(item => {
            const feeItemName = item?.fee_item?.name ? escapeHtml(item.fee_item.name) : '—';
            const amountDisplay = formatCurrency(item?.amount);
            const actionsHtml = item?.id
                ? `<button class="btn btn-sm btn-danger" onclick="deleteFeeStructure('${item.id}')">
                        <i class="fas fa-trash"></i>
                   </button>`
                : '<span class="text-muted">—</span>';
            tbody.append(`
                <tr>
                    <td>${feeItemName}</td>
                    <td>${amountDisplay}</td>
                    <td>
                        <span class="badge bg-${item?.is_mandatory ? 'primary' : 'secondary'}">
                            ${item?.is_mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                    </td>
                    <td>
                        ${actionsHtml}
                    </td>
                </tr>
            `);
        });
        
        container.append(classCard);
    });
}

// Delete fee structure
async function deleteFeeStructure(structureId) {
    if (!structureId) {
        showAlert('Unable to delete fee structure: invalid identifier.', 'danger');
        return;
    }

    if (!confirm('Are you sure you want to delete this fee structure?')) {
        return;
    }
    
    try {
        await makeApiRequest(`/fees/structures/${structureId}`, 'DELETE');
        showAlert('Fee structure deleted successfully', 'success');
        await loadFeeStructures();
    } catch (error) {
        console.error('Error deleting fee structure:', error);
        showAlert(error.message || 'Error deleting fee structure', 'danger');
    }
}

// Show copy structure modal
function showCopyStructureModal() {
    $('#copyStructureForm')[0].reset();
    $('#copyStructureModal').modal('show');
}

// Handle copy structure
async function handleCopyStructure(e) {
    e.preventDefault();
    
    const data = {
        from_class_id: $('#fromClass').val(),
        from_session_id: $('#fromSession').val(),
        from_term_id: $('#fromTerm').val(),
        to_class_id: $('#toClass').val(),
        to_session_id: $('#toSession').val(),
        to_term_id: $('#toTerm').val()
    };
    
    try {
        const payload = await makeApiRequest('/fees/structures/copy', 'POST', data);
        
        $('#copyStructureModal').modal('hide');
        const createdCount = payload?.data?.created_count ?? 0;
        const skippedCount = payload?.data?.skipped_count ?? 0;
        showAlert(
            `Successfully copied ${createdCount} fee structure(s). ${skippedCount} skipped.`,
            'success'
        );
        
        // Reload if viewing the destination session/term
        if ($('#filterSession').val() === data.to_session_id && 
            $('#filterTerm').val() === data.to_term_id) {
            await loadFeeStructures();
        }
    } catch (error) {
        console.error('Error copying fee structure:', error);
        showAlert(error.message || 'Error copying fee structure', 'danger');
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
    if (text === null || text === undefined) {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
