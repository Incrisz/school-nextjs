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
        dateInput: document.getElementById('attendance-date'),
        sessionSelect: document.getElementById('attendance-session'),
        termSelect: document.getElementById('attendance-term'),
        classSelect: document.getElementById('attendance-class'),
        classArmSelect: document.getElementById('attendance-class-arm'),
        classSectionSelect: document.getElementById('attendance-class-section'),
        loadButton: document.getElementById('attendance-load-students'),
        saveButton: document.getElementById('attendance-save'),
        feedback: document.getElementById('student-attendance-feedback'),
        tableBody: document.getElementById('student-attendance-table-body'),
        summaryLabel: document.getElementById('student-attendance-summary'),
        summaryBadges: {
            present: document.getElementById('summary-present'),
            absent: document.getElementById('summary-absent'),
            late: document.getElementById('summary-late'),
            excused: document.getElementById('summary-excused'),
        },
        refreshButton: document.getElementById('student-attendance-refresh'),
        exportCsvButton: document.getElementById('student-attendance-export-csv'),
        exportPdfButton: document.getElementById('student-attendance-export-pdf'),
        historyBody: document.getElementById('student-attendance-history'),
    };

    const STATUS_OPTIONS = [
        { value: '', label: 'Select status' },
        { value: 'present', label: 'Present' },
        { value: 'absent', label: 'Absent' },
        { value: 'late', label: 'Late' },
        { value: 'excused', label: 'Excused' },
    ];

    const state = {
        students: [],
        attendanceMap: new Map(), // studentId -> record
    };

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        if (elements.dateInput) {
            elements.dateInput.value = new Date().toISOString().slice(0, 10);
        }

        bindEvents();

        Promise.all([
            loadSessions(),
            loadClasses(),
        ]).then(() => {
            if (elements.sessionSelect?.value) {
                loadTerms(elements.sessionSelect.value);
            }
        }).finally(loadRecentAttendance);
    }

    function bindEvents() {
        if (elements.sessionSelect) {
            elements.sessionSelect.addEventListener('change', async (event) => {
                await loadTerms(event.target.value);
                await loadStudents();
            });
        }

        if (elements.classSelect) {
            elements.classSelect.addEventListener('change', async (event) => {
                await loadClassArms(event.target.value);
                await loadStudents();
            });
        }

        if (elements.classArmSelect) {
            elements.classArmSelect.addEventListener('change', async () => {
                await loadClassSections(
                    elements.classSelect.value,
                    elements.classArmSelect.value
                );
                await loadStudents();
            });
        }

        if (elements.classSectionSelect) {
            elements.classSectionSelect.addEventListener('change', loadStudents);
        }

        if (elements.termSelect) {
            elements.termSelect.addEventListener('change', loadStudents);
        }

        if (elements.dateInput) {
            elements.dateInput.addEventListener('change', loadStudents);
        }

        if (elements.loadButton) {
            elements.loadButton.addEventListener('click', loadStudents);
        }

        if (elements.saveButton) {
            elements.saveButton.addEventListener('click', saveAttendance);
        }

        document.querySelectorAll('[data-bulk-status]').forEach((button) => {
            button.addEventListener('click', () => {
                bulkUpdateStatuses(button.getAttribute('data-bulk-status'));
            });
        });

        if (elements.refreshButton) {
            elements.refreshButton.addEventListener('click', async () => {
                resetFeedback();
                await Promise.all([
                    loadSessions(),
                    loadClasses(),
                ]);
                await loadStudents();
                await loadRecentAttendance();
            });
        }

        if (elements.exportCsvButton) {
            elements.exportCsvButton.addEventListener('click', () => exportAttendance('csv'));
        }

        if (elements.exportPdfButton) {
            elements.exportPdfButton.addEventListener('click', () => exportAttendance('pdf'));
        }
    }

    async function loadSessions() {
        if (!elements.sessionSelect) {
            return;
        }

        clearSelect(elements.sessionSelect, 'Select session');

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions`, { headers });
            if (!response.ok) throw new Error('Unable to load sessions');

            const payload = await response.json();
            const sessions = Array.isArray(payload) ? payload : (payload.data ?? []);

            sessions.forEach((session) => {
                const option = new Option(session.name, session.id);
                elements.sessionSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadTerms(sessionId) {
        if (!elements.termSelect) {
            return;
        }

        clearSelect(elements.termSelect, 'Select term');

        if (!sessionId) {
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, { headers });
            if (!response.ok) throw new Error('Unable to load terms');

            const terms = await response.json();
            (Array.isArray(terms) ? terms : []).forEach((term) => {
                const option = new Option(term.name, term.id);
                elements.termSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadClasses() {
        if (!elements.classSelect) {
            return;
        }

        clearSelect(elements.classSelect, 'Select class');

        try {
            const response = await fetch(`${backend_url}/api/v1/classes`, { headers });
            if (!response.ok) throw new Error('Unable to load classes');

            const payload = await response.json();
            const classes = payload?.data ?? payload ?? [];

            classes.forEach((schoolClass) => {
                const option = new Option(schoolClass.name, schoolClass.id);
                elements.classSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadClassArms(classId) {
        if (!elements.classArmSelect) {
            return;
        }

        clearSelect(elements.classArmSelect, 'Select arm');
        clearSelect(elements.classSectionSelect, 'Select section');

        if (!classId) {
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms`, { headers });
            if (!response.ok) throw new Error('Unable to load class arms');

            const payload = await response.json();
            (payload ?? []).forEach((arm) => {
                const option = new Option(arm.name, arm.id);
                elements.classArmSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadClassSections(classId, armId) {
        if (!elements.classSectionSelect) {
            return;
        }

        clearSelect(elements.classSectionSelect, 'Select section');

        if (!classId || !armId) {
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`, { headers });
            if (!response.ok) throw new Error('Unable to load sections');

            const payload = await response.json();
            (payload ?? []).forEach((section) => {
                const option = new Option(section.name, section.id);
                elements.classSectionSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadStudents() {
        if (!elements.classSelect?.value || !elements.sessionSelect?.value || !elements.dateInput?.value) {
            return;
        }

        setLoadingState(true);
        resetFeedback();
        elements.tableBody.innerHTML = `<tr><td colspan="6">Loading students...</td></tr>`;

        const params = new URLSearchParams({ per_page: 200 });
        appendIfValue(params, 'school_class_id', elements.classSelect.value);
        appendIfValue(params, 'class_arm_id', elements.classArmSelect.value);
        appendIfValue(params, 'class_section_id', elements.classSectionSelect.value);
        appendIfValue(params, 'current_session_id', elements.sessionSelect.value);
        appendIfValue(params, 'current_term_id', elements.termSelect.value);

        try {
            const studentsResponse = await fetch(`${backend_url}/api/v1/students?${params.toString()}`, { headers });
            if (!studentsResponse.ok) throw new Error('Unable to load students for the selected class');

            const studentsPayload = await studentsResponse.json();
            const students = studentsPayload?.data ?? [];

            state.students = students;

            await loadAttendanceRecords();
            renderStudentsTable();
            updateSummary();
        } catch (error) {
            elements.tableBody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
            showFeedback(error.message, 'danger');
        } finally {
            setLoadingState(false);
        }
    }

    async function loadAttendanceRecords() {
        state.attendanceMap.clear();

        const params = new URLSearchParams({
            per_page: 200,
            date: elements.dateInput.value,
        });

        appendIfValue(params, 'school_class_id', elements.classSelect.value);
        appendIfValue(params, 'class_arm_id', elements.classArmSelect.value);
        appendIfValue(params, 'class_section_id', elements.classSectionSelect.value);

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/students?${params.toString()}`, { headers });
            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            const records = payload?.data ?? [];

            records.forEach((record) => {
                if (record?.student?.id) {
                    state.attendanceMap.set(record.student.id, record);
                }
            });
        } catch (error) {
            console.warn('Failed to fetch attendance records:', error);
        }
    }

    function renderStudentsTable() {
        if (!Array.isArray(state.students) || state.students.length === 0) {
            elements.tableBody.innerHTML = `<tr><td colspan="6">No students found for the selected filters.</td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        state.students.forEach((student, index) => {
            const attendance = state.attendanceMap.get(student.id);
            const row = document.createElement('tr');
            row.dataset.studentId = student.id;
            if (attendance?.id) {
                row.dataset.attendanceId = attendance.id;
            }

            const numberCell = document.createElement('td');
            numberCell.textContent = String(index + 1);

            const studentCell = document.createElement('td');
            studentCell.innerHTML = `<strong>${escapeHtml(student.first_name ?? '')} ${escapeHtml(student.last_name ?? '')}</strong>`;

            const admissionCell = document.createElement('td');
            admissionCell.textContent = student.admission_no ?? '—';

            const statusCell = document.createElement('td');
            const statusSelect = document.createElement('select');
            statusSelect.className = 'form-control student-attendance-select';
            statusSelect.dataset.studentId = student.id;

            STATUS_OPTIONS.forEach((option) => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.label;
                if (attendance?.status === option.value) {
                    opt.selected = true;
                }
                statusSelect.appendChild(opt);
            });

            statusSelect.addEventListener('change', () => {
                updateSummary();
                if (statusSelect.value && !row.dataset.attendanceId) {
                    row.classList.add('table-warning');
                } else {
                    row.classList.remove('table-warning');
                }
            });

            statusCell.appendChild(statusSelect);

            const updatedCell = document.createElement('td');
            updatedCell.textContent = attendance?.updated_at ? formatDate(attendance.updated_at) : '—';

            const actionsCell = document.createElement('td');
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'btn btn-sm btn-outline-secondary';
            clearButton.textContent = attendance?.id ? 'Clear Record' : 'Reset';
            clearButton.addEventListener('click', () => clearAttendance(row, statusSelect));
            actionsCell.appendChild(clearButton);

            row.appendChild(numberCell);
            row.appendChild(studentCell);
            row.appendChild(admissionCell);
            row.appendChild(statusCell);
            row.appendChild(updatedCell);
            row.appendChild(actionsCell);

            fragment.appendChild(row);
        });

        elements.tableBody.innerHTML = '';
        elements.tableBody.appendChild(fragment);
    }

    async function clearAttendance(row, statusSelect) {
        const attendanceId = row.dataset.attendanceId;

        statusSelect.value = '';
        row.classList.remove('table-warning');

        if (!attendanceId) {
            updateSummary();
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/students/${attendanceId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) throw new Error('Failed to delete attendance record');

            state.attendanceMap.delete(statusSelect.dataset.studentId);
            delete row.dataset.attendanceId;
            showFeedback('Attendance record removed.', 'success');
            updateSummary();
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    function bulkUpdateStatuses(status) {
        document.querySelectorAll('.student-attendance-select').forEach((select) => {
            select.value = status;
        });
        updateSummary();
    }

    async function saveAttendance() {
        if (!elements.saveButton) {
            return;
        }

        if (!elements.dateInput?.value) {
            showFeedback('Select a date before saving attendance.', 'danger');
            return;
        }

        const entries = [];
        document.querySelectorAll('.student-attendance-select').forEach((select) => {
            if (!select.value) {
                return;
            }

            entries.push({
                student_id: select.dataset.studentId,
                status: select.value,
            });
        });

        if (entries.length === 0) {
            showFeedback('Set at least one student status before saving.', 'warning');
            return;
        }

        const payload = {
            date: elements.dateInput.value,
            session_id: elements.sessionSelect?.value || null,
            term_id: elements.termSelect?.value || null,
            school_class_id: elements.classSelect?.value || null,
            class_arm_id: elements.classArmSelect?.value || null,
            class_section_id: elements.classSectionSelect?.value || null,
            entries,
        };

        elements.saveButton.disabled = true;
        elements.saveButton.textContent = 'Saving...';

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/students`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.message ?? 'Unable to save attendance');
            }

            showFeedback('Attendance saved successfully.', 'success');
            await loadAttendanceRecords();
            renderStudentsTable();
            updateSummary();
            await loadRecentAttendance();
        } catch (error) {
            showFeedback(error.message, 'danger');
        } finally {
            if (elements.saveButton) {
                elements.saveButton.disabled = false;
                elements.saveButton.textContent = 'Save Attendance';
            }
        }
    }

    function exportAttendance(type) {
        if (!elements.dateInput?.value) {
            showFeedback('Select a date before exporting.', 'warning');
            return;
        }

        const params = new URLSearchParams({
            date: elements.dateInput.value,
        });

        appendIfValue(params, 'school_class_id', elements.classSelect?.value);
        appendIfValue(params, 'class_arm_id', elements.classArmSelect?.value);
        appendIfValue(params, 'class_section_id', elements.classSectionSelect?.value);

        const endpoint = type === 'pdf' ? 'export.pdf' : 'export.csv';
        const url = `${backend_url}/api/v1/attendance/students/${endpoint}?${params.toString()}`;
        window.open(url, '_blank');
    }

    async function loadRecentAttendance() {
        if (!elements.historyBody) {
            return;
        }

        const params = new URLSearchParams({
            per_page: 5,
        });

        try {
            const response = await fetch(`${backend_url}/api/v1/attendance/students?${params.toString()}`, { headers });
            if (!response.ok) {
                throw new Error('Unable to fetch recent attendance');
            }

            const payload = await response.json();
            const records = payload?.data ?? [];

            if (records.length === 0) {
                elements.historyBody.innerHTML = `<tr><td colspan="5">No recent attendance records.</td></tr>`;
                return;
            }

            const fragment = document.createDocumentFragment();
            records.forEach((record) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(record.date)}</td>
                    <td>${escapeHtml(record.student?.name ?? 'Unknown')}</td>
                    <td>${(record.status ?? '').toUpperCase()}</td>
                    <td>${escapeHtml(record.class?.name ?? '—')}</td>
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

    function updateSummary() {
        const counts = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
        };

        document.querySelectorAll('.student-attendance-select').forEach((select) => {
            if (counts.hasOwnProperty(select.value)) {
                counts[select.value] += 1;
            }
        });

        elements.summaryLabel.textContent = `Loaded ${state.students.length} students for ${formatDate(elements.dateInput.value)}`;
        elements.summaryBadges.present.textContent = `Present: ${counts.present}`;
        elements.summaryBadges.absent.textContent = `Absent: ${counts.absent}`;
        elements.summaryBadges.late.textContent = `Late: ${counts.late}`;
        elements.summaryBadges.excused.textContent = `Excused: ${counts.excused}`;
    }

    function setLoadingState(isLoading) {
        if (elements.loadButton) {
            elements.loadButton.disabled = isLoading;
        }
    }

    function clearSelect(selectElement, placeholder = '') {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        if (placeholder !== null) {
            const option = new Option(placeholder, '');
            selectElement.appendChild(option);
        }
    }

    function appendIfValue(params, key, value) {
        if (value) {
            params.set(key, value);
        }
    }

    function showFeedback(message, variant = 'info') {
        if (!elements.feedback) {
            return;
        }

        elements.feedback.className = `alert alert-${variant}`;
        elements.feedback.textContent = message;
        elements.feedback.style.display = 'block';
    }

    function resetFeedback() {
        if (!elements.feedback) {
            return;
        }

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
