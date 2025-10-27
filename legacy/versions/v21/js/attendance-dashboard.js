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
        fromInput: document.getElementById('report-from'),
        toInput: document.getElementById('report-to'),
        classSelect: document.getElementById('report-class'),
        departmentSelect: document.getElementById('report-department'),
        runButton: document.getElementById('attendance-report-run'),
        exportStudentCsv: document.getElementById('attendance-report-export-csv'),
        exportStaffPdf: document.getElementById('attendance-report-export-pdf'),
        feedback: document.getElementById('attendance-dashboard-feedback'),
        studentTotal: document.getElementById('student-attendance-total'),
        studentUnique: document.getElementById('student-attendance-unique'),
        staffTotal: document.getElementById('staff-attendance-total'),
        staffUnique: document.getElementById('staff-attendance-unique'),
        studentStatusList: document.getElementById('student-status-breakdown'),
        staffStatusList: document.getElementById('staff-status-breakdown'),
        studentsAtRiskBody: document.getElementById('students-at-risk-body'),
        staffDepartmentBody: document.getElementById('staff-department-body'),
    };

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        if (elements.fromInput) {
            const from = new Date();
            from.setDate(from.getDate() - 14);
            elements.fromInput.value = from.toISOString().slice(0, 10);
        }

        if (elements.toInput) {
            elements.toInput.value = new Date().toISOString().slice(0, 10);
        }

        bindEvents();

        Promise.all([
            loadClasses(),
            loadDepartments(),
        ]).then(runReport);
    }

    function bindEvents() {
        if (elements.runButton) {
            elements.runButton.addEventListener('click', runReport);
        }

        if (elements.exportStudentCsv) {
            elements.exportStudentCsv.addEventListener('click', exportStudentCsv);
        }

        if (elements.exportStaffPdf) {
            elements.exportStaffPdf.addEventListener('click', exportStaffPdf);
        }
    }

    function getFilters() {
        return {
            from: elements.fromInput?.value || '',
            to: elements.toInput?.value || '',
            classId: elements.classSelect?.value || '',
            department: elements.departmentSelect?.value || '',
        };
    }

    async function runReport() {
        resetFeedback();
        setLoadingState(true);

        const filters = getFilters();

        try {
            const [studentReport, staffReport] = await Promise.all([
                fetchStudentReport(filters),
                fetchStaffReport(filters),
            ]);

            updateStudentSummary(studentReport);
            updateStaffSummary(staffReport);
        } catch (error) {
            showFeedback(error.message, 'danger');
        } finally {
            setLoadingState(false);
        }
    }

    async function fetchStudentReport(filters) {
        const params = new URLSearchParams();
        appendIfValue(params, 'from', filters.from);
        appendIfValue(params, 'to', filters.to);
        appendIfValue(params, 'school_class_id', filters.classId);

        const response = await fetch(`${backend_url}/api/v1/attendance/students/report?${params.toString()}`, { headers });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message ?? 'Unable to load student attendance report');
        }

        return response.json();
    }

    async function fetchStaffReport(filters) {
        const params = new URLSearchParams();
        appendIfValue(params, 'from', filters.from);
        appendIfValue(params, 'to', filters.to);
        appendIfValue(params, 'department', filters.department);

        const response = await fetch(`${backend_url}/api/v1/attendance/staff/report?${params.toString()}`, { headers });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload.message ?? 'Unable to load staff attendance report');
        }

        return response.json();
    }

    function updateStudentSummary(report) {
        elements.studentTotal.textContent = report?.summary?.total_records ?? 0;
        elements.studentUnique.textContent = report?.summary?.unique_students ?? 0;

        const breakdown = report?.status_breakdown ?? {};
        updateStatusList(elements.studentStatusList, {
            present: breakdown.present ?? 0,
            absent: breakdown.absent ?? 0,
            late: breakdown.late ?? 0,
            excused: breakdown.excused ?? 0,
        });

        const atRisk = report?.students_at_risk ?? [];
        if (!Array.isArray(atRisk) || atRisk.length === 0) {
            elements.studentsAtRiskBody.innerHTML = `<tr><td colspan="4">No students flagged.</td></tr>`;
        } else {
            const fragment = document.createDocumentFragment();
            atRisk.forEach((entry) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(entry.student_name ?? 'Unknown')}</td>
                    <td>${escapeHtml(entry.admission_no ?? '—')}</td>
                    <td>${entry.absent_days ?? 0}</td>
                    <td>${entry.late_days ?? 0}</td>
                `;
                fragment.appendChild(row);
            });
            elements.studentsAtRiskBody.innerHTML = '';
            elements.studentsAtRiskBody.appendChild(fragment);
        }
    }

    function updateStaffSummary(report) {
        elements.staffTotal.textContent = report?.summary?.total_records ?? 0;
        elements.staffUnique.textContent = report?.summary?.unique_staff ?? 0;

        const breakdown = report?.status_breakdown ?? {};
        updateStatusList(elements.staffStatusList, {
            present: breakdown.present ?? 0,
            absent: breakdown.absent ?? 0,
            late: breakdown.late ?? 0,
            on_leave: breakdown.on_leave ?? 0,
        });

        const departments = report?.department_breakdown ?? {};
        const entries = Object.entries(departments);

        if (entries.length === 0) {
            elements.staffDepartmentBody.innerHTML = `<tr><td colspan="2">No department data.</td></tr>`;
        } else {
            const fragment = document.createDocumentFragment();
            entries.forEach(([department, total]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(department)}</td>
                    <td>${total}</td>
                `;
                fragment.appendChild(row);
            });
            elements.staffDepartmentBody.innerHTML = '';
            elements.staffDepartmentBody.appendChild(fragment);
        }
    }

    async function loadClasses() {
        if (!elements.classSelect) return;
        clearSelect(elements.classSelect, 'All classes');

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
            console.warn(error.message);
        }
    }

    async function loadDepartments() {
        if (!elements.departmentSelect) return;
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

    function exportStudentCsv() {
        const filters = getFilters();
        const params = new URLSearchParams();
        appendIfValue(params, 'from', filters.from);
        appendIfValue(params, 'to', filters.to);
        appendIfValue(params, 'school_class_id', filters.classId);
        window.open(`${backend_url}/api/v1/attendance/students/export.csv?${params.toString()}`, '_blank');
    }

    function exportStaffPdf() {
        const filters = getFilters();
        const params = new URLSearchParams();
        appendIfValue(params, 'from', filters.from);
        appendIfValue(params, 'to', filters.to);
        appendIfValue(params, 'department', filters.department);
        window.open(`${backend_url}/api/v1/attendance/staff/export.pdf?${params.toString()}`, '_blank');
    }

    function updateStatusList(listElement, counts) {
        if (!listElement) return;

        listElement.querySelectorAll('li').forEach((item) => {
            const statusKey = item.getAttribute('data-status');
            const badge = item.querySelector('.badge');
            if (!statusKey || !badge) {
                return;
            }
            badge.textContent = counts[statusKey] ?? 0;
        });
    }

    function setLoadingState(isLoading) {
        if (elements.runButton) {
            elements.runButton.disabled = isLoading;
            elements.runButton.textContent = isLoading ? 'Loading...' : 'Run Report';
        }
    }

    function clearSelect(selectElement, placeholder) {
        if (!selectElement) return;
        selectElement.innerHTML = '';
        if (placeholder !== null) {
            selectElement.appendChild(new Option(placeholder, ''));
        }
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
