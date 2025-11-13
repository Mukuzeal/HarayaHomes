from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash
import mysql.connector
import os
from flask import Flask, request, redirect, url_for, flash
from werkzeug.utils import secure_filename
from flask_mailman import Mail, EmailMessage
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature



app = Flask(__name__)
app.secret_key = "harayahomes_secret_key"

# --- Flask-Mail config ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'harayahomes@gmail.com'
app.config['MAIL_PASSWORD'] = 'gtcs wker caqs pfxo'
app.config['MAIL_DEFAULT_SENDER'] = ('Haraya Homes', 'noreply@harayahomes.com')




mail = Mail(app)
serializer = URLSafeTimedSerializer(app.secret_key)

app.config['UPLOAD_FOLDER'] = 'static/uploads'  # Folder to save uploads
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB limit

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}



def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db_connection():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="",
        database="harayahomesdb"
    )

# ----- Login required decorator -----
def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if "user_id" not in session:
                return redirect(url_for("login"))
            if role and session.get("user_role") != role:
                return redirect(url_for("home"))
            return f(*args, **kwargs)
        return wrapped
    return decorator

# ----- Ensure default admin exists -----
def ensure_default_admin():
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if admin already exists
        cursor.execute("SELECT id FROM users WHERE email=%s", ("admin02@gmail.com",))
        existing = cursor.fetchone()
        if existing:
            return

        # Check if optional columns exist to build a compatible INSERT
        cursor.execute("SHOW COLUMNS FROM users LIKE 'username'")
        has_username = cursor.fetchone() is not None

        # Build INSERT dynamically depending on schema
        hashed_password = generate_password_hash("1234")

        if has_username:
            cursor.execute(
                """
                INSERT INTO users (username, fname, lname, email, password, role)
                VALUES (%s, %s, %s, %s, %s)
                """,
                ("admin", "Admin", "User", "admin02@gmail.com", hashed_password, "admin",),
            )
        else:
            cursor.execute(
                """
                INSERT INTO users (fname, lname, email, password, role, auth_provider)
                VALUES (%s, %s, %s, %s, %s)
                """,
                ("Admin", "User", "admin02@gmail.com", hashed_password, "admin"),
            )

        conn.commit()
        print("Default admin user created: admin02@gmail.com / 1234")
    except Error as e:
        print("Failed ensuring default admin:", e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Ensure default admin at startup (Flask 3.x removed before_first_request)
ensure_default_admin()

# ----- Landing page -----
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

# ----- Login & Sign Up -----
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        action = request.form.get("action")
        username = request.form.get("username")
        first_name = request.form.get("fname")
        last_name = request.form.get("lname")
        email = request.form.get("email")
        password = request.form.get("password")

        conn = cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # ----- SIGN UP -----
            if action == "signup":
                if not first_name or not last_name or not email or not password:
                    flash("Please fill in all required fields.", "error")
                    return redirect(url_for("login"))

                confirm_password = request.form.get("confirm_password")

                if len(password) < 8:
                    flash("Password must be at least 8 characters long.", "error")
                    return redirect(url_for("login"))

                if password != confirm_password:
                    flash("Passwords do not match.", "error")
                    return redirect(url_for("login"))

                # Check if email exists
                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                if cursor.fetchone():
                    flash("User with that email already exists!", "error")
                    return redirect(url_for("login"))

                hashed_password = generate_password_hash(password)

                # Insert user, default role is 'buyer'
                cursor.execute(
                    """
                    INSERT INTO users (fname, lname, email, password, role)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (first_name, last_name, email, hashed_password, "buyer"),
                )
                conn.commit()

                flash("Account created successfully! Please log in.", "success")
                return redirect(url_for("login"))

            # ----- SIGN IN -----
            elif action == "signin":
                if not email or not password:
                    flash("Please enter email and password.", "error")
                    return redirect(url_for("login"))

                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                user = cursor.fetchone()

                if user and check_password_hash(user["password"], password):
                    # Store session info
                    session["user_id"] = user["id"]
                    session["user_role"] = user.get("role", "buyer")
                    session["fname"] = user.get("fname", "")

                    # Redirect based on role
                    role = session["user_role"]
                    if role == "admin":
                        return redirect(url_for("dashboard"))
                    elif role == "seller":
                        return redirect(url_for("seller_dashboard"))
                    elif role == "rider":
                        return redirect(url_for("rider_dashboard"))
                    else:
                        return redirect(url_for("home"))
                else:
                    flash("Invalid credentials!", "error")
                    return redirect(url_for("login"))

        except Error as e:
            print("Database error:", e)
            flash("An internal error occurred. Please try again later.", "error")
            return redirect(url_for("login"))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    return render_template("LoginSignup/login.html")


# ----- Logout -----
@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "info")
    return redirect(url_for("index"))

# ----- Home for normal users -----
@app.route("/home")
@login_required()
def home():
    return render_template("index.html", fname=session.get("fname"))

# ==========================
# ADMIN ROUTES
# ==========================
# Note: you told me admin dashboard lives at templates/AdminDashboard/admindashboard.html



# ------------------- SIGNUP ROUTE -------------------
@app.route("/signup/<token>", methods=["GET", "POST"])
def signup_from_email(token):
    try:
        email = serializer.loads(token, salt="email-confirm", max_age=86400)
    except SignatureExpired:
        flash("This signup link has expired.", "error")
        return redirect(url_for("index"))
    except BadSignature:
        flash("Invalid signup link.", "error")
        return redirect(url_for("index"))

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            flash("Account already exists.", "error")
            return redirect(url_for("login"))

        if request.method == "POST":
            fname = request.form.get("fname")
            lname = request.form.get("lname")
            password = request.form.get("password")  # hash before storing
            role = request.form.get("role")
            account_status = "Active"

            cursor.execute(
                "INSERT INTO users (fname, lname, email, password, role, account_status) VALUES (%s,%s,%s,%s,%s,%s)",
                (fname, lname, email, password, role, account_status)
            )
            conn.commit()
            user_id = cursor.lastrowid

            if role == "rider":
                cursor.execute("SELECT first_name, last_name, contact_number, address, vehicle_type, vehicle_model, plate_number "
                               "FROM riderapplications WHERE email=%s", (email,))
                data = cursor.fetchone()
                cursor.execute(
                    "INSERT INTO riders (user_id, Fname, Lname, PhoneNumber, email, Address, vehicle_type, vehicle_model, plate_number) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (user_id, data[0], data[1], data[2], email, data[3], data[4], data[5], data[6])
                )
            else:  # seller
                cursor.execute("SELECT store_name, address, email, PhoneNumber "
                               "FROM sellerapplications WHERE email=%s", (email,))
                data = cursor.fetchone()
                cursor.execute(
                    "INSERT INTO seller (user_id, ShopName, Address, Email, PhoneNumber) "
                    "VALUES (%s,%s,%s,%s,%s)",
                    (user_id, data[0], data[1], email, data[3])
                )
            conn.commit()
            flash("Signup completed successfully!", "success")
            return redirect(url_for("login"))

        return render_template("signup_form.html", email=email)

    finally:
        if cursor: cursor.close()
        if conn: conn.close()

 
# ------------------- APPROVE ROUTE -------------------
@app.route("/approve/<string:application_type>/<int:application_id>", methods=["POST"])
def approve_application(application_type, application_id):
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch email and name
        if application_type == "rider":
            cursor.execute("SELECT first_name, last_name, email FROM riderapplications WHERE application_id=%s", (application_id,))
            app_data = cursor.fetchone()
            if not app_data:
                flash("Application not found.", "error")
                return redirect(url_for("admin_dashboard"))
            email = app_data[2]
            name = f"{app_data[0]} {app_data[1]}"
        else:  # seller
            cursor.execute("SELECT store_name, email FROM sellerapplications WHERE application_id=%s", (application_id,))
            app_data = cursor.fetchone()
            if not app_data:
                flash("Application not found.", "error")
                return redirect(url_for("admin_dashboard"))
            email = app_data[1]
            name = app_data[0]

        # Approve application
        cursor.execute(f"UPDATE {application_type}applications SET Approval='Approved' WHERE application_id=%s", (application_id,))
        conn.commit()

        # Generate signup link
        token = serializer.dumps(email, salt="email-confirm")
        signup_link = url_for("signup_from_email", token=token, _external=True)

        # Send email
        body = f"Hello {name},\n\nYour {application_type} application has been approved. Complete your signup here:\n{signup_link}\nLink expires in 24 hours."
        email_message = EmailMessage(subject="Application Approved!", body=body, to=[email])
        email_message.send()

        flash(f"{application_type.capitalize()} application approved and email sent.", "success")
        return redirect(url_for("admin_dashboard"))

    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# ------------------- REJECT ROUTE -------------------
@app.route("/api/reject-application", methods=["POST"])
@login_required(role="admin")
def reject_application():
    data = request.get_json()
    app_id = data.get("application_id")
    app_type = data.get("type")
    
    if not app_id or not app_type:
        return jsonify({"error": "Invalid data"}), 400

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch email first
        if app_type == "seller":
            cursor.execute("SELECT email FROM sellerapplications WHERE application_id=%s", (app_id,))
        elif app_type == "rider":
            cursor.execute("SELECT email FROM riderapplications WHERE application_id=%s", (app_id,))
        else:
            return jsonify({"error": "Unknown application type"}), 400

        email_row = cursor.fetchone()
        if not email_row:
            return jsonify({"error": "Application not found"}), 404
        applicant_email = email_row[0]

        # Reject application
        if app_type == "seller":
            cursor.execute("UPDATE sellerapplications SET Approval='Rejected' WHERE application_id=%s", (app_id,))
        else:
            cursor.execute("UPDATE riderapplications SET Approval='Rejected' WHERE application_id=%s", (app_id,))
        conn.commit()

        # Send rejection email
        message = EmailMessage(
            subject="Your Application Has Been Rejected",
            body=f"Hello,\n\nWe regret to inform you that your application has been rejected.\n\nThank you for applying.",
            to=[applicant_email]
        )
        message.send()

        return jsonify({"success": True})

    finally:
        if cursor: cursor.close()
        if conn: conn.close()

        


@app.route("/dashboard")
@login_required(role="admin")
def dashboard():
    return render_template("AdminDashboard/admindashboard.html")

@app.route("/applications")
@login_required(role="admin")
def applications():
    return render_template("AdminDashboard/adminapplications.html")

@app.route("/commissions")
@login_required(role="admin")
def commissions():
    return render_template("AdminDashboard/admincommissions.html")

@app.route("/users")
@login_required(role="admin")
def users_page():
    return render_template("AdminDashboard/adminusers.html")

@app.route("/reports")
@login_required(role="admin")
def reports():
    return render_template("AdminDashboard/adminreports.html")

@app.route("/products")
@login_required(role="admin")
def products():
    return render_template("AdminDashboard/adminproducts.html")


# ==========================
# PRODUCTS API ENDPOINTS
# ==========================

# Fetch products (active or archived)
@app.route("/api/products")
@login_required(role="admin")
def api_products():
    view = request.args.get('view', 'active')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if view == 'archived':
            cursor.execute("""
                SELECT p.*, s.ShopName as seller_name, u.fname, u.lname
                FROM products p
                LEFT JOIN seller s ON p.seller_id = s.Seller_id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE p.is_archived = 'Yes'
            """)
        else:
            cursor.execute("""
                SELECT p.*, s.ShopName as seller_name, u.fname, u.lname
                FROM products p
                LEFT JOIN seller s ON p.seller_id = s.Seller_id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE p.is_archived = 'No' OR p.is_archived IS NULL
            """)
        
        products = cursor.fetchall()
        return jsonify(products)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Archive product
@app.route("/api/archive-product", methods=["POST"])
@login_required(role="admin")
def archive_product():
    data = request.get_json()
    product_id = data.get("product_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE products SET is_archived='Yes', status='archived' WHERE Product_id=%s", (product_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Product archived successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Restore product
@app.route("/api/restore-product", methods=["POST"])
@login_required(role="admin")
def restore_product():
    data = request.get_json()
    product_id = data.get("product_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE products SET is_archived='No', status='active' WHERE Product_id=%s", (product_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Product restored successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Delete product permanently
@app.route("/api/delete-product", methods=["POST"])
@login_required(role="admin")
def delete_product():
    data = request.get_json()
    product_id = data.get("product_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE Product_id=%s", (product_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Product deleted permanently"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Warn seller
@app.route("/api/warn-seller", methods=["POST"])
@login_required(role="admin")
def warn_seller():
    data = request.get_json()
    product_id = data.get("product_id")
    seller_id = data.get("seller_id")
    message = data.get("message")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO seller_warnings (seller_id, product_id, warning_message)
            VALUES (%s, %s, %s)
        """, (seller_id, product_id, message))
        conn.commit()
        return jsonify({"success": True, "message": "Warning sent to seller"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ==========================
# APPLICATIONS API ENDPOINTS
# ==========================

# Fetch applications
@app.route("/api/applications")
@login_required(role="admin")
def api_applications():
    filter_type = request.args.get('filter', 'all')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        applications = []

        if filter_type in ('seller', 'all'):
            cursor.execute("""
                SELECT sa.application_id,
                       sa.store_name AS applicant_name,
                       'seller' AS type,
                       sa.PhoneNumber AS phone,
                       sa.email AS email,
                       sa.Address AS address,
                       sa.Product_Category AS category,
                       sa.Approval AS status,
                       sa.submitted_at AS submitted,
                       sa.valid_id_path,
                       sa.document_path
                FROM sellerapplications sa
            """)
            applications += cursor.fetchall()

        if filter_type in ('rider', 'all'):
            cursor.execute("""
                SELECT ra.application_id,
                       CONCAT(ra.first_name, ' ', ra.last_name) AS applicant_name,
                       'rider' AS type,
                       ra.contact_number AS phone,
                       ra.email AS email,
                       ra.address AS address,
                       ra.vehicle_type AS category,
                       ra.Approval AS status,
                       ra.submitted_at AS submitted,
                       ra.valid_id_path,
                       ra.license_path,
                       ra.orcr_upload_path,
                       ra.vehicle_front_path,
                       ra.vehicle_back_path
                FROM riderapplications ra
            """)
            applications += cursor.fetchall()

        return jsonify(applications)

    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# APPROVAL AND REJECTION

@app.route("/api/approve-application", methods=["POST"])
@login_required(role="admin")
def Deapprove_application():
    data = request.get_json()
    app_id = data.get("application_id")
    app_type = data.get("type")
    
    if not app_id or not app_type:
        return jsonify({"error": "Invalid data"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if app_type == "seller":
            cursor.execute("UPDATE sellerapplications SET Approval='Approved' WHERE application_id=%s", (app_id,))
        elif app_type == "rider":
            cursor.execute("UPDATE riderapplications SET Approval='Approved' WHERE application_id=%s", (app_id,))
        else:
            return jsonify({"error": "Unknown application type"}), 400

        conn.commit()
        return jsonify({"success": True})

    except Exception as e:
        print("Approval error:", e)
        return jsonify({"error": "Failed to approve application"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()



# Fetch reports
@app.route("/api/reports")
@login_required(role="admin")
def api_reports():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT r.*, 
                   CONCAT(ru.fname, ' ', ru.lname) as reporter_name,
                   CONCAT(ru2.fname, ' ', ru2.lname) as reported_user_name,
                   ru2.role as user_role,
                   ru2.email as user_email
            FROM reports r
            JOIN users ru ON r.user_id = ru.id
            JOIN users ru2 ON r.reported_user_id = ru2.id
            ORDER BY r.report_date DESC
        """)
        reports = cursor.fetchall()
        return jsonify(reports)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Ban user
@app.route("/api/ban-user", methods=["POST"])
@login_required(role="admin")
def ban_user():
    data = request.get_json()
    user_id = data.get("user_id")
    ban_type = data.get("ban_type")
    duration = data.get("duration")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if ban_type == 'permanent':
            cursor.execute("UPDATE users SET account_status='banned' WHERE id=%s", (user_id,))
        else:  # temporary
            if duration:
                cursor.execute("UPDATE users SET account_status='suspended', suspending_until=DATE_ADD(NOW(), INTERVAL %s DAY) WHERE id=%s", (duration, user_id))
            else:
                cursor.execute("UPDATE users SET account_status='banned' WHERE id=%s", (user_id,))
        
        conn.commit()
        return jsonify({"success": True, "message": "User banned successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Resolve report
@app.route("/api/resolve-report", methods=["POST"])
@login_required(role="admin")
def resolve_report():
    data = request.get_json()
    report_id = data.get("report_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE reports SET report_status='resolved' WHERE report_id=%s", (report_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Report resolved successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Export reports PDF
@app.route("/api/export-reports-pdf")
@login_required(role="admin")
def export_reports_pdf():
    try:
        # This would typically generate a PDF using a library like reportlab
        # For now, return a simple response
        return jsonify({"message": "PDF export functionality would be implemented here"})
    except Error as e:
        return jsonify({"error": str(e)}), 500

# ==========================
# COMMISSIONS API ENDPOINTS
# ==========================

# Fetch commissions
@app.route("/api/commissions")
@login_required(role="admin")
def api_commissions():
    filter_type = request.args.get('filter', 'all')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        where_clause = ""
        if filter_type != 'all':
            where_clause = f"WHERE o.commission_status='{filter_type}'"
        
        cursor.execute(f"""
            SELECT o.*, 
                   CONCAT(su.fname, ' ', su.lname) as seller_name,
                   p.product_name,
                   o.total_amount * (o.commission_rate / 100) as commission_amount
            FROM orders o
            LEFT JOIN seller s ON o.seller_id = s.Seller_id
            LEFT JOIN users su ON s.user_id = su.id
            LEFT JOIN products p ON o.product_id = p.Product_id
            {where_clause}
            ORDER BY o.order_date DESC
        """)
        commissions = cursor.fetchall()
        return jsonify(commissions)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Approve commission
@app.route("/api/approve-commission", methods=["POST"])
@login_required(role="admin")
def approve_commission():
    data = request.get_json()
    order_id = data.get("order_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE orders SET commission_status='approved' WHERE order_id=%s", (order_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Commission approved successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Reject commission
@app.route("/api/reject-commission", methods=["POST"])
@login_required(role="admin")
def reject_commission():
    data = request.get_json()
    order_id = data.get("order_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE orders SET commission_status='rejected' WHERE order_id=%s", (order_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Commission rejected successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Update commission settings
@app.route("/api/update-commission-settings", methods=["POST"])
@login_required(role="admin")
def update_commission_settings():
    data = request.get_json()
    rate = data.get("rate")
    rate_type = data.get("type")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO commission_rates (rate_type, rate_value)
            VALUES (%s, %s)
        """, (rate_type, rate))
        conn.commit()
        return jsonify({"success": True, "message": "Commission settings updated successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Export commissions PDF
@app.route("/api/export-commissions-pdf")
@login_required(role="admin")
def export_commissions_pdf():
    try:
        # This would typically generate a PDF using a library like reportlab
        return jsonify({"message": "PDF export functionality would be implemented here"})
    except Error as e:
        return jsonify({"error": str(e)}), 500

# ==========================
# DASHBOARD API ENDPOINTS
# ==========================

# Dashboard stats
@app.route("/api/dashboard-stats")
@login_required(role="admin")
def api_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Calculate total revenue (5% of all sales)
        cursor.execute("""
            SELECT COALESCE(SUM(total_amount * 0.05), 0) as total_revenue
            FROM orders 
            WHERE payment_status = 'paid' AND is_refunded = 'No'
        """)
        revenue = cursor.fetchone()
        
        return jsonify({
            "total_revenue": revenue['total_revenue'] or 0
        })
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Best sellers
@app.route("/api/best-sellers")
@login_required(role="admin")
def api_best_sellers():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.Seller_id as seller_id,
                   CONCAT(u.fname, ' ', u.lname) as seller_name,
                   s.ShopName as shop_name,
                   COUNT(o.order_id) as total_products_sold,
                   COALESCE(SUM(o.total_amount), 0) as total_revenue,
                   COALESCE(AVG(r.rating), 0) as average_rating,
                   COALESCE(SUM(o.total_amount * 0.05), 0) as commission_earned
            FROM seller s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN orders o ON s.Seller_id = o.seller_id AND o.payment_status = 'paid'
            LEFT JOIN reviews r ON s.Seller_id = r.product_id
            GROUP BY s.Seller_id, u.fname, u.lname, s.ShopName
            ORDER BY total_products_sold DESC
            LIMIT 10
        """)
        sellers = cursor.fetchall()
        return jsonify(sellers)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Top products
@app.route("/api/top-products")
@login_required(role="admin")
def api_top_products():
    period = request.args.get('period', 'week')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        date_filter = ""
        if period == 'week':
            date_filter = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 WEEK)"
        elif period == 'month':
            date_filter = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
        
        cursor.execute(f"""
            SELECT p.product_name,
                   CONCAT(u.fname, ' ', u.lname) as seller_name,
                   COUNT(o.order_id) as quantity_sold,
                   COALESCE(SUM(o.total_amount), 0) as revenue
            FROM products p
            LEFT JOIN seller s ON p.seller_id = s.Seller_id
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN orders o ON p.Product_id = o.product_id AND o.payment_status = 'paid' {date_filter}
            GROUP BY p.Product_id, p.product_name, u.fname, u.lname
            ORDER BY quantity_sold DESC
            LIMIT 10
        """)
        products = cursor.fetchall()
        return jsonify(products)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Earnings
@app.route("/api/earnings")
@login_required(role="admin")
def api_earnings():
    period = request.args.get('period', 'week')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        date_filter = ""
        if period == 'week':
            date_filter = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 WEEK)"
        elif period == 'month':
            date_filter = "AND o.order_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH)"
        
        cursor.execute(f"""
            SELECT COALESCE(SUM(total_amount * 0.05), 0) as total
            FROM orders 
            WHERE payment_status = 'paid' AND is_refunded = 'No' {date_filter}
        """)
        earnings = cursor.fetchone()
        
        period_text = f"This {period}" if period in ['week', 'month'] else "All time"
        
        return jsonify({
            "total": earnings['total'] or 0,
            "period": period_text
        })
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Export best sellers PDF
@app.route("/api/export-best-sellers-pdf")
@login_required(role="admin")
def export_best_sellers_pdf():
    try:
        # This would typically generate a PDF using a library like reportlab
        return jsonify({"message": "PDF export functionality would be implemented here"})
    except Error as e:
        return jsonify({"error": str(e)}), 500

# ==========================
# USERS API ENDPOINTS
# ==========================

# Fetch active users
@app.route("/api/users")
@login_required(role="admin")
def api_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, fname as first_name, lname as last_name, email, 
                   role, account_status as status, created_at 
            FROM users 
            WHERE account_status != 'deleted'
            ORDER BY created_at DESC
        """)
        
        users = cursor.fetchall()
        return jsonify(users)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route("/api/users/<int:user_id>")
@login_required(role="admin")
def get_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, fname, lname, email, role, account_status, created_at
            FROM users 
            WHERE id = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify(user)

    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/api/users/<int:user_id>", methods=["PUT"]) 
@login_required(role="admin")
def update_user(user_id):
    data = request.get_json()
    first_name = data.get("first_name")
    last_name = data.get("last_name") 
    email = data.get("email")

    if not all([first_name, last_name, email]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE users 
            SET fname = %s, lname = %s, email = %s
            WHERE id = %s
        """, (first_name, last_name, email, user_id))
        
        conn.commit()
        
        return jsonify({"message": "User updated successfully"})

    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Restore archived user
@app.route("/api/archived/restore", methods=["POST"])
@login_required(role="admin")
def restore_archived_user():
    data = request.get_json()
    archived_id = data.get("archived_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_archived='Not_Archived' WHERE id=%s", (archived_id,))
        conn.commit()
        return jsonify({"message": "User restored"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Delete user permanently
@app.route("/api/users/delete", methods=["POST"])
@login_required(role="admin")
def delete_user():
    data = request.get_json()
    user_id = data.get("user_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id=%s", (user_id,))
        conn.commit()
        return jsonify({"message": "User deleted"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Delete archived permanently
@app.route("/api/archived/delete", methods=["POST"])
@login_required(role="admin")
def delete_archived():
    data = request.get_json()
    archived_id = data.get("archived_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id=%s", (archived_id,))
        conn.commit()
        return jsonify({"message": "Archived user deleted"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route("/api/archived-users")
@login_required(role="admin")
def api_archived_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, fname as first_name, lname as last_name, email,
                   role, account_status as status, created_at
            FROM users 
            WHERE account_status = 'deleted'
            ORDER BY created_at DESC
        """)
        
        users = cursor.fetchall()
        return jsonify(users)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route("/apply", methods=["GET", "POST"])
def apply():
    if request.method == "POST":
        conn = cursor = None
        try:
            user_id = session.get("user_id")

            # Form data
            store_name = request.form.get("store_name")
            phone_number = request.form.get("phone")
            email = request.form.get("email")
            region = request.form.get("region_name")
            province = request.form.get("province_name")
            city = request.form.get("city_name")
            barangay = request.form.get("barangay_name")

            exact_address = request.form.get("exact_address")
            zip_code = request.form.get("zip_code")
            product_category = request.form.get("product_category")
            full_address = f"{exact_address}, {barangay}, {city}, {province}, {region}, {zip_code}"

            # Files
            valid_id_file = request.files.get("valid_id")
            document_file = request.files.get("document")

            # Applications folder
            applications_folder = os.path.join("static", "uploads", "Applications")
            os.makedirs(applications_folder, exist_ok=True)

            applicant_folder = os.path.join(applications_folder, store_name.replace(" ", "_"))
            valid_id_folder = os.path.join(applicant_folder, "Valid_IDs")
            document_folder = os.path.join(applicant_folder, "Business_Docs")
            os.makedirs(valid_id_folder, exist_ok=True)
            os.makedirs(document_folder, exist_ok=True)

            # Save files helper
            def save_file(file, folder, prefix):
                if not file or not allowed_file(file.filename):
                    raise ValueError(f"Invalid {prefix} file type. Only PDF, JPG, PNG allowed.")
                
                file.seek(0, os.SEEK_END)
                size = file.tell()
                file.seek(0)
                if size > app.config.get('MAX_CONTENT_LENGTH', 5*1024*1024):
                    raise ValueError(f"{prefix} file must be 5MB or less.")

                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = secure_filename(f"{prefix}.{ext}")
                path = os.path.join(folder, filename)
                file.save(path)
                return path

            valid_id_path = save_file(valid_id_file, valid_id_folder, "valid_id")
            document_path = save_file(document_file, document_folder, "document")

            # Insert into database
            conn = get_db_connection()
            cursor = conn.cursor()
            sql = """
                INSERT INTO sellerapplications
                (user_id, store_name, PhoneNumber, Email, Address, Product_Category, valid_id_path, document_path, Approval, submitted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending', NOW())
            """
            values = (user_id, store_name, phone_number, email, full_address, product_category, valid_id_path, document_path)
            cursor.execute(sql, values)
            conn.commit()

            flash("Application submitted successfully!", "success")
            return redirect(url_for("apply"))

        except ValueError as ve:
            flash(str(ve), "error")
            return redirect(url_for("apply"))
        except Exception as e:
            print("Error submitting seller application:", e)
            flash("An error occurred while submitting your application. Please try again.", "error")
            return redirect(url_for("apply"))
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    return render_template("SellerApplications/SellerApplications.html")


@app.route("/RiderApply", methods=["GET", "POST"])
def RiderApply():
    if request.method == "POST":
        conn = cursor = None
        try:
            user_id = session.get("user_id")

            # --- Form Data ---
            first_name = request.form.get("first_name")
            last_name = request.form.get("last_name")
            birthday = request.form.get("birthday")
            age = request.form.get("age")
            gender = request.form.get("gender")
            contact_number = request.form.get("contact_number")
            email = request.form.get("email")
            region = request.form.get("region_name")
            province = request.form.get("province_name")
            city = request.form.get("city_name")
            barangay = request.form.get("barangay_name")
            exact_address = request.form.get("exact_address")
            zip_code = request.form.get("zip_code")
            address = f"{exact_address}, {barangay}, {city}, {province}, {region}, {zip_code}"

            vehicle_type = request.form.get("vehicle_type")
            vehicle_model = request.form.get("vehicle_model")
            plate_number = request.form.get("plate_number")

            # --- File Uploads ---
            vehicle_front = request.files.get("vehicle_front")
            vehicle_back = request.files.get("vehicle_back")
            valid_id = request.files.get("valid_id")
            license_file = request.files.get("license")
            orcr = request.files.get("orcr")

            # --- Folder Setup ---
            rider_folder = os.path.join("static", "uploads", "RiderApplications", f"{first_name}_{last_name}")
            os.makedirs(rider_folder, exist_ok=True)
            folders = {
                "vehicle": os.path.join(rider_folder, "Vehicle"),
                "ids": os.path.join(rider_folder, "Valid_IDs"),
                "license": os.path.join(rider_folder, "Licenses"),
                "orcr": os.path.join(rider_folder, "ORCR")
            }
            for path in folders.values():
                os.makedirs(path, exist_ok=True)

            # --- Save Files ---
            def save_file(file, folder, prefix):
                if not file or not allowed_file(file.filename):
                    raise ValueError(f"Invalid {prefix} file type. Only PDF, JPG, PNG allowed.")
                file.seek(0, os.SEEK_END)
                size = file.tell()
                file.seek(0)
                if size > app.config.get('MAX_CONTENT_LENGTH', 5*1024*1024):
                    raise ValueError(f"{prefix} file must be 5MB or less.")
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = secure_filename(f"{prefix}.{ext}")
                path = os.path.join(folder, filename)
                file.save(path)
                return path

            vehicle_front_path = save_file(vehicle_front, folders["vehicle"], "vehicle_front")
            vehicle_back_path = save_file(vehicle_back, folders["vehicle"], "vehicle_back")
            valid_id_path = save_file(valid_id, folders["ids"], "valid_id")
            license_path = save_file(license_file, folders["license"], "license")
            orcr_path = save_file(orcr, folders["orcr"], "orcr_upload")

            # --- Database Insert ---
            conn = get_db_connection()
            cursor = conn.cursor()
            sql = """
                INSERT INTO riderapplications
                (user_id, first_name, last_name, birthday, age, gender, contact_number, email, address,
                 vehicle_type, vehicle_model, plate_number, vehicle_front_path, vehicle_back_path,
                 valid_id_path, license_path, orcr_upload_path, Approval, submitted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending', NOW())
            """
            values = (
                user_id, first_name, last_name, birthday, age, gender, contact_number, email, address,
                vehicle_type, vehicle_model, plate_number,
                vehicle_front_path, vehicle_back_path, valid_id_path, license_path, orcr_path
            )
            cursor.execute(sql, values)
            conn.commit()

            flash("Rider registration submitted successfully!", "success")
            return redirect(url_for("RiderApply"))

        except ValueError as ve:
            flash(str(ve), "error")
            return redirect(url_for("RiderApply"))
        except Exception as e:
            print("Error submitting rider application:", e)
            import traceback
            traceback.print_exc()
            flash("An error occurred while submitting your application. Please try again.", "error")
            return redirect(url_for("RiderApply"))
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    return render_template("RiderApplications/RiderRegistration.html")




@app.route("/RiderDashboard", methods=["GET", "POST"])
def RiderDashboard():
    return render_template("RiderApplications/RiderDashboard.html")

@app.route("/RiderDelivery", methods=["GET", "POST"])
def RiderDelivery():
    return render_template("RiderApplications/RiderDelivery.html")

@app.route("/TakeDelivery", methods=["GET", "POST"])
def TakeDelivery():
    return render_template("RiderApplications/TakeDelivery.html")



#SELLER

@app.route("/sellerdashboard", methods=["GET", "POST"])
def sellerdashboard():
    return render_template("SellerDashboard/sellerdashboard.html")

@app.route("/addproducts", methods=["GET", "POST"])
def addproducts():
    return render_template("SellerDashboard/addproducts.html")


# Serve individual seller pages under /seller/<page>
@app.route("/seller/<path:page>")
@login_required()
def seller_page(page):
    # Allow links like "/seller/orders" or "/seller/orders.html" or relative links from /seller/products to "product_form.html"
    if not page.endswith(".html"):
        page = page + ".html"
    try:
        return render_template(f"sellerdashboard/{page}")
    except Exception:
        # template doesn't exist
        return "Page not found", 404

# explicit route for product_form.html if clicked as relative link (from /seller/products -> product_form.html)
@app.route("/seller/product_form.html")
@login_required()
def seller_product_form_html():
    try:
        return render_template("SellerDashboard/product_form.html")
    except Exception:
        return "Page not found", 404

#BUYER

@app.route("/BuyerDashboard", methods=["GET", "POST"])
def BuyerDashboard():
    return render_template("BuyerDashboard/BuyerDashboard.html")


if __name__ == "__main__":
    app.run(debug=True)