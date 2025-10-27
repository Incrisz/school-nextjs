document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('all-terms.html')) {
        loadSessionsForFilterDropdown();
        const sessionFilter = document.getElementById('session-select-filter');
        if(sessionFilter) {
            sessionFilter.addEventListener('change', (event) => {
                const sessionId = event.target.value;
                if (sessionId) {
                    loadTermsForSession(sessionId);
                } else {
                    const tableBody = document.getElementById('term-table-body');
                    if(tableBody) tableBody.innerHTML = '';
                }
            });
        }
    }

    if (path.includes('add-term.html')) {
        loadSessionsForAddEditDropdown();
        const form = document.getElementById('add-term-form');
        if(form) {
            form.addEventListener('submit', addTerm);
        }
    }

    if (path.includes('edit-term.html')) {
        loadSessionsForAddEditDropdown().then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const termId = urlParams.get('id');
            if (termId) {
                loadTermForEdit(termId);
                const form = document.getElementById('edit-term-form');
                if(form) {
                    form.addEventListener('submit', (event) => updateTerm(event, termId));
                }
            } else {
                window.location.href = 'all-terms.html';
            }
        });
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

async function loadSessionsForAddEditDropdown() {
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const sessions = await response.json();
            const sessionSelect = document.getElementById('session-select');
            if(sessionSelect) {
                sessions.forEach(session => {
                    const option = new Option(session.name, session.id);
                    sessionSelect.add(option);
                });
            }
        } else {
            console.error('Failed to load sessions for dropdown:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadSessionsForFilterDropdown() {
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const sessions = await response.json();
            const sessionSelect = document.getElementById('session-select-filter');
            if(sessionSelect) {
                sessions.forEach(session => {
                    const option = new Option(session.name, session.id);
                    sessionSelect.add(option);
                });
            }
        } else {
            console.error('Failed to load sessions for filter dropdown:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadTermsForSession(sessionId) {
    const sessionName = $(`#session-select-filter option[value='${sessionId}']`).text();
    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const terms = await response.json();
            const tableBody = document.getElementById('term-table-body');
            if(tableBody) {
                tableBody.innerHTML = '';
                terms.forEach((term, index) => {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${term.name}</td>
                            <td>${sessionName}</td>
                            <td>${formatReadableDate(term.start_date)}</td>
                            <td>${formatReadableDate(term.end_date)}</td>
                            <td>
                                <div class="dropdown">
                                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                        <span class="flaticon-more-button-of-three-dots"></span>
                                    </a>
                                    <div class="dropdown-menu dropdown-menu-right">
                                        <a class="dropdown-item" href="edit-term.html?id=${term.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                        <a class="dropdown-item" href="#" onclick="deleteTerm('${term.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            console.error('Failed to load terms:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function addTerm(event) {
    event.preventDefault();

    const termName = document.getElementById('term-name').value.trim();
    const allowedTermNames = ["1st", "2nd", "3rd"];
    if (!allowedTermNames.includes(termName)) {
        alert("Invalid Term Name. Please use '1st', '2nd', or '3rd'.");
        return;
    }
    const sessionId = document.getElementById('session-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!termName || !sessionId || !startDate || !endDate) {
        alert('Please fill in all fields.');
        return;
    }

    const termData = {
        name: termName,
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate)
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(termData)
        });

        if (response.ok) {
            alert('Term added successfully!');
            window.location.href = 'all-terms.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to add term: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function loadTermForEdit(termId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/terms/${termId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const term = await response.json();
            document.getElementById('term-id').value = term.id;
            document.getElementById('term-name').value = term.name;
            $('#session-select').val(term.session).trigger('change');
            document.getElementById('start-date').value = formatDateForPicker(term.start_date);
            document.getElementById('end-date').value = formatDateForPicker(term.end_date);
        } else {
            const errorText = await response.text();
            console.error('Failed to load term for editing:', errorText);
            alert('Failed to load term data. Please try again later.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateTerm(event, termId) {
    event.preventDefault();

    const termName = document.getElementById('term-name').value.trim();
    const allowedTermNames = ["1st", "2nd", "3rd"];
    if (!allowedTermNames.includes(termName)) {
        alert("Invalid Term Name. Please use '1st', '2nd', or '3rd'.");
        return;
    }
    const sessionId = document.getElementById('session-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!termName || !sessionId || !startDate || !endDate) {
        alert('Please fill in all fields.');
        return;
    }

    const termData = {
        name: termName,
        slug: termName.toLowerCase().replace(/\s+/g, '-'),
        session: sessionId,
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate)
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/terms/${termId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(termData)
        });

        if (response.ok) {
            alert('Term updated successfully!');
            window.location.href = 'all-terms.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to update term: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function deleteTerm(termId) {
    if (confirm('Are you sure you want to delete this term?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/terms/${termId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (response.ok) {
                alert('Term deleted successfully!');
                const selectedSessionId = document.getElementById('session-select-filter').value;
                if (selectedSessionId) {
                    loadTermsForSession(selectedSessionId);
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to delete term: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
