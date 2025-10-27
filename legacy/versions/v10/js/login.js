document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Basic validation
            if (!email || !password) {
                errorMessageDiv.textContent = 'Please enter both email and password.';
                errorMessageDiv.style.display = 'block';
                return;
            }

            // Hide error message before new request
            errorMessageDiv.style.display = 'none';

            try {
                const response = await fetch(`${backend_url}/api/v1/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json' // Good practice
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Login successful, store token and redirect to the dashboard
                    setCookie('token', data.token, 7); // Save token in a cookie for 7 days
                    alert('Login successful! Redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                } else {
                    // Handle HTTP errors
                    const contentType = response.headers.get('content-type');
                    let errorMessage = 'An unknown error occurred.';

                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.message || JSON.stringify(errorData);
                    } else {
                        // The response is not JSON, it might be HTML or plain text.
                        errorMessage = `Login failed. Server returned status: ${response.status}.`;
                    }
                    errorMessageDiv.textContent = errorMessage;
                    errorMessageDiv.style.display = 'block';
                }
            } catch (error) {
                // Handle network errors
                errorMessageDiv.textContent = 'A network error occurred. Please check your connection and try again.';
                errorMessageDiv.style.display = 'block';
                console.error('Login error:', error);
            }
        });
    }
});
