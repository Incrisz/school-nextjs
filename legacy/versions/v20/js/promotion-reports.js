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

    const sessionSelect = document.getElementById('reports-session');
    const termSelect = document.getElementById('reports-term');
    const classSelect = document.getElementById('reports-class');
    const loadButton = document.getElementById('reports-load');
    const feedbackAlert = document.getElementById('reports-feedback');
    const tableBody = document.getElementById('reports-table-body');
    const summaryLabel = document.getElementById('reports-summary');
    const exportCsvButton = document.getElementById('reports-export-csv');
    const exportPdfButton = document.getElementById('reports-export-pdf');
    const refreshButton = document.getElementById('reports-refresh');

    let cachedRows = [];

    document.addEventListener('DOMContentLoaded', async () => {
        await Promise.all([
            loadSessions(),
            loadClasses(),
        ]);

        if (sessionSelect) {
            sessionSelect.addEventListener('change', async () => {
                await loadTerms(sessionSelect.value);
            });
        }

        if (loadButton) {
            loadButton.addEventListener('click', loadReports);
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', loadReports);
        }

        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', () => exportReports('csv'));
        }

        if (exportPdfButton) {
            exportPdfButton.addEventListener('click', () => exportReports('pdf'));
        }
    });

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

    async function loadSessions() {
        if (!sessionSelect) return;
        clearSelect(sessionSelect);
        sessionSelect.innerHTML = '<option value="">All sessions</option>';

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions`, { headers });
            if (!response.ok) throw new Error('Failed to load sessions');
            const sessions = await response.json();

            sessions.forEach((session) => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.name;
                sessionSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadTerms(sessionId) {
        if (!termSelect) return;
        clearSelect(termSelect);
        termSelect.innerHTML = '<option value="">All terms</option>';

        if (!sessionId) {
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, { headers });
            if (!response.ok) throw new Error('Failed to load terms');
            const terms = await response.json();

            terms.forEach((term) => {
                const option = document.createElement('option');
                option.value = term.id;
                option.textContent = term.name;
                termSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadClasses() {
        if (!classSelect) return;
        clearSelect(classSelect);
        classSelect.innerHTML = '<option value="">All classes</option>';

        try {
            const response = await fetch(`${backend_url}/api/v1/classes`, { headers });
            if (!response.ok) throw new Error('Failed to load classes');
            const payload = await response.json();
            const classes = payload?.data ?? payload;

            classes.forEach((item) => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                classSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function loadReports() {
        resetFeedback();
        tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

        try {
            const params = new URLSearchParams();
            if (sessionSelect && sessionSelect.value) params.set('session_id', sessionSelect.value);
            if (termSelect && termSelect.value) params.set('term_id', termSelect.value);
            if (classSelect && classSelect.value) params.set('school_class_id', classSelect.value);

            const response = await fetch(`${backend_url}/api/v1/promotions/history?${params.toString()}`, { headers });
            if (!response.ok) throw new Error('Failed to load promotion history.');
            const payload = await response.json();
            const rows = Array.isArray(payload.data) ? payload.data : payload.data?.data ?? payload;

            cachedRows = rows;
            renderReport(rows);
        } catch (error) {
            console.error('Promotion report error:', error);
            showFeedback(error.message || 'Unable to load promotion history.', 'danger');
            tableBody.innerHTML = '<tr><td colspan="5">Unable to load promotion history.</td></tr>';
            summaryLabel.textContent = '0 records';
        }
    }

    function renderReport(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No promotion records found.</td></tr>';
            summaryLabel.textContent = '0 records';
            return;
        }

        tableBody.innerHTML = '';

        rows.forEach((row) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDateTime(row.promoted_at || row.created_at)}</td>
                <td>${escapeHtml(row.student_name || '')}</td>
                <td>${escapeHtml(row.from_class || '')}</td>
                <td>${escapeHtml(row.to_class || '')}</td>
                <td>${escapeHtml(row.performed_by || '')}</td>
            `;
            tableBody.appendChild(tr);
        });

        summaryLabel.textContent = `${rows.length} record(s)`;
    }

    function exportReports(format) {
        if (!cachedRows || cachedRows.length === 0) {
            showFeedback('Load report data before exporting.', 'warning');
            return;
        }

        if (format === 'csv') {
            exportCsv();
        } else if (format === 'pdf') {
            exportPdf();
        }
    }

    function exportCsv() {
        const header = ['Date', 'Student', 'From', 'To', 'Performed By'];
        const rows = cachedRows.map((row) => [
            formatDateTime(row.promoted_at || row.created_at),
            row.student_name || '',
            row.from_class || '',
            row.to_class || '',
            row.performed_by || '',
        ]);

        let csvContent = header.join(',') + '\n';
        rows.forEach((row) => {
            csvContent += row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `promotion-report-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportPdf() {
        // For now, direct backend export assumed.
        showFeedback('PDF export will open shortly...', 'info');
        const params = new URLSearchParams();
        if (sessionSelect && sessionSelect.value) params.set('session_id', sessionSelect.value);
        if (termSelect && termSelect.value) params.set('term_id', termSelect.value);
        if (classSelect && classSelect.value) params.set('school_class_id', classSelect.value);

        window.open(`${backend_url}/api/v1/promotions/history/export.pdf?${params.toString()}`, '_blank');
    }

    function showFeedback(message, type = 'success') {
        if (!feedbackAlert || !message) {
            return;
        }
        feedbackAlert.textContent = message;
        feedbackAlert.className = `alert alert-${type}`;
        feedbackAlert.style.display = 'block';
    }

    function resetFeedback() {
        if (!feedbackAlert) {
            return;
        }
        feedbackAlert.textContent = '';
        feedbackAlert.className = 'alert';
        feedbackAlert.style.display = 'none';
    }

    function clearSelect(select) {
        if (select) {
            select.innerHTML = '';
        }
    }

    function formatDateTime(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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
})();
