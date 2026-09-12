from app.mongodb import check_mongodb

try:
    check_mongodb()
    print("MongoDB connected successfully!")

except Exception as e:
    print("MongoDB connection failed!")
    print(e)