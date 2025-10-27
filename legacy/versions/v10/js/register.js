document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessageDiv = document.getElementById('error-message');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const address = document.getElementById('address').value;
            const subdomain = document.getElementById('subdomain').value;
            const password = document.getElementById('password').value;
            const password_confirmation = document.getElementById('password_confirmation').value;

            // Basic validation
            if (!name || !email || !address || !subdomain || !password || !password_confirmation) {
                errorMessageDiv.textContent = 'Please fill out all required fields.';
                errorMessageDiv.style.display = 'block';
                return;
            }

            if (password !== password_confirmation) {
                errorMessageDiv.textContent = 'Passwords do not match.';
                errorMessageDiv.style.display = 'block';
                return;
            }

            // Hide error message before new request
            errorMessageDiv.style.display = 'none';

            try {
                const response = await fetch(`${backend_url}/api/v1/register-school`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        address,
                        subdomain,
                        password,
                        password_confirmation,
                    }),
                });

                if (response.ok) {
                    // Registration successful, redirect to the login page
                    alert('Registration successful! Please log in.');
                    window.location.href = 'login.html';
                } else {
                    // Handle HTTP errors
                    const contentType = response.headers.get('content-type');
                    let errorMessage = 'An unknown error occurred.';

                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        // Handle validation errors which might be in an 'errors' object
                        if (errorData.errors) {
                            errorMessage = Object.values(errorData.errors).flat().join(' ');
                        } else {
                            errorMessage = errorData.message || JSON.stringify(errorData);
                        }
                    } else {
                        errorMessage = `Registration failed. Server returned status: ${response.status}.`;
                    }
                    errorMessageDiv.textContent = errorMessage;
                    errorMessageDiv.style.display = 'block';
                }
            } catch (error) {
                // Handle network errors
                errorMessageDiv.textContent = 'A network error occurred. Please check your connection and try again.';
                errorMessageDiv.style.display = 'block';
                console.error('Registration error:', error);
            }
        });
    }
});
