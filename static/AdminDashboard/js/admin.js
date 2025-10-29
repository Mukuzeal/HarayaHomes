// Admin Dashboard JavaScript
class HarayaHomeAdmin {
    constructor() {
        this.currentUser = null;
        this.currentView = 'active'; // For products view
        this.currentFilter = 'all'; // For applications filter
        this.currentCommissionFilter = 'all'; // For commissions filter
        this.currentEarningsPeriod = 'week'; // For earnings period
        this.currentTopProductsPeriod = 'week'; // For top products period
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
            await this.loadBestSellers();
            await this.loadApplications();
            await this.loadCommissions();
            await this.loadReports();
            await this.loadTopProducts();
            await this.loadEarnings();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateDashboardStats(stats) {
        // Update dashboard metrics
        const totalEarned = document.querySelector('#total-earned');
        if (totalEarned) {
            totalEarned.textContent = `₱ ${stats.total_revenue.toFixed(2)}`;
        }

        // Update other stats as needed
        console.log('Dashboard stats loaded:', stats);
    }

    // ==========================
    // PRODUCTS MANAGEMENT
    // ==========================
    async loadProducts() {
        try {
            const response = await fetch(`/api/products?view=${this.currentView}`);
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
                <td>${product.product_name}</td>
                <td>${product.seller_name || 'N/A'}</td>
                <td>₱${product.price.toFixed(2)}</td>
                <td>${product.stock_quantity}</td>
                <td>${product.category}</td>
                <td><span class="badge ${product.status === 'active' ? 'badge-success' : 'badge-warning'}">${product.status}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="admin.warnSeller(${product.Product_id}, ${product.seller_id})" title="Warn Seller">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                    </button>
                    ${this.currentView === 'active' ? 
                        `<button class="btn btn-danger btn-sm" onclick="admin.archiveProduct(${product.Product_id})" title="Archive">
                            <i class="fa-solid fa-archive"></i>
                        </button>` :
                        `<button class="btn btn-success btn-sm" onclick="admin.restoreProduct(${product.Product_id})" title="Restore">
                            <i class="fa-solid fa-undo"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="admin.deleteProduct(${product.Product_id})" title="Delete Permanently">
                            <i class="fa-solid fa-trash"></i>
                        </button>`
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    toggleView(view) {
        this.currentView = view;
        this.loadProducts();
    }

    async warnSeller(productId, sellerId) {
        const message = prompt('Enter warning message for the seller:');
        if (message) {
            try {
                const response = await fetch('/api/warn-seller', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId, seller_id: sellerId, message: message })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Warning sent to seller successfully!');
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error sending warning: ' + error.message);
            }
        }
    }

    async archiveProduct(productId) {
        if (confirm('Are you sure you want to archive this product?')) {
            try {
                const response = await fetch('/api/archive-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Product archived successfully!');
                    this.loadProducts();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error archiving product: ' + error.message);
            }
        }
    }

    async restoreProduct(productId) {
        if (confirm('Are you sure you want to restore this product?')) {
            try {
                const response = await fetch('/api/restore-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Product restored successfully!');
                    this.loadProducts();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error restoring product: ' + error.message);
            }
        }
    }

    async deleteProduct(productId) {
        if (confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) {
            try {
                const response = await fetch('/api/delete-product', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Product deleted permanently!');
                    this.loadProducts();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error deleting product: ' + error.message);
            }
        }
    }

    // ==========================
    // APPLICATIONS MANAGEMENT
    // ==========================
    async loadApplications() {
        try {
            const response = await fetch(`/api/applications?filter=${this.currentFilter}`);
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
                <td>${app.applicant_name}</td>
                <td>${app.application_type}</td>
                <td>${app.email}</td>
                <td>${app.phone_number}</td>
                <td>${app.address}</td>
                <td>${app.category || 'N/A'}</td>
                <td>${new Date(app.submitted_date).toLocaleDateString()}</td>
                <td><span class="badge ${this.getStatusClass(app.approval)}">${app.approval}</span></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="admin.approveApplication(${app.application_id}, '${app.application_type}')" title="Approve">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.rejectApplication(${app.application_id}, '${app.application_type}')" title="Reject">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterApplications(filter) {
        this.currentFilter = filter;
        this.loadApplications();
    }

    async approveApplication(appId, type) {
        if (confirm(`Are you sure you want to approve this ${type} application?`)) {
            try {
                const response = await fetch('/api/approve-application', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ application_id: appId, type: type })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Application approved successfully!');
                    this.loadApplications();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error approving application: ' + error.message);
            }
        }
    }

    async rejectApplication(appId, type) {
        if (confirm(`Are you sure you want to reject this ${type} application?`)) {
            try {
                const response = await fetch('/api/reject-application', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ application_id: appId, type: type })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Application rejected successfully!');
                    this.loadApplications();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error rejecting application: ' + error.message);
            }
        }
    }

    // ==========================
    // REPORTS MANAGEMENT
    // ==========================
    async loadReports() {
        try {
            const response = await fetch('/api/reports');
            const reports = await response.json();
            this.populateReportsTable(reports);
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    populateReportsTable(reports) {
        const tbody = document.querySelector('#reports-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        reports.forEach(report => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${report.report_id}</td>
                <td>${report.reporter_name}</td>
                <td>${report.reported_user_name}</td>
                <td>${report.user_role}</td>
                <td>${report.user_email}</td>
                <td>${report.report_details}</td>
                <td><span class="badge ${this.getStatusClass(report.offense_level)}">${report.offense_level || 'pending'}</span></td>
                <td>${new Date(report.report_date).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="admin.banUser(${report.reported_user_id}, 'temporary')" title="Temporary Ban">
                        <i class="fa-solid fa-clock"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.banUser(${report.reported_user_id}, 'permanent')" title="Permanent Ban">
                        <i class="fa-solid fa-ban"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="admin.resolveReport(${report.report_id})" title="Resolve">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async banUser(userId, banType) {
        let duration = null;
        if (banType === 'temporary') {
            duration = prompt('Enter ban duration in days (or leave empty for indefinite):');
            if (duration === null) return; // User cancelled
            duration = duration === '' ? null : parseInt(duration);
        }

        if (confirm(`Are you sure you want to ${banType} ban this user?`)) {
            try {
                const response = await fetch('/api/ban-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, ban_type: banType, duration: duration })
                });
                const result = await response.json();
                if (result.success) {
                    alert('User banned successfully!');
                    this.loadReports();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error banning user: ' + error.message);
            }
        }
    }

    async resolveReport(reportId) {
        if (confirm('Are you sure you want to resolve this report?')) {
            try {
                const response = await fetch('/api/resolve-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ report_id: reportId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Report resolved successfully!');
                    this.loadReports();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error resolving report: ' + error.message);
            }
        }
    }

    async exportReportsPDF() {
        try {
            const response = await fetch('/api/export-reports-pdf');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'reports.pdf';
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error generating PDF report');
            }
        } catch (error) {
            alert('Error exporting PDF: ' + error.message);
        }
    }

    // ==========================
    // COMMISSIONS MANAGEMENT
    // ==========================
    async loadCommissions() {
        try {
            const response = await fetch(`/api/commissions?filter=${this.currentCommissionFilter}`);
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
                <td><input type="checkbox" aria-label="Select" data-commission-id="${commission.order_id}"></td>
                <td>${commission.order_id}</td>
                <td>${commission.seller_name || 'N/A'}</td>
                <td>${commission.product_name || 'N/A'}</td>
                <td>₱${commission.total_amount.toFixed(2)}</td>
                <td>${commission.commission_rate}%</td>
                <td>₱${commission.commission_amount.toFixed(2)}</td>
                <td><span class="badge ${this.getStatusClass(commission.commission_status)}">${commission.commission_status}</span></td>
                <td>${new Date(commission.order_date).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="admin.approveCommission(${commission.order_id})" title="Approve">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.rejectCommission(${commission.order_id})" title="Reject">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterCommissions(filter) {
        this.currentCommissionFilter = filter;
        this.loadCommissions();
    }

    toggleSelectAll(checkbox) {
        const checkboxes = document.querySelectorAll('#commissions-table tbody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
    }

    async approveCommission(orderId) {
        if (confirm('Are you sure you want to approve this commission?')) {
            try {
                const response = await fetch('/api/approve-commission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Commission approved successfully!');
                    this.loadCommissions();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error approving commission: ' + error.message);
            }
        }
    }

    async rejectCommission(orderId) {
        if (confirm('Are you sure you want to reject this commission?')) {
            try {
                const response = await fetch('/api/reject-commission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Commission rejected successfully!');
                    this.loadCommissions();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error rejecting commission: ' + error.message);
            }
        }
    }

    showCommissionSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Commission Settings</h3>
                <form id="commission-settings-form">
                    <div class="form-group">
                        <label>Commission Rate (%)</label>
                        <input type="number" name="rate" step="0.1" min="0" max="100" required>
                    </div>
                    <div class="form-group">
                        <label>Rate Type</label>
                        <select name="type">
                            <option value="percentage">Percentage</option>
                            <option value="flat">Flat Rate</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">Save Settings</button>
                        <button type="button" class="btn btn-outline" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#commission-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const settings = Object.fromEntries(formData);
            
            try {
                const response = await fetch('/api/update-commission-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('Commission settings updated successfully!');
                    modal.remove();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error updating settings: ' + error.message);
            }
        });
    }

    async exportCommissionsPDF() {
        try {
            const response = await fetch('/api/export-commissions-pdf');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'commissions.pdf';
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error generating PDF report');
            }
        } catch (error) {
            alert('Error exporting PDF: ' + error.message);
        }
    }

    // ==========================
    // DASHBOARD MANAGEMENT
    // ==========================
    async loadBestSellers() {
        try {
            const response = await fetch('/api/best-sellers');
            const sellers = await response.json();
            this.populateBestSellersTable(sellers);
        } catch (error) {
            console.error('Error loading best sellers:', error);
        }
    }

    populateBestSellersTable(sellers) {
        const tbody = document.querySelector('#best-sellers-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        sellers.forEach(seller => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${seller.seller_id}</td>
                <td>${seller.seller_name}</td>
                <td>${seller.shop_name || 'N/A'}</td>
                <td>${seller.total_products_sold}</td>
                <td>₱${seller.total_revenue.toFixed(2)}</td>
                <td>${seller.average_rating ? seller.average_rating.toFixed(1) : 'N/A'}</td>
                <td>₱${seller.commission_earned.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadTopProducts() {
        try {
            const response = await fetch(`/api/top-products?period=${this.currentTopProductsPeriod}`);
            const products = await response.json();
            this.populateTopProductsTable(products);
        } catch (error) {
            console.error('Error loading top products:', error);
        }
    }

    populateTopProductsTable(products) {
        const tbody = document.querySelector('#top-products-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.product_name}</td>
                <td>${product.seller_name || 'N/A'}</td>
                <td>${product.quantity_sold}</td>
                <td>₱${product.revenue.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadEarnings() {
        try {
            const response = await fetch(`/api/earnings?period=${this.currentEarningsPeriod}`);
            const earnings = await response.json();
            this.updateEarningsDisplay(earnings);
        } catch (error) {
            console.error('Error loading earnings:', error);
        }
    }

    updateEarningsDisplay(earnings) {
        const totalEarned = document.querySelector('#total-earned');
        const earningsPeriod = document.querySelector('#earnings-period');
        
        if (totalEarned) {
            totalEarned.textContent = `₱ ${earnings.total.toFixed(2)}`;
        }
        if (earningsPeriod) {
            earningsPeriod.textContent = earnings.period;
        }
    }

    filterEarnings(period) {
        this.currentEarningsPeriod = period;
        this.loadEarnings();
    }

    filterTopProducts(period) {
        this.currentTopProductsPeriod = period;
        this.loadTopProducts();
    }

    refreshBestSellers() {
        this.loadBestSellers();
    }

    async exportBestSellersPDF() {
        try {
            const response = await fetch('/api/export-best-sellers-pdf');
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'best-sellers.pdf';
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Error generating PDF report');
            }
        } catch (error) {
            alert('Error exporting PDF: ' + error.message);
        }
    }

    // ==========================
    // USERS MANAGEMENT (EXISTING)
    // ==========================
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
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td><span class="badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}">${user.status}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-light btn-icon" onclick="admin.editUser(${user.id})">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // ==========================
    // UTILITY METHODS
    // ==========================
    getStatusClass(status) {
        const statusMap = {
            'active': 'success',
            'pending': 'warning',
            'delivered': 'success',
            'paid': 'success',
            'cancelled': 'danger',
            'rejected': 'danger',
            'approved': 'success',
            'archived': 'secondary',
            'banned': 'danger',
            'warning': 'warning',
            'suspension': 'warning',
            'ban': 'danger',
            'deleted': 'danger'
        };
        return statusMap[status] || 'secondary';
    }

    setupEventListeners() {
        // Add event listeners for buttons and forms
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-primary') && e.target.textContent.includes('Add user')) {
                this.showAddUserModal();
            }
        });

        // Search functionality
        const searchInput = document.querySelector('#best-sellers-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterBestSellers(e.target.value);
            });
        }

        // Period filter for best sellers
        const periodSelect = document.querySelector('#best-sellers-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.filterBestSellersByPeriod(e.target.value);
            });
        }
    }

    filterBestSellers(searchTerm) {
        const rows = document.querySelectorAll('#best-sellers-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }

    filterBestSellersByPeriod(period) {
        // This would typically make an API call to filter by period
        console.log('Filtering best sellers by period:', period);
        // For now, just reload the data
        this.loadBestSellers();
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

    // Action methods
    editUser(userId) {
        console.log('Edit user:', userId);
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new HarayaHomeAdmin();
});