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

function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
}

function formatDate(value) {
    if (!value) return '';
    if (value.length >= 10) return value.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const staffId = urlParams.get('id');
    if (!staffId) {
        alert('No staff ID provided!');
        window.location.href = 'all-staff.html';
        return;
    }

    const form = document.getElementById('edit-staff-form');
    const submitButton = form.querySelector('button[type="submit"]');

    loadStaff(staffId);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
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

            formData.append('_method', 'PUT');

            const response = await fetch(`${backend_url}/api/v1/staff/${staffId}`, {
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
                throw new Error(data.message || 'Failed to update staff');
            }

            alert('Staff updated successfully.');
            window.location.href = 'all-staff.html';
        } catch (error) {
            console.error('Error updating staff:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
        }
    });
});

async function loadStaff(id) {
    try {
        const response = await fetch(`${backend_url}/api/v1/staff/${id}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getCookie('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load staff details');
        }

        const data = await response.json();
        const staff = data.data;

        setFieldValue('full-name', staff.full_name || staff.user?.name || '');
        setFieldValue('email', staff.email || staff.user?.email || '');
        setFieldValue('phone', staff.phone || staff.user?.phone || '');
        setFieldValue('role', staff.role || '');
        setFieldValue('gender', (staff.gender || '').toLowerCase());
        setFieldValue('employment-date', formatDate(staff.employment_start_date));
        setFieldValue('address', staff.address || '');
        setFieldValue('qualifications', staff.qualifications || '');

        const currentPhoto = document.getElementById('current-photo');
        if (currentPhoto) {
            if (staff.photo_url) {
                currentPhoto.innerHTML = `<a href="${staff.photo_url}" target="_blank">View current photo</a>`;
            } else {
                currentPhoto.textContent = 'No photo uploaded';
            }
        }
    } catch (error) {
        console.error('Error loading staff:', error);
        alert('Could not load staff details.');
        window.location.href = 'all-staff.html';
    }
}
