import sqlite3

conn = sqlite3.connect("crowdflow.db")
cursor = conn.cursor()

# Check if tables exist
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

if tables:
    cursor.execute("SELECT email, role FROM users")
    rows = cursor.fetchall()
    print("Users in database:", rows)

conn.close()
