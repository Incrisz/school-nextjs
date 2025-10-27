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

    const sourceSessionSelect = document.getElementById('rollover-source-session');
    const newSessionNameInput = document.getElementById('rollover-new-session-name');
    const newSessionStartInput = document.getElementById('rollover-new-session-start');
    const newSessionEndInput = document.getElementById('rollover-new-session-end');
    const rolloverForm = document.getElementById('rollover-form');
    const rolloverPreviewButton = document.getElementById('rollover-preview');
    const rolloverFeedback = document.getElementById('rollover-feedback');
    const rolloverPreviewCard = document.getElementById('rollover-preview-card');
    const rolloverPreviewBody = document.getElementById('rollover-preview-body');
    const notesInput = document.getElementById('rollover-notes');

    document.addEventListener('DOMContentLoaded', async () => {
        await loadSessions();

        if (rolloverPreviewButton) {
            rolloverPreviewButton.addEventListener('click', handlePreview);
        }

        if (rolloverForm) {
            rolloverForm.addEventListener('submit', handleSubmit);
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
        if (!sourceSessionSelect) return;

        clearSelect(sourceSessionSelect);
        sourceSessionSelect.innerHTML = '<option value="">Select session to copy from</option>';

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions`, { headers });
            if (!response.ok) throw new Error('Failed to load sessions.');
            const sessions = await response.json();

            sessions.forEach((session) => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.name;
                sourceSessionSelect.appendChild(option);
            });
        } catch (error) {
            showFeedback(error.message, 'danger');
        }
    }

    async function handlePreview(event) {
        event.preventDefault();
        resetFeedback();

        const payload = buildPayload(false);
        if (!payload) return;

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/${payload.source_session_id}/terms`, { headers });
            if (!response.ok) throw new Error('Unable to load source session term structure.');
            const terms = await response.json();

            if (!Array.isArray(terms) || terms.length === 0) {
                rolloverPreviewBody.innerHTML = '<tr><td colspan="3">Source session has no terms to clone.</td></tr>';
            } else {
                rolloverPreviewBody.innerHTML = '';
                const sessionStart = new Date(payload.new_session_start);
                const sessionEnd = new Date(payload.new_session_end);
                const termDuration = Math.max(1, Math.round((sessionEnd - sessionStart) / terms.length));

                terms.forEach((term, index) => {
                    const row = document.createElement('tr');
                    const proposedStart = new Date(sessionStart.getTime() + (termDuration * index));
                    const proposedEnd = new Date(sessionStart.getTime() + (termDuration * (index + 1)));

                    row.innerHTML = `
                        <td>${escapeHtml(term.name)}</td>
                        <td>${formatDate(proposedStart)}</td>
                        <td>${formatDate(proposedEnd)}</td>
                    `;
                    rolloverPreviewBody.appendChild(row);
                });
            }

            rolloverPreviewCard.style.display = 'block';
            showFeedback('Preview generated. Please verify dates and confirm rollover.', 'info');
        } catch (error) {
            console.error('Error generating rollover preview:', error);
            showFeedback(error.message || 'Unable to generate preview.', 'danger');
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        resetFeedback();

        const payload = buildPayload(true);
        if (!payload) return;

        if (!confirm('This will create a new academic session. Continue?')) {
            return;
        }

        showFeedback('Processing rollover...', 'info');

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/rollover`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Rollover failed.');
            }

            await response.json();
            showFeedback('Academic year rollover completed successfully.', 'success');
        } catch (error) {
            console.error('Rollover error:', error);
            showFeedback(error.message || 'Rollover failed.', 'danger');
        }
    }

    function buildPayload(requireDates) {
        const sourceSessionId = sourceSessionSelect?.value;
        const newSessionName = newSessionNameInput?.value?.trim();
        const newSessionStart = newSessionStartInput?.value;
        const newSessionEnd = newSessionEndInput?.value;

        if (!sourceSessionId) {
            showFeedback('Select the source session.', 'warning');
            return null;
        }

        if (!newSessionName) {
            showFeedback('Enter the new session name.', 'warning');
            return null;
        }

        if (requireDates && (!newSessionStart || !newSessionEnd)) {
            showFeedback('Provide start and end dates for the new session.', 'warning');
            return null;
        }

        if (newSessionStart && newSessionEnd && new Date(newSessionStart) >= new Date(newSessionEnd)) {
            showFeedback('Session end date must be after the start date.', 'warning');
            return null;
        }

        return {
            source_session_id: sourceSessionId,
            new_session_name: newSessionName,
            new_session_start: newSessionStart || null,
            new_session_end: newSessionEnd || null,
            notes: notesInput?.value?.trim() || null,
        };
    }

    function showFeedback(message, type = 'success') {
        if (!rolloverFeedback || !message) {
            return;
        }
        rolloverFeedback.textContent = message;
        rolloverFeedback.className = `alert alert-${type}`;
        rolloverFeedback.style.display = 'block';
    }

    function resetFeedback() {
        if (!rolloverFeedback) {
            return;
        }
        rolloverFeedback.textContent = '';
        rolloverFeedback.className = 'alert';
        rolloverFeedback.style.display = 'none';
    }

    function clearSelect(select) {
        if (select) {
            select.innerHTML = '';
        }
    }

    function formatDate(date) {
        const cloned = new Date(date);
        if (Number.isNaN(cloned.getTime())) {
            return '—';
        }
        return cloned.toISOString().slice(0, 10);
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
