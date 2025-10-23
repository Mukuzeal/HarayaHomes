from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error
from functools import wraps

app = Flask(__name__)
app.secret_key = "harayahomes_secret_key"

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

            if action == "signup":
                if not username or not first_name or not last_name or not email or not password:
                    flash("Please fill in all required fields.", "error")
                    return redirect(url_for("login"))

                confirm_password = request.form.get("confirm_password")

                # Check password length
                if len(password) < 8:
                    flash("Password must be at least 8 characters long.", "error")
                    return redirect(url_for("login"))

                # Check if passwords match
                if password != confirm_password:
                    flash("Passwords do not match.", "error")
                    return redirect(url_for("login"))

                # Check if email exists
                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                if cursor.fetchone():
                    flash("User with that email already exists!", "error")
                    return redirect(url_for("login"))

                # Insert user
                hashed_password = generate_password_hash(password)
                cursor.execute(
                    "INSERT INTO users (username, fname, lname, email, password, role, auth_provider) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (username, first_name, last_name, email, hashed_password, "user", "local")
                )
                conn.commit()

                flash("Account created successfully! Please log in.", "success")
                return redirect(url_for("login"))


            # ----- SIGN IN -----
            # ----- SIGN IN -----
            elif action == "signin":
                if not email or not password:
                    flash("Please enter email and password.", "error")
                    return redirect(url_for("login"))

                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                user = cursor.fetchone()

                if user and check_password_hash(user.get("password"), password):
                    # store session
                    session["user_id"] = user.get("id")
                    session["user_role"] = user.get("role", "user")
                    session["fname"] = user.get("fname") or ""

                    # redirect based on role
                    if session["user_role"].lower() == "admin":
                        return redirect(url_for("dashboard"))
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
            SELECT id, fname AS first_name, lname AS last_name, email, role, account_status AS status, created_at
            FROM users
            WHERE is_archived = 'Not_Archived'
        """)
        users = cursor.fetchall()
        return jsonify(users)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Fetch archived users
@app.route("/api/archived-users")
@login_required(role="admin")
def api_archived_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, fname AS first_name, lname AS last_name, email, role, account_status AS status, created_at AS archived_at
            FROM users
            WHERE is_archived = 'Archived'
        """)
        users = cursor.fetchall()
        return jsonify(users)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# Archive a user
@app.route("/api/users/archive", methods=["POST"])
@login_required(role="admin")
def archive_user():
    data = request.get_json()
    user_id = data.get("user_id")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET is_archived='Archived' WHERE id=%s", (user_id,))
        conn.commit()
        return jsonify({"message": "User archived"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

        # Update user info
@app.route("/api/users/<int:user_id>", methods=["PUT"])
@login_required(role="admin")
def update_user(user_id):
    data = request.get_json()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    role = data.get("role")

    if not all([first_name, last_name, email, role]):
        return jsonify({"error": "All fields are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users
            SET fname=%s, lname=%s, email=%s, role=%s
            WHERE id=%s
        """, (first_name, last_name, email, role, user_id))
        conn.commit()
        return jsonify({"message": "User updated successfully"})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


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

@app.route("/api/users/<int:user_id>")
@login_required(role="admin")
def get_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                id, 
                fname AS first_name, 
                lname AS last_name, 
                email, 
                role, 
                account_status AS status
            FROM users
            WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user)
    except Exception as e:
        print("API error:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    app.run(debug=True)
