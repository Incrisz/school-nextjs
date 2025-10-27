document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('all-parents.html')) {
        loadParents();

        const searchButton = document.getElementById('search-button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const query = document.getElementById('search-input').value;
                if (query) {
                    searchParents(query);
                } else {
                    loadParents();
                }
            });
        }
    }

    if (path.includes('add-parent.html')) {
        document.getElementById('add-parent-form').addEventListener('submit', addParent);
    }

    if (path.includes('edit-parent.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const parentId = urlParams.get('id');
        if (parentId) {
            loadParentForEdit(parentId);
            document.getElementById('edit-parent-form').addEventListener('submit', (event) => updateParent(event, parentId));
        }
    }
});

function populateParentTable(parents) {
    const tableBody = document.getElementById('parent-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        const parentArray = Array.isArray(parents) ? parents : parents.data;
        if (!parentArray) {
            console.error("Invalid data structure for parents:", parents);
            return;
        }
        parentArray.forEach(parent => {
            const row = `
                <tr>
                    <td>${parent.first_name} ${parent.last_name}</td>
                    <td>${parent.phone}</td>
                    <td>${(parent.user && parent.user.email) || 'N/A'}</td>
                    <td>${parent.students_count || 0}</td>
                    <td>
                        <div class="dropdown">
                            <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                <span class="flaticon-more-button-of-three-dots"></span>
                            </a>
                            <div class="dropdown-menu dropdown-menu-right">
                                <a class="dropdown-item" href="edit-parent.html?id=${parent.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                <a class="dropdown-item" href="#" onclick="deleteParent('${parent.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
}

async function loadParents() {
    try {
        const response = await fetch(`${backend_url}/api/v1/all-parents`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const parents = await response.json();
            populateParentTable(parents);
        } else {
            console.error('Failed to load parents:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function searchParents(query) {
    try {
        const response = await fetch(`${backend_url}/api/v1/parents?q=${query}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const parents = await response.json();
            populateParentTable(parents);
        } else {
            console.error('Failed to search parents:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayErrors(errorData) {
    const errorMessageDiv = document.getElementById('error-message');
    if (errorMessageDiv) {
        let formattedErrors = [];
        if (errorData && errorData.message) {
            formattedErrors.push(errorData.message);
        }
        if (errorData && errorData.errors) {
            Object.values(errorData.errors).forEach(errs => {
                formattedErrors.push(...errs);
            });
        }

        if (formattedErrors.length > 0) {
            errorMessageDiv.innerHTML = formattedErrors.join('<br>');
            errorMessageDiv.style.display = 'block';
        } else {
            errorMessageDiv.textContent = 'An unknown error occurred. Please try again.';
            errorMessageDiv.style.display = 'block';
        }
    } else {
        alert(`Failed: ${JSON.stringify(errorData)}`);
    }
}

async function addParent(event) {
    event.preventDefault();

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const occupation = document.getElementById('occupation').value.trim();
    const address = document.getElementById('address').value.trim();

    if (!firstName || !lastName || !phone) {
        alert('Please fill in all required fields.');
        return;
    }

    const parentData = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email,
        occupation: occupation,
        address: address
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/parents`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(parentData)
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const responseData = await response.json();
            if (response.ok && !responseData.errors) {
                alert('Parent added successfully!');
                window.location.href = 'all-parents.html';
            } else {
                displayErrors(responseData);
            }
        } else {
            const errorMessage = `A server error occurred (Status: ${response.status}). Please try again later.`;
            displayErrors({ message: errorMessage });
        }
    } catch (error) {
        console.error('Error:', error);
        displayErrors({ message: error.message });
    }
}

async function loadParentForEdit(parentId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/parents/${parentId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const parent = await response.json();
            document.getElementById('first_name').value = parent.first_name;
            document.getElementById('last_name').value = parent.last_name;
            document.getElementById('phone').value = parent.phone;
            document.getElementById('email').value = parent.user ? parent.user.email : '';
            document.getElementById('occupation').value = parent.occupation;
            document.getElementById('address').value = parent.address;
        } else {
            alert('Failed to load parent data.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateParent(event, parentId) {
    event.preventDefault();

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const occupation = document.getElementById('occupation').value.trim();
    const address = document.getElementById('address').value.trim();

    if (!firstName || !lastName || !phone) {
        alert('Please fill in all required fields.');
        return;
    }

    const parentData = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email,
        occupation: occupation,
        address: address
    };

    try {
        const response = await fetch(`${backend_url}/api/v1/parents/${parentId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(parentData)
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const responseData = await response.json();
            if (response.ok && !responseData.errors) {
                alert('Parent updated successfully!');
                window.location.href = 'all-parents.html';
            } else {
                displayErrors(responseData);
            }
        } else {
            const errorMessage = `A server error occurred (Status: ${response.status}). Please try again later.`;
            displayErrors({ message: errorMessage });
        }
    } catch (error) {
        console.error('Error:', error);
        displayErrors({ message: error.message });
    }
}

async function deleteParent(parentId) {
    if (confirm('Are you sure you want to delete this parent?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/parents/${parentId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (response.ok) {
                alert('Parent deleted successfully!');
                loadParents();
            } else {
                const errorData = await response.json();
                alert(`Failed to delete parent: ${errorData.message || JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
