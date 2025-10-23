// Admin Dashboard JavaScript
class HarayaHomeAdmin {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.setupEventListeners();
    }

    async loadDashboardData() {
        try {
            // Load dashboard statistics
            const statsResponse = await fetch('/api/dashboard-stats');
            const stats = await statsResponse.json();
            this.updateDashboardStats(stats);

            // Load data for each page
            await this.loadUsers();
            await this.loadProducts();
            await this.loadOrders();
            await this.loadApplications();
            await this.loadCommissions();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardStats(stats) {
        // Update dashboard metrics
        const totalEarned = document.querySelector('.metric');
        if (totalEarned) {
            totalEarned.textContent = `₱ ${stats.total_revenue.toFixed(2)}`;
        }

        // Update other stats as needed
        console.log('Dashboard stats loaded:', stats);
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            this.populateUsersTable(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    populateUsersTable(users) {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user[4]} ${user[5]}</td>
                <td>${user[2]}</td>
                <td>${user[6]}</td>
                <td><span class="badge ${user[7] === 'active' ? 'badge-success' : 'badge-warning'}">${user[7]}</span></td>
                <td>${new Date(user[8]).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-light btn-icon" onclick="admin.editUser(${user[0]})">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            this.populateProductsTable(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    populateProductsTable(products) {
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product[1]}</td>
                <td>${product[8] || 'N/A'}</td>
                <td>₱${product[3].toFixed(2)}</td>
                <td>${product[4]}</td>
                <td><span class="badge ${product[6] === 'active' ? 'badge-success' : 'badge-warning'}">${product[6]}</span></td>
                <td>
                    <button class="btn btn-light btn-icon" onclick="admin.editProduct(${product[0]})">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/orders');
            const orders = await response.json();
            this.populateOrdersTable(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    populateOrdersTable(orders) {
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order[1]}</td>
                <td>${order[7] || 'N/A'}</td>
                <td>${order[8] || 'N/A'}</td>
                <td>₱${order[5].toFixed(2)}</td>
                <td><span class="badge badge-${this.getStatusClass(order[6])}">${order[6]}</span></td>
                <td>${new Date(order[9]).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-light btn-icon" onclick="admin.viewOrder(${order[0]})">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                    <button class="btn btn-light btn-icon" onclick="admin.editOrder(${order[0]})">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadApplications() {
        try {
            const response = await fetch('/api/applications');
            const applications = await response.json();
            this.populateApplicationsTable(applications);
        } catch (error) {
            console.error('Error loading applications:', error);
        }
    }

    populateApplicationsTable(applications) {
        const tbody = document.querySelector('#applications-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        applications.forEach(app => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${app[6]} ${app[7]}</td>
                <td>${app[2]}</td>
                <td>${new Date(app[4]).toLocaleDateString()}</td>
                <td><span class="badge badge-${this.getStatusClass(app[3])}">${app[3]}</span></td>
                <td>
                    <button class="btn btn-primary" onclick="admin.approveApplication(${app[0]})">Approve</button>
                    <button class="btn btn-outline" onclick="admin.rejectApplication(${app[0]})">Reject</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadCommissions() {
        try {
            const response = await fetch('/api/commissions');
            const commissions = await response.json();
            this.populateCommissionsTable(commissions);
        } catch (error) {
            console.error('Error loading commissions:', error);
        }
    }

    populateCommissionsTable(commissions) {
        const tbody = document.querySelector('#commissions-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        commissions.forEach(commission => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" aria-label="Select"></td>
                <td>${commission[7] || 'N/A'}</td>
                <td>${commission[6] || 'N/A'}</td>
                <td>${commission[3]}%</td>
                <td>₱${commission[4].toFixed(2)}</td>
                <td><span class="badge badge-${this.getStatusClass(commission[5])}">${commission[5]}</span></td>
                <td>${new Date(commission[7]).toLocaleDateString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    getStatusClass(status) {
        const statusMap = {
            'active': 'success',
            'pending': 'warning',
            'delivered': 'success',
            'paid': 'success',
            'cancelled': 'danger',
            'rejected': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    setupEventListeners() {
        // Add event listeners for buttons and forms
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-primary') && e.target.textContent.includes('Add user')) {
                this.showAddUserModal();
            }
            if (e.target.classList.contains('btn-primary') && e.target.textContent.includes('Add product')) {
                this.showAddProductModal();
            }
        });
    }

    showAddUserModal() {
        // Create and show add user modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Add New User</h3>
                <form id="add-user-form">
                    <input type="text" placeholder="Username" name="username" required>
                    <input type="email" placeholder="Email" name="email" required>
                    <input type="password" placeholder="Password" name="password" required>
                    <input type="text" placeholder="First Name" name="first_name" required>
                    <input type="text" placeholder="Last Name" name="last_name" required>
                    <input type="tel" placeholder="Phone" name="phone">
                    <select name="role">
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="rider">Rider</option>
                    </select>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Create User</button>
                        <button type="button" class="btn btn-outline" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Handle form submission
        modal.querySelector('#add-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userData = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('User created successfully!');
                    modal.remove();
                    this.loadUsers();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error creating user: ' + error.message);
            }
        });
    }

    showAddProductModal() {
        // Similar modal for adding products
        console.log('Add product modal would open here');
    }

    // Action methods
    editUser(userId) {
        console.log('Edit user:', userId);
    }

    editProduct(productId) {
        console.log('Edit product:', productId);
    }

    viewOrder(orderId) {
        console.log('View order:', orderId);
    }

    editOrder(orderId) {
        console.log('Edit order:', orderId);
    }

    approveApplication(appId) {
        console.log('Approve application:', appId);
    }

    rejectApplication(appId) {
        console.log('Reject application:', appId);
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new HarayaHomeAdmin();
});
