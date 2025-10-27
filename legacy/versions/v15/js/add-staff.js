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
    const form = document.getElementById('add-staff-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(form);

            formData.set('full_name', (formData.get('full_name') || '').trim());
            formData.set('email', (formData.get('email') || '').trim());
            formData.set('phone', (formData.get('phone') || '').trim());
            formData.set('role', formData.get('role') || '');

            const gender = formData.get('gender');
            if (gender) {
                formData.set('gender', gender.toLowerCase());
            }

            const employmentDate = formData.get('employment_start_date');
            if (!employmentDate) {
                formData.delete('employment_start_date');
            }

            const address = (formData.get('address') || '').trim();
            if (address) {
                formData.set('address', address);
            } else {
                formData.delete('address');
            }

            const qualifications = (formData.get('qualifications') || '').trim();
            if (qualifications) {
                formData.set('qualifications', qualifications);
            } else {
                formData.delete('qualifications');
            }

            const photoInput = document.getElementById('photo');
            if (!photoInput || !photoInput.files || photoInput.files.length === 0) {
                formData.delete('photo');
            }

            const response = await fetch(`${backend_url}/api/v1/staff`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getCookie('token')}`
                },
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                if (response.status === 422 && data.errors) {
                    const messages = Object.values(data.errors).flat().join('\n');
                    throw new Error(messages);
                }
                throw new Error(data.message || 'Failed to create staff');
            }

            let message = 'Staff created successfully.';
            if (data.temporary_password) {
                message += `\nTemporary Password: ${data.temporary_password}`;
            }
            alert(message);
            window.location.href = 'all-staff.html';
        } catch (error) {
            console.error('Error creating staff:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    });
});
