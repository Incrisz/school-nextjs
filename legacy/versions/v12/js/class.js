document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('all-classes.html')) {
        loadClasses();
    }

    if (path.includes('add-class.html')) {
        const form = document.getElementById('add-class-form');
        if(form) {
            form.addEventListener('submit', addClass);
        }
    }

    if (path.includes('edit-class.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        if (classId) {
            loadClassForEdit(classId);
            const form = document.getElementById('edit-class-form');
            if(form) {
                form.addEventListener('submit', (event) => updateClass(event, classId));
            }
        } else {
            window.location.href = 'all-classes.html';
        }
    }
});

async function loadClasses() {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const classes = await response.json();
            const tableBody = document.getElementById('class-table-body');
            if (tableBody) {
                tableBody.innerHTML = '';
                classes.forEach((_class, index) => {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${_class.name}</td>
                            <td>
                                <div class="dropdown">
                                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                        <span class="flaticon-more-button-of-three-dots"></span>
                                    </a>
                                    <div class="dropdown-menu dropdown-menu-right">
                                        <a class="dropdown-item" href="edit-class.html?id=${_class.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                        <a class="dropdown-item" href="#" onclick="deleteClass('${_class.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            console.error('Failed to load classes:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function addClass(event) {
    event.preventDefault();
    const className = document.getElementById('class-name').value.trim();
    if (!className) {
        alert('Please enter a class name.');
        return;
    }

    try {
        // First, get the user's school_id
        const userResponse = await fetch(`${backend_url}/api/v1/user`, {
            headers: getHeaders()
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user data to determine school ID.');
        }

        const userData = await userResponse.json();
        const schoolId = userData && userData.user && userData.user.school ? userData.user.school.id : null;

        if (!schoolId) {
            alert('Could not determine school ID from user data. Please ensure you are logged in and associated with a school.');
            return;
        }

        const classData = { name: className, school_id: schoolId };

        // Now, create the class
        const createClassResponse = await fetch(`${backend_url}/api/v1/classes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(classData)
        });

        if (createClassResponse.ok) {
            alert('Class added successfully!');
            window.location.href = 'all-classes.html';
        } else {
            const errorData = await createClassResponse.json();
            alert(`Failed to add class: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`An error occurred: ${error.message}`);
    }
}

async function loadClassForEdit(classId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const _class = await response.json();
            document.getElementById('class-id').value = _class.id;
            document.getElementById('class-name').value = _class.name;
        } else {
            alert('Failed to load class data.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function updateClass(event, classId) {
    event.preventDefault();
    const className = document.getElementById('class-name').value.trim();
    if (!className) {
        alert('Please enter a class name.');
        return;
    }

    const classData = { name: className };

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(classData)
        });
        if (response.ok) {
            alert('Class updated successfully!');
            window.location.href = 'all-classes.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to update class: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function deleteClass(classId) {
    if (confirm('Are you sure you want to delete this class?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/classes/${classId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (response.ok) {
                alert('Class deleted successfully!');
                loadClasses();
            } else {
                const errorData = await response.json();
                alert(`Failed to delete class: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
