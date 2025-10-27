document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('all-sessions.html')) {
        loadSessions();
    }

    if (path.includes('add-session.html')) {
        const form = document.getElementById('add-session-form');
        if(form) {
            form.addEventListener('submit', addSession);
        }
    }

    if (path.includes('edit-session.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('id');
        if (sessionId) {
            loadSessionForEdit(sessionId);
            const form = document.getElementById('edit-session-form');
            if(form) {
                form.addEventListener('submit', (event) => updateSession(event, sessionId));
            }
        } else {
            window.location.href = 'all-sessions.html';
        }
    }
});

function formatDateForAPI(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateString;
}

function formatDateForPicker(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
}

function formatReadableDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

async function loadSessions() {
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const sessions = await response.json();
            const tableBody = document.getElementById('session-table-body');
            if (tableBody) {
                tableBody.innerHTML = ''; // Clear existing rows
                sessions.forEach((session, index) => {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${session.name}</td>
                            <td>${formatReadableDate(session.start_date)}</td>
                            <td>${formatReadableDate(session.end_date)}</td>
                            <td>
                                <div class="dropdown">
                                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                        <span class="flaticon-more-button-of-three-dots"></span>
                                    </a>
                                    <div class="dropdown-menu dropdown-menu-right">
                                        <a class="dropdown-item" href="edit-session.html?id=${session.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                        <a class="dropdown-item" href="#" onclick="deleteSession('${session.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            console.error('Failed to load sessions:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function addSession(event) {
    event.preventDefault();

    const sessionName = document.getElementById('session-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!sessionName || !startDate || !endDate) {
        alert('Please fill in all fields.');
        return;
    }

    const sessionData = {
        name: sessionName,
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate)
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/sessions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            alert('Session added successfully!');
            window.location.href = 'all-sessions.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to add session: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function loadSessionForEdit(sessionId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const session = await response.json();
            document.getElementById('session-id').value = session.id;
            document.getElementById('session-name').value = session.name;
            document.getElementById('start-date').value = formatDateForPicker(session.start_date);
            document.getElementById('end-date').value = formatDateForPicker(session.end_date);
        } else {
            const errorText = await response.text();
            console.error('Failed to load session for editing:', errorText);
            alert('Failed to load session data. Please try again later.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateSession(event, sessionId) {
    event.preventDefault();

    const sessionName = document.getElementById('session-name').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!sessionName || !startDate || !endDate) {
        alert('Please fill in all fields.');
        return;
    }

    const sessionData = {
        name: sessionName,
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate)
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            alert('Session updated successfully!');
            window.location.href = 'all-sessions.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to update session: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (response.ok) {
                alert('Session deleted successfully!');
                loadSessions(); // Reload the session list
            } else {
                const errorData = await response.json();
                alert(`Failed to delete session: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
