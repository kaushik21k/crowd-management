from auth import get_password_hash

# Get the correct hash for crowdevent@123
correct_hash = get_password_hash("crowdevent@123")
print(correct_hash)
