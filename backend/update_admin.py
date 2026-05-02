import sqlite3

correct_hash = "$argon2id$v=19$m=65536,t=3,p=4$3ntPKaV0jlFq7d37H8P4Xw$KTkm6dwj9N9bYyKkmsopZIKQrJkNkNFc/X/E3VeimhI"

conn = sqlite3.connect("crowdflow.db")
cursor = conn.cursor()

# Update admin password
cursor.execute("UPDATE users SET hashed_password = ? WHERE email = ?", (correct_hash, "admin@crowdflow.com"))
conn.commit()

# Verify
cursor.execute("SELECT email, hashed_password FROM users WHERE email = ?", ("admin@crowdflow.com",))
row = cursor.fetchone()
print("Updated admin:", row[0] if row else "Not found")
print("Password hash set correctly:", row[1][:20] + "..." if row else "")

conn.close()
