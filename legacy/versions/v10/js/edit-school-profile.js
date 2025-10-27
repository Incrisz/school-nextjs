(function () {
    const getCookie = (name) => {
        const nameEQ = `${name}=`;
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
        }
        return null;
    };

    const resolveUrl = (typeof window !== 'undefined' && typeof window.resolveBackendUrl === 'function')
        ? window.resolveBackendUrl
        : (path) => {
            if (!path) return '';
            const base = typeof backend_url === 'string' ? backend_url.replace(/\/$/, '') : '';
            if (/^https?:\/\//i.test(path)) return path;
            if (path.startsWith('/')) return `${base}${path}`;
            return `${base}/${path}`;
        };

    document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('token');
    const form = document.getElementById('school-profile-form');
    const nameInput = document.getElementById('school-name');
    const emailInput = document.getElementById('school-email');
    const phoneInput = document.getElementById('school-phone');
    const addressInput = document.getElementById('school-address');
    const logoInput = document.getElementById('school-logo');
    const sessionSelect = document.getElementById('current-session');
    const termSelect = document.getElementById('current-term');
    const signatureInput = document.getElementById('school-signature');
    const removeSignatureButton = document.getElementById('remove-signature');
    let signatureMarkedForRemoval = false;

    const state = {
        sessions: [],
        termsBySession: new Map(),
        initialSessionId: null,
        initialTermId: null,
    };

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
    };

    const showError = (message) => {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        } else {
            alert(message);
        }
    };

    const populateSessionOptions = (selectedId = '') => {
        if (!sessionSelect) return;
        const options = ['<option value="">Select session</option>']
            .concat(state.sessions.map((session) => `<option value="${session.id}">${session.name}</option>`));
        sessionSelect.innerHTML = options.join('');
        if (selectedId) {
            sessionSelect.value = selectedId;
        }
    };

    const populateTermOptions = (sessionId, selectedId = '') => {
        if (!termSelect) return;
        const terms = sessionId ? (state.termsBySession.get(sessionId) ?? []) : [];
        const options = ['<option value="">Select term</option>']
            .concat(terms.map((term) => `<option value="${term.id}">${term.name}</option>`));
        termSelect.innerHTML = options.join('');
        if (selectedId) {
            termSelect.value = selectedId;
        }
    };

    const ensureTermsLoaded = async (sessionId, selectedId = '') => {
        if (!sessionId || state.termsBySession.has(sessionId)) {
            populateTermOptions(sessionId, selectedId);
            return;
        }

        try {
            const response = await fetch(`${backend_url}/api/v1/sessions/${sessionId}/terms`, { headers: authHeaders });
            if (!response.ok) {
                throw new Error('Failed to load terms for the selected session.');
            }
            const payload = await response.json();
            const terms = Array.isArray(payload) ? payload : payload.data || [];
            state.termsBySession.set(sessionId, terms);
            populateTermOptions(sessionId, selectedId);
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    };

    const loadSessions = async () => {
        try {
            const response = await fetch(`${backend_url}/api/v1/sessions?per_page=200`, { headers: authHeaders });
            if (!response.ok) {
                throw new Error('Failed to load sessions.');
            }
            const payload = await response.json();
            state.sessions = Array.isArray(payload) ? payload : payload.data || [];
            populateSessionOptions(state.initialSessionId);
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    };

    const fetchSchoolData = async () => {
        try {
            const response = await fetch(`${backend_url}/api/v1/user`, { headers: authHeaders });
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const data = await response.json();

            let schoolData = data;
            if (data && data.user && data.user.school) {
                schoolData = data.user.school;
            }

            nameInput.value = schoolData.name || '';
            emailInput.value = schoolData.email || '';
            phoneInput.value = schoolData.phone || '';
            addressInput.value = schoolData.address || '';

            if (logoInput && schoolData.logo_url) {
                const existing = logoInput.parentElement.querySelector('.current-logo');
                if (existing) {
                    existing.remove();
                }
                const currentLogo = document.createElement('p');
                currentLogo.className = 'current-logo';
                const resolvedLogoUrl = resolveUrl(schoolData.logo_url);
                currentLogo.innerHTML = `Current Logo: <a href="${resolvedLogoUrl}" target="_blank">${resolvedLogoUrl}</a>`;
                logoInput.parentElement.appendChild(currentLogo);
            }

            if (signatureInput) {
                const existingSig = signatureInput.parentElement.querySelector('.current-signature');
                if (existingSig) {
                    existingSig.remove();
                }

                if (schoolData.signature_url) {
                    const resolvedSignatureUrl = resolveUrl(schoolData.signature_url);
                    const currentSignature = document.createElement('p');
                    currentSignature.className = 'current-signature mt-2';
                    currentSignature.innerHTML = `Current Signature: <a href="${resolvedSignatureUrl}" target="_blank">${resolvedSignatureUrl}</a>`;
                    signatureInput.parentElement.insertBefore(currentSignature, removeSignatureButton);
                    if (removeSignatureButton) {
                        removeSignatureButton.style.display = 'inline-block';
                        signatureMarkedForRemoval = false;
                    }
                } else if (removeSignatureButton) {
                    removeSignatureButton.style.display = 'none';
                    signatureMarkedForRemoval = false;
                }
            }

            state.initialSessionId = schoolData.current_session_id
                || schoolData.current_session?.id
                || null;
            state.initialTermId = schoolData.current_term_id
                || schoolData.current_term?.id
                || null;

        } catch (error) {
            console.error('Error fetching school data:', error);
            showError(`Failed to load school data: ${error.message}`);
        }
    };

    const init = async () => {
        await Promise.all([fetchSchoolData(), loadSessions()]);
        populateSessionOptions(state.initialSessionId);

        if (state.initialSessionId) {
            await ensureTermsLoaded(state.initialSessionId, state.initialTermId);
        } else {
            populateTermOptions('', '');
        }
    };

    init();

    if (sessionSelect) {
        sessionSelect.addEventListener('change', async (event) => {
            const sessionId = event.target.value;
            state.initialTermId = '';
            await ensureTermsLoaded(sessionId);
        });
    }

    // Handle cancel button click
    const cancelButton = document.querySelector('button[type="reset"]');
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = 'profile.html';
        });
    }

    if (removeSignatureButton) {
        removeSignatureButton.addEventListener('click', () => {
            signatureMarkedForRemoval = true;
            const existingSig = signatureInput.parentElement.querySelector('.current-signature');
            if (existingSig) {
                existingSig.remove();
            }
            removeSignatureButton.style.display = 'none';
            if (signatureInput) {
                signatureInput.value = '';
            }
        });
    }

    if (signatureInput) {
        signatureInput.addEventListener('change', () => {
            if (signatureInput.files && signatureInput.files.length > 0) {
                signatureMarkedForRemoval = false;
                if (removeSignatureButton) {
                    removeSignatureButton.style.display = 'inline-block';
                }
                const existingSig = signatureInput.parentElement.querySelector('.current-signature');
                if (existingSig) {
                    existingSig.remove();
                }
            }
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData();
        if (nameInput.value) formData.append('name', nameInput.value);
        if (emailInput.value) formData.append('email', emailInput.value);
        if (phoneInput.value) formData.append('phone', phoneInput.value);
        if (addressInput.value) formData.append('address', addressInput.value);

        if (sessionSelect && sessionSelect.value) {
            formData.append('current_session_id', sessionSelect.value);
        }

        if (termSelect && termSelect.value) {
            formData.append('current_term_id', termSelect.value);
        }

        if (logoInput && logoInput.files && logoInput.files[0]) {
            formData.append('logo', logoInput.files[0]);
        }

        if (signatureInput && signatureInput.files && signatureInput.files[0]) {
            formData.append('signature', signatureInput.files[0]);
        } else if (signatureMarkedForRemoval) {
            formData.append('signature_url', '');
        }

        formData.append('_method', 'PUT');

        try {
            const response = await fetch(`${backend_url}/api/v1/school`, {
                method: 'POST',
                headers: authHeaders,
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                const message = err.message || 'Unable to update school profile.';
                throw new Error(message);
            }

            alert('School profile updated successfully!');
            window.location.href = 'profile.html';
        } catch (error) {
            console.error('Error updating school profile:', error);
            showError(`Failed to update school profile: ${error.message}`);
        }
    });
    });
})();
