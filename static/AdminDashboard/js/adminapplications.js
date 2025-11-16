const admin = {
    currentFilter: 'all',
    currentApplications: [],

    init: function() {
        this.filterApplications(this.currentFilter);
    },

    filterApplications: function(type) {
        this.currentFilter = type;
        const tbody = document.getElementById('applications-tbody');
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;

        fetch(`/api/applications?filter=${type}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${data.error}</td></tr>`;
                    return;
                }

                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center">No applications found.</td></tr>`;
                    return;
                }

                this.currentApplications = data;

                tbody.innerHTML = data.map((app, index) => `
                    <tr>
                        <td>${app.applicant_name}</td>
                        <td>${app.type}</td>
                        <td>${app.email}</td>
                        <td>${app.phone}</td>
                        <td>
                            <button class="btn btn-info btn-sm" onclick="admin.showInfoModal(${index})">
                                View
                            </button>
                        </td>
                        <td>${app.submitted || '-'}</td>
                        <td>
                            <span class="badge ${app.status === 'Approved' ? 'badge-success' : app.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">
                                ${app.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-success btn-sm" onclick="admin.approveApplication('${app.application_id}', '${app.type}')"><i class="fa-solid fa-check"></i></button>
                            <button class="btn btn-danger btn-sm" onclick="admin.rejectApplication('${app.application_id}', '${app.type}')"><i class="fa-solid fa-times"></i></button>
                        </td>
                    </tr>
                `).join('');
            })
            .catch(err => {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${err}</td></tr>`;
            });
    },

    showInfoModal: function(index) {
        const app = this.currentApplications[index];
        const modal = document.getElementById('app-info-modal');
        const body = document.getElementById('modal-body');

        body.innerHTML = `
            <p><strong>Applicant:</strong> ${app.applicant_name}</p>
            <p><strong>Type:</strong> ${app.type}</p>
            <p><strong>Address:</strong> ${app.address || '-'}</p>
            <p><strong>Category / Vehicle:</strong> ${app.category || '-'}</p>
            <p><strong>Uploaded Documents:</strong></p>
            <ul>
                ${app.valid_id_path ? `<li>Valid ID: <a href="${app.valid_id_path}" target="_blank">View</a></li>` : ''}
                ${app.document_path ? `<li>Document: <a href="${app.document_path}" target="_blank">View</a></li>` : ''}
                ${app.license_path ? `<li>License: <a href="${app.license_path}" target="_blank">View</a></li>` : ''}
                ${app.orcr_upload_path ? `<li>OR/CR: <a href="${app.orcr_upload_path}" target="_blank">View</a></li>` : ''}
                ${app.vehicle_front_path ? `<li>Vehicle Front: <a href="${app.vehicle_front_path}" target="_blank">View</a></li>` : ''}
                ${app.vehicle_back_path ? `<li>Vehicle Back: <a href="${app.vehicle_back_path}" target="_blank">View</a></li>` : ''}
            </ul>
        `;

        modal.style.display = "block";

        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        }
    },

    approveApplication: function(id, type) {
    // Build the URL dynamically
    let url = `/approve/${type}/${id}`;

    fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
        // No body needed since the info is in the URL
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) this.filterApplications(this.currentFilter);
        else alert(data.error || 'Failed to approve application');
    })
    .catch(err => console.error(err));
},

rejectApplication: function(id, type) {
    fetch('/api/reject-application', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({application_id: id, type: type})
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) this.filterApplications(this.currentFilter);
        else alert(data.error || 'Failed to reject application');
    })
    .catch(err => console.error(err));
}

};

document.addEventListener('DOMContentLoaded', () => admin.init());
