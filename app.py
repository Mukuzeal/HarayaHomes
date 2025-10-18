from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
app.secret_key = "harayahomes_secret_key"

def get_db_connection():
    return mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="",
        database="harayahomesdb"
    )

# Login & Sign Up page
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        action = request.form.get("action")  # differentiate sign-in or sign-up
        fname = request.form.get("fname")
        lname = request.form.get("lname")
        email = request.form.get("email")
        password = request.form.get("password")

        conn = None
        cursor = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            if action == "signup":
                # Basic validation
                if not email or not password or not fname or not lname:
                    flash("Please fill in first name, last name, email and password.", "error")
                    return redirect(url_for("login"))

                # Check if email already exists
                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                existing_user = cursor.fetchone()
                if existing_user:
                    flash("User with that email already exists!", "error")
                    return redirect(url_for("login"))

                # Insert new user
                hashed_password = generate_password_hash(password)
                cursor.execute(
                    "INSERT INTO users (fname, lname, email, password, role, auth_provider) VALUES (%s, %s, %s, %s, %s, %s)",
                    (fname, lname, email, hashed_password, "user", "local")
                )
                conn.commit()
                flash("Account created successfully! Please log in.", "success")
                return redirect(url_for("login"))

            elif action == "signin":
                if not email or not password:
                    flash("Please enter email and password.", "error")
                    return redirect(url_for("login"))

                # Fetch user and verify password
                cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
                user = cursor.fetchone()
                if user and user.get("password") and check_password_hash(user.get("password"), password):
                    session["user_id"] = user.get("id")
                    session["fname"] = user.get("fname")
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

@app.route("/", methods=["GET", "POST"])
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
