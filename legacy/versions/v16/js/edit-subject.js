function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get('id');

    if (!subjectId) {
        alert('No subject ID provided.');
        window.location.href = 'all-subjects.html';
        return;
    }

    const form = document.getElementById('edit-subject-form');
    if (!form) return;

    populateSubject(subjectId, form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const name = (form.name.value || '').trim();
            const code = (form.code.value || '').trim();
            const description = (form.description.value || '').trim();

            if (!name) {
                throw new Error('Subject name is required.');
            }

            const payload = {
                name
            };

            payload.code = code || null;
            payload.description = description || null;

            const response = await fetch(`${backend_url}/api/v1/settings/subjects/${subjectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getCookie('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 422 && data.errors) {
                    const messages = Object.values(data.errors).flat().join('\n');
                    throw new Error(messages);
                }
                throw new Error(data.message || 'Failed to update subject.');
            }

            alert(data.message || 'Subject updated successfully.');
            window.location.href = 'all-subjects.html';
        } catch (error) {
            console.error('Error updating subject:', error);
            alert(`Error: ${error.message}`);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});

async function populateSubject(subjectId, form) {
    try {
        const response = await fetch(`${backend_url}/api/v1/settings/subjects/${subjectId}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getCookie('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load subject details.');
        }

        const data = await response.json();
        const subject = data.data || data;

        form.name.value = subject.name || '';
        form.code.value = subject.code || '';
        form.description.value = subject.description || '';
    } catch (error) {
        console.error('Error loading subject:', error);
        alert('Could not load subject details.');
        window.location.href = 'all-subjects.html';
    }
}
