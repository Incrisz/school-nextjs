const resolveUrl = (typeof window !== 'undefined' && typeof window.resolveBackendUrl === 'function')
    ? window.resolveBackendUrl
    : (path) => {
        if (!path) return '';
        const base = typeof backend_url === 'string' ? backend_url.replace(/\/$/, '') : '';
        if (/^https?:\/\//i.test(path)) return path;
        if (path.startsWith('/')) return `${base}${path}`;
        return `${base}/${path}`;
    };

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
    // Get token from session storage
    const token = getCookie('token');

    // Check if token exists
    if (!token) {
        console.error('No authentication token found');
        window.location.href = '../v10/login.html';
        return;
    }

    // DOM Elements for School Data
    const schoolLogo = document.getElementById('school-logo');
    const schoolSignature = document.getElementById('school-signature');
    const schoolName = document.getElementById('school-name');
    const schoolAddress = document.getElementById('school-address');
    const schoolEmail = document.getElementById('school-email');
    const schoolPhone = document.getElementById('school-phone');
    const schoolCurrentSession = document.getElementById('school-current-session');
    const schoolCurrentTerm = document.getElementById('school-current-term');

    // DOM Elements for Admin Data
    const adminName = document.getElementById('admin-name');
    const adminEmail = document.getElementById('admin-email');
    const adminRole = document.getElementById('admin-role');

    // Check if all required DOM elements exist
    if (!schoolLogo || !schoolName || !schoolAddress || !schoolEmail || !schoolPhone || !schoolCurrentSession || !schoolCurrentTerm || !adminName || !adminEmail || !adminRole) {
        console.error('Required DOM elements not found');
        return;
    }

    // Show loading state
    const loadingText = 'Loading...';
    schoolName.textContent = loadingText;
    schoolAddress.textContent = loadingText;
    schoolEmail.textContent = loadingText;
    schoolPhone.textContent = loadingText;
    schoolCurrentSession.textContent = loadingText;
    schoolCurrentTerm.textContent = loadingText;
    adminName.textContent = loadingText;
    adminEmail.textContent = loadingText;

    // API URLs
    const schoolApiUrl = `${backend_url}/api/v1/school`;
    const userApiUrl = `${backend_url}/api/v1/user`;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // Fetch both school and user data concurrently
    Promise.all([
        fetch(schoolApiUrl, { headers }),
        fetch(userApiUrl, { headers })
    ])
    .then(responses => {
        // Check if all responses are ok
        const failedResponses = responses.filter(response => !response.ok);
        if (failedResponses.length > 0) {
            const errorMessages = failedResponses.map((response, index) => 
                `API ${index === 0 ? 'School' : 'User'} failed: ${response.status} ${response.statusText}`
            );
            throw new Error(errorMessages.join(', '));
        }
        // Parse all responses as JSON
        return Promise.all(responses.map(response => response.json()));
    })
    .then(([schoolResponse, userResponse]) => {
        // Handle different possible response structures
        let schoolData = {};
        let userData = {};

        // Prioritize userResponse as the source of truth based on the comment hint
        if (userResponse) {
            if (userResponse.user) { // Case where data is nested under a 'user' key
                userData = userResponse.user;
                if (userResponse.user.school) {
                    schoolData = userResponse.user.school;
                }
            } else { // Case where user data is at the root
                userData = userResponse;
                if (userResponse.school) {
                    schoolData = userResponse.school;
                }
            }
        }
        
        // Use schoolResponse as a fallback for school data if it wasn't in userResponse
        if (Object.keys(schoolData).length === 0) {
            if (schoolResponse && schoolResponse.school) {
                schoolData = schoolResponse.school;
            } else if (schoolResponse && Object.keys(schoolResponse).length > 0) {
                schoolData = schoolResponse;
            }
        }

        // Populate School Data
        if (schoolData && typeof schoolData === 'object') {
            schoolName.textContent = schoolData.name || 'N/A';
            schoolAddress.textContent = schoolData.address || 'N/A';
            schoolEmail.textContent = schoolData.email || 'N/A';
            schoolPhone.textContent = schoolData.phone || 'N/A';
            if (schoolData.logo_url && schoolData.logo_url.trim() !== '') {
                schoolLogo.src = resolveUrl(schoolData.logo_url);
                schoolLogo.alt = `${schoolData.name || 'School'} Logo`;
            }

            if (schoolSignature) {
                if (schoolData.signature_url && schoolData.signature_url.trim() !== '') {
                    schoolSignature.src = resolveUrl(schoolData.signature_url);
                    schoolSignature.style.display = 'block';
                } else {
                    schoolSignature.src = '';
                    schoolSignature.style.display = 'none';
                }
            }

            const currentSession = schoolData.current_session || schoolData.currentSession || null;
            const currentTerm = schoolData.current_term || schoolData.currentTerm || null;

            schoolCurrentSession.textContent = currentSession?.name || 'Not set';
            schoolCurrentTerm.textContent = currentTerm?.name || 'Not set';
        } else {
            schoolName.textContent = 'N/A';
            schoolAddress.textContent = 'N/A';
            schoolEmail.textContent = 'N/A';
            schoolPhone.textContent = 'N/A';
            schoolCurrentSession.textContent = 'Not set';
            schoolCurrentTerm.textContent = 'Not set';
        }

        // Populate Admin Data
        if (userData && typeof userData === 'object') {
            adminName.textContent = userData.name || 'N/A';
            adminEmail.textContent = userData.email || 'N/A';
            adminRole.textContent = userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'N/A';
        } else {
            adminName.textContent = 'N/A';
            adminEmail.textContent = 'N/A';
            adminRole.textContent = 'N/A';
        }
    })
    .catch(error => {
        console.error('Error fetching profile data:', error);
        
        // Show error message to user
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = `Failed to load profile data: ${error.message}`;
            errorContainer.style.display = 'block';
        }
        
        // Set fallback values
        schoolName.textContent = 'Error loading data';
        schoolAddress.textContent = 'Error loading data';
        schoolEmail.textContent = 'Error loading data';
        schoolPhone.textContent = 'Error loading data';
        schoolCurrentSession.textContent = 'Error loading data';
        schoolCurrentTerm.textContent = 'Error loading data';
        adminName.textContent = 'Error loading data';
        adminEmail.textContent = 'Error loading data';

        if (schoolSignature) {
            schoolSignature.style.display = 'none';
        }
    });
});
