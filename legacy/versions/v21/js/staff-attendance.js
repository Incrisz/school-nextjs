(function () {
    const token = getCookie('token');
    if (!token) {
        window.location.href = '../v10/login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    const elements = {
        dateInput: document.getElementById('staff-attendance-date'),
        branchInput: document.getElementById('staff-attendance-branch'),
        departmentSelect: document.getElementById('staff-attendance-department'),
        searchInput: document.getElementById('staff-search'),
        loadButton: document.getElementById('staff-load'),
        saveButton: document.getElementById('staff-attendance-save'),
        feedback: document.getElementById('staff-attendance-feedback'),
        tableBody: document.getElementById('staff-attendance-table-body'),
        summaryLabel: document.getElementById('staff-attendance-summary'),
        summaryBadges: {
            present: document.getElementById('staff-summary-present'),
            absent: document.getElementById('staff-summary-absent'),
            late: document.getElementById('staff-summary-late'),
            on_leave: document.getElementById('staff-summary-on-leave'),
        },
        refreshButton: document.getElementById('staff-attendance-refresh'),
        exportCsvButton: document.getElementById('staff-attendance-export-csv'),
        exportPdfButton: document.getElementById('staff-attendance-export-pdf'),
        historyBody: document.getElementById('staff-attendance-history'),
    };

    const STATUS_OPTIONS = [
        { value: '', label: 'Select status' },
        { value: 'present', label: 'Present' },
        { value: 'absent', label: 'Absent' },
        { value: 'late', label: 'Late' },
        { value: 'on_leave', label: 'On Leave' },
    ];

    const state = {
        staff: [],
        attendanceMap: new Map(), // staffId -> record
    };

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        if (elements.dateInput) {
            elements.dateInput.value = new Date().toISOString().slice(0, 10);
        }

        bindEvents();

        loadDepartments().then(loadStaffList).then(loadStaffAttendanceHistory);
    }

    function bindEvents() {
        if (elements.loadButton) {
            elements.loadButton.addEventListener('click', loadStaffList);
        }

        if (elements.dateInput) {
            elements.dateInput.addEventListener('change', loadStaffList);
        }

        if (elements.departmentSelect) {
            elements.departmentSelect.addEventListener('change', loadStaffList);
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter') {
                    loadStaffList();
                }
            });
        }

        document.querySelectorAll('[data-staff-bulk-status]').forEach((button) => {
            button.addEventListener('click', () => {
                bulkUpdate(button.getAttribute('data-staff-bulk-status'));
            });
        });

        if (elements.saveButton) {
            elements.saveButton.addEventListener('click', saveStaffAttendance);
        }

        if (elements.refreshButton) {
            elements.refreshButton.addEventListener('click', async () => {
                resetFeedback();
                await loadDepartments();
                await loadStaffList();
                await loadStaffAttendanceHistory();
            });
        }

        if (elements.exportCsvButton) {
            elements.exportCsvButton.addEventListener('click', () => exportStaffAttendance('csv'));
        }

        if (elements.exportPdfButton) {
            elements.exportPdfButton.addEventListener('click', () => exportStaffAttendance('pdf'));
        }
    }

    async function loadDepartments() {
        if (!elements.departmentSelect) {
            return;
        }

        clearSelect(elements.departmentSelect, 'All departments');

        try {
            const response = await fetch(`${backend_url}/api/v1/staff?per_page=200`, { headers });
            if (!response.ok) throw new Error('Unable to load staff list');

            const payload = await response.json();
            const staff = payload?.data ?? [];
            const departments = new Set();

            staff.forEach((member) => {
                if (member.role) {
                    departments.add(member.role);
                }
            });

            Array.from(departments)
                .sort()
                .forEach((dept) => {
                    const option = new Option(dept, dept);
                    elements.departmentSelect.appendChild(option);
                });
        } catch (error) {
            console.warn(error.message);
        }
    }

    async function loadStaffList() {
        if (!elements.dateInput?.value) {
            return;
        }

        setLoadingState(true);
        resetFeedback();
        elements.tableBody.innerHTML = `<tr><td colspan="7">Loading staff...</td></tr>`;

        const params = new URLSearchParams({
            per_page: 200,
        });

        appendIfValue(params, 'role', elements.departmentSelect?.value);
        appendIfValue(params, 'search', elements.searchInput?.value);

        try {
            const response = await fetch(`${backend_url}/api/v1/staff?${params.toString()}`, { headers });
            if (!response.ok) throw new Error('Unable to load staff');

            const payload = await response.json();
            const staff = payload?.data ?? [];
            state.staff = staff;

            await loadStaffAttendanceRecords();
            renderStaffTable();
            updateSummary();
        } catch (error) {
            elements.tableBody.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
            showFeedback(error.message, 'danger');
        } finally {
            setLoadingState(false);
        }
    }

    async function loadStaffAttendanceRecords() {
        state.attendanceMap.clear();

        const params = new URLSearchParams({
            per_page: 200,
            date: elements.dateInput.value,
        });

        appendIfValue(params, 'branch_name', elements.branchInput?.value);
        appendIfValue(params, 'department', elements.departmentSelect?.value);

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/staff?${params.toString()}`, { headers });
            if (!response.ok) return;

            const payload = await response.json();
            const records = payload?.data ?? [];

            records.forEach((record) => {
                if (record?.staff?.id) {
                    state.attendanceMap.set(record.staff.id, record);
                }
            });
        } catch (error) {
            console.warn('Failed to load staff attendance records:', error);
        }
    }

    function renderStaffTable() {
        if (!Array.isArray(state.staff) || state.staff.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="7">No staff records found.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        state.staff.forEach((member, index) => {
            const attendance = state.attendanceMap.get(member.id);
            const row = document.createElement('tr');
            row.dataset.staffId = member.id;
            if (attendance?.id) {
                row.dataset.attendanceId = attendance.id;
            }

            const numberCell = document.createElement('td');
            numberCell.textContent = String(index + 1);

            const nameCell = document.createElement('td');
            nameCell.innerHTML = `<strong>${escapeHtml(member.full_name ?? '')}</strong>`;

            const emailCell = document.createElement('td');
            emailCell.textContent = member.email ?? '—';

            const departmentCell = document.createElement('td');
            departmentCell.textContent = member.role ?? '—';

            const statusCell = document.createElement('td');
            const select = document.createElement('select');
            select.className = 'form-control staff-attendance-select';
            select.dataset.staffId = member.id;

            STATUS_OPTIONS.forEach((option) => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.label;
                if (attendance?.status === option.value) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });

            select.addEventListener('change', () => {
                updateSummary();
                if (select.value && !row.dataset.attendanceId) {
                    row.classList.add('table-warning');
                } else {
                    row.classList.remove('table-warning');
                }
            });

            statusCell.appendChild(select);

            const updatedCell = document.createElement('td');
            updatedCell.textContent = attendance?.updated_at ? formatDate(attendance.updated_at) : '—';

            const actionsCell = document.createElement('td');
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'btn btn-sm btn-outline-secondary';
            clearButton.textContent = attendance?.id ? 'Clear Record' : 'Reset';
            clearButton.addEventListener('click', () => clearStaffAttendance(row, select));
            actionsCell.appendChild(clearButton);

            row.appendChild(numberCell);
            row.appendChild(nameCell);
            row.appendChild(emailCell);
            row.appendChild(departmentCell);
            row.appendChild(statusCell);
            row.appendChild(updatedCell);
            row.appendChild(actionsCell);

            fragment.appendChild(row);
        });

        elements.tableBody.innerHTML = '';
        elements.tableBody.appendChild(fragment);
    }

    async function clearStaffAttendance(row, select) {
        const attendanceId = row.dataset.attendanceId;

        select.value = '';
        row.classList.remove('table-warning');

        if (!attendanceId) {
            updateSummary();
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/staff/${attendanceId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) throw new Error('Failed to delete staff attendance record');

            state.attendanceMap.delete(select.dataset.staffId);
            delete row.dataset.attendanceId;
            showFeedback('Staff attendance record removed.', 'success');
            updateSummary();
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function saveStaffAttendance() {
        if (!elements.dateInput?.value) {
            showFeedback('Select a date before saving attendance.', 'danger');
            return;
        }

        const entries = [];
        document.querySelectorAll('.staff-attendance-select').forEach((select) => {
            if (select.value) {
                entries.push({
                    staff_id: select.dataset.staffId,
                    status: select.value,
                    branch_name: elements.branchInput?.value || null,
                });
            }
        });

        if (entries.length === 0) {
            showFeedback('Set at least one staff status before saving.', 'warning');
            return;
        }

        const payload = {
            date: elements.dateInput.value,
            branch_name: elements.branchInput?.value || null,
            entries,
        };

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = 'Saving...';

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/staff`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.message ?? 'Unable to save staff attendance');
            }

            showFeedback('Staff attendance saved successfully.', 'success');
            await loadStaffAttendanceRecords();
            renderStaffTable();
            updateSummary();
            await loadStaffAttendanceHistory();
        } catch (error) {
            showFeedback(error.message, 'danger');
        } finally {
            elements.saveButton.disabled = false;
            elements.saveButton.textContent = 'Save Attendance';
        }
    }

    async function loadStaffAttendanceHistory() {
        if (!elements.historyBody) {
            return;
        }

        const params = new URLSearchParams({
            per_page: 5,
        });

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/staff?${params.toString()}`, { headers });
            if (!response.ok) {
                throw new Error('Unable to fetch staff attendance history');
            }

            const payload = await response.json();
            const records = payload?.data ?? [];

            if (records.length === 0) {
                elements.historyBody.innerHTML = `<tr><td colspan="5">No recent staff attendance records.</td></tr>`;
                return;
            }

            const fragment = document.createDocumentFragment();
            records.forEach((record) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(record.date)}</td>
                    <td>${escapeHtml(record.staff?.name ?? 'Unknown')}</td>
                    <td>${(record.status ?? '').toUpperCase()}</td>
                    <td>${escapeHtml(record.branch_name ?? '—')}</td>
                    <td>${escapeHtml(record.recorded_by?.name ?? '—')}</td>
                `;
                fragment.appendChild(row);
            });

            elements.historyBody.innerHTML = '';
            elements.historyBody.appendChild(fragment);
        } catch (error) {
            console.warn(error.message);
        }
    }

    function bulkUpdate(status) {
        document.querySelectorAll('.staff-attendance-select').forEach((select) => {
            select.value = status;
        });
        updateSummary();
    }

    function exportStaffAttendance(type) {
        if (!elements.dateInput?.value) {
            showFeedback('Select a date before exporting.', 'warning');
            return;
        }

        const params = new URLSearchParams({
            date: elements.dateInput.value,
        });

        appendIfValue(params, 'branch_name', elements.branchInput?.value);
        appendIfValue(params, 'department', elements.departmentSelect?.value);

        const endpoint = type === 'pdf' ? 'export.pdf' : 'export.csv';
        const url = `${backend_url}/api/v1/attendance/staff/${endpoint}?${params.toString()}`;
        window.open(url, '_blank');
    }

    function updateSummary() {
        const counts = {
            present: 0,
            absent: 0,
            late: 0,
            on_leave: 0,
        };

        document.querySelectorAll('.staff-attendance-select').forEach((select) => {
            if (counts.hasOwnProperty(select.value)) {
                counts[select.value] += 1;
            }
        });

        elements.summaryLabel.textContent = `Loaded ${state.staff.length} staff for ${formatDate(elements.dateInput.value)}`;
        elements.summaryBadges.present.textContent = `Present: ${counts.present}`;
        elements.summaryBadges.absent.textContent = `Absent: ${counts.absent}`;
        elements.summaryBadges.late.textContent = `Late: ${counts.late}`;
        elements.summaryBadges.on_leave.textContent = `On Leave: ${counts.on_leave}`;
    }

    function setLoadingState(isLoading) {
        if (elements.loadButton) {
            elements.loadButton.disabled = isLoading;
        }
    }

    function clearSelect(selectElement, placeholder = '') {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        const option = new Option(placeholder, '');
        selectElement.appendChild(option);
    }

    function appendIfValue(params, key, value) {
        if (value) {
            params.set(key, value);
        }
    }

    function showFeedback(message, variant = 'info') {
        if (!elements.feedback) return;
        elements.feedback.className = `alert alert-${variant}`;
        elements.feedback.textContent = message;
        elements.feedback.style.display = 'block';
    }

    function resetFeedback() {
        if (!elements.feedback) return;
        elements.feedback.style.display = 'none';
        elements.feedback.textContent = '';
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleDateString();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

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
})();
