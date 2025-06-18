from sqlalchemy import create_engine, text
import os

# Use the same URL as in alembic.ini
DATABASE_URL = "mysql+pymysql://root:Xy147369@localhost:3306/reddit_fetcher"
# Or, if you have it as an environment variable that your app uses:
# DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL is not set.")
else:
    print(f"Attempting to connect to: {DATABASE_URL}")
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            # Try a very simple query
            result = connection.execute(text("SELECT 1"))
            for row in result:
                print("Connection successful, SELECT 1 returned:", row[0])
        print("Database connection test successful!")
    except Exception as e:
        print(f"Database connection test failed: {e}")
        print("Make sure your MySQL server is running, the database 'reddit_fetcher' exists,")
        print("and the credentials (root/Xy147369) are correct and have permissions.")
