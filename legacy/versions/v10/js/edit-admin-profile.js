function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

document.addEventListener('DOMContentLoaded', function () {
    const token = getCookie('token');
    const form = document.getElementById('admin-profile-form');
    const nameInput = document.getElementById('admin-name');
    const emailInput = document.getElementById('admin-email');
    const oldPasswordInput = document.getElementById('old-password');
    const passwordInput = document.getElementById('password');
    const passwordConfirmationInput = document.getElementById('password_confirmation');

    // Function to fetch user data and populate the form
    const fetchUserData = () => {
        fetch(`${backend_url}/api/v1/user`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(data => {
            // Extract user data from the nested structure
            let userData = data;
            if (data && data.user) {
                userData = data.user;
            }
            
            // Populate the form fields with current values
            nameInput.value = userData.name || '';
            emailInput.value = userData.email || '';
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            const errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                errorContainer.textContent = `Failed to load user data: ${error.message}`;
                errorContainer.style.display = 'block';
            }
        });
    };

    // Fetch user data when the page loads
    fetchUserData();

    // Handle cancel button click
    const cancelButton = document.querySelector('button[type="reset"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', function(event) {
            event.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    // Handle form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const payload = {
            name: nameInput.value,
            email: emailInput.value
        };

        // Only include password fields if the new password is not empty
        if (passwordInput.value) {
            if (passwordInput.value !== passwordConfirmationInput.value) {
                alert('New passwords do not match.');
                return;
            }
            payload.old_password = oldPasswordInput.value;
            payload.password = passwordInput.value;
            payload.password_confirmation = passwordConfirmationInput.value;
        }

        fetch(`${backend_url}/api/v1/user`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                // Try to get more specific error info from the response body
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(data => {
            alert('Profile updated successfully!');
            // Clear password fields after successful update
            oldPasswordInput.value = '';
            passwordInput.value = '';
            passwordConfirmationInput.value = '';
            // Redirect back to profile page
            window.location.href = 'profile.html';
        })
        .catch(error => {
            console.error('Error updating user profile:', error);
            const errorContainer = document.getElementById('error-container');
            const errorMessage = error.message || 'An unknown error occurred.';
            if (errorContainer) {
                errorContainer.textContent = `Failed to update profile: ${errorMessage}`;
                errorContainer.style.display = 'block';
            } else {
                alert(`Failed to update profile: ${errorMessage}`);
            }
        });
    });
});
