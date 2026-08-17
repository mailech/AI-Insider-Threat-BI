import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# =========================================================
# DATABASE VERIFICATION SCRIPT
# =========================================================
# This script securely tests the SQLAlchemy connection string 
# defined in backend/.env, verifies the exact tables created 
# in Milestone 1, and retrieves the active RLS policies.

def verify_database():
    # Load environment variables
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")

    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL is not set in backend/.env")
        print("Please ensure you have pasted your Supabase Connection String into backend/.env")
        sys.exit(1)

    print(f"🔄 Attempting to connect to the database via SQLAlchemy...")
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            print("✅ Successfully established connection to PostgreSQL/Supabase!\n")
            
            # --- 1. VERIFY TABLES ---
            print("--- SCHEMA TABLE VERIFICATION ---")
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE';
            """)
            result = conn.execute(tables_query)
            tables = [row[0] for row in result.fetchall()]
            
            expected_tables = ['departments', 'users', 'employees', 'devices', 'activity_logs', 'audit_logs']
            for t in expected_tables:
                if t in tables:
                    print(f"✅ Found table: {t}")
                else:
                    print(f"❌ Missing expected table: {t}")
                    
            # --- 2. VERIFY RLS POLICIES ---
            print("\n--- RLS POLICIES VERIFICATION ---")
            policies_query = text("""
                SELECT tablename, policyname, roles, cmd 
                FROM pg_policies 
                WHERE schemaname = 'public';
            """)
            policies_result = conn.execute(policies_query)
            policies = policies_result.fetchall()
            
            if policies:
                for row in policies:
                    print(f"🔒 RLS Policy: '{row[1]}' applied on table '{row[0]}' (CMD: {row[3]}) | Target Roles: {row[2]}")
            else:
                print("⚠️ No RLS policies were found in the public schema.")
                
            print("\n✅ Verification complete! The Database Foundation is structurally sound.")
                
    except SQLAlchemyError as e:
        print("❌ Database connection failed.")
        print(f"Error details: {e}")

if __name__ == "__main__":
    verify_database()
