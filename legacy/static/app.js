// Centralized Authentication Check
(function() {
    // Helper function to get a cookie
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

    const token = getCookie('token');
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');

    if (!token && !isLoginPage && !isRegisterPage) {
        window.location.href = '../v10/login.html';
    }
})();

// Fetch and inject the menubar if its placeholder exists
const menubarPlaceholder = document.getElementById('menubar-placeholder');
if (menubarPlaceholder) {
    fetch('../components/menubar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok for menubar.html');
            }
            return response.text();
        })
        .then(data => {
            menubarPlaceholder.innerHTML = data;
            updateMenubarLogo();
            // Now that the menubar is loaded, attach the logout event listener
            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    deleteCookie('token');
                    window.location.href = '../v10/login.html';
                });
            }
        })
        .catch(error => {
            console.error('Error fetching or parsing menubar:', error);
        });
}

// Fetch and inject the sidebar if its placeholder exists
const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
if (sidebarPlaceholder) {
    fetch('../components/sidebar.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok for sidebar.html');
            }
            return response.text();
        })
        .then(data => {
            sidebarPlaceholder.innerHTML = data;
            updateSidebarLogo();
        })
        .catch(error => {
            console.error('Error fetching or parsing sidebar:', error);
        });
}


function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

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

function deleteCookie(name) {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}

function resolveBackendUrl(path) {
    if (!path) {
        return '';
    }

    if (typeof path !== 'string') {
        path = String(path);
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const base = typeof backend_url === 'string' ? backend_url.replace(/\/$/, '') : '';

    if (path.startsWith('/')) {
        return `${base}${path}`;
    }

    return `${base}/${path}`;
}

if (typeof window !== 'undefined') {
    window.resolveBackendUrl = resolveBackendUrl;
}

function getHeaders() {
    const token = getCookie('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

let schoolBrandingPromise = null;

function fetchSchoolBranding() {
    if (schoolBrandingPromise) {
        return schoolBrandingPromise;
    }

    const token = getCookie('token');
    if (!token || typeof backend_url === 'undefined') {
        schoolBrandingPromise = Promise.resolve(null);
        return schoolBrandingPromise;
    }

    schoolBrandingPromise = fetch(`${backend_url}/api/v1/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load user data (${response.status})`);
            }
            return response.json();
        })
        .then((payload) => {
            const user = payload?.user ?? payload;
            const school = user?.school ?? payload?.school ?? null;
            return school || null;
        })
        .catch((error) => {
            console.error('Unable to fetch school branding information:', error);
            return null;
        });

    return schoolBrandingPromise;
}

function applyLogoToElement(elementId) {
    const logoImg = document.getElementById(elementId);
    if (!logoImg) {
        return;
    }

    fetchSchoolBranding().then((school) => {
        if (!school || !school.logo_url) {
            return;
        }
        const resolved = resolveBackendUrl(school.logo_url);
        if (resolved) {
            logoImg.src = resolved;
        }
    });
}

function updateSidebarLogo() {
    applyLogoToElement('sidebar-school-logo');
}

function updateMenubarLogo() {
    applyLogoToElement('menubar-school-logo');
}

window.updateSidebarLogo = updateSidebarLogo;
window.updateMenubarLogo = updateMenubarLogo;

function createEmptyContext() {
    return {
        school: null,
        current_session_id: null,
        current_term_id: null,
        current_session: null,
        current_term: null,
    };
}

function normalizeSchoolContext(payload) {
    if (!payload) return createEmptyContext();
    const school = payload.school ?? payload;
    if (!school || typeof school !== 'object') {
        return createEmptyContext();
    }

    const currentSession = school.current_session ?? school.currentSession ?? null;
    const currentTerm = school.current_term ?? school.currentTerm ?? null;

    return {
        school,
        current_session_id: school.current_session_id ?? currentSession?.id ?? null,
        current_term_id: school.current_term_id ?? currentTerm?.id ?? null,
        current_session: currentSession,
        current_term: currentTerm,
    };
}

function fetchSchoolContext() {
    const token = getCookie('token');
    if (!token || typeof backend_url === 'undefined') {
        return Promise.resolve(createEmptyContext());
    }

    return fetch(`${backend_url}/api/v1/school`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to load school context (${response.status})`);
            }
            return response.json();
        })
        .then((data) => normalizeSchoolContext(data))
        .catch((error) => {
            console.error('Unable to fetch school context:', error);
            return createEmptyContext();
        });
}

if (typeof window !== 'undefined') {
    window.getSchoolContext = function getSchoolContext() {
        if (window.schoolContextPromise) {
            return window.schoolContextPromise;
        }
        window.schoolContextPromise = fetchSchoolContext().then((context) => {
            window.schoolContext = context;
            window.dispatchEvent(new CustomEvent('schoolContext:loaded', { detail: context }));
            return context;
        });
        return window.schoolContextPromise;
    };

    if (getCookie('token')) {
        window.getSchoolContext();
    }
}
