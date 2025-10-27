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
    const form = document.getElementById('add-subject-form');
    if (!form) return;

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

            if (code) {
                payload.code = code;
            }

            if (description) {
                payload.description = description;
            }

            const response = await fetch(`${backend_url}/api/v1/settings/subjects`, {
                method: 'POST',
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
                throw new Error(data.message || 'Failed to create subject.');
            }

            alert(data.message || 'Subject created successfully.');
            window.location.href = 'all-subjects.html';
        } catch (error) {
            console.error('Error creating subject:', error);
            alert(`Error: ${error.message}`);
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});
