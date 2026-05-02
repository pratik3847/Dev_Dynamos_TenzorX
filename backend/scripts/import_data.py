import os
import csv
import sys
import psycopg2
from psycopg2.extras import execute_batch

# Load database URL
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from backend.database import SUPABASE_DB_URL

def clean_rate(val):
    if not val or val.strip() == '':
        return None
    try:
        cleaned = val.replace(',', '').replace('₹', '').strip()
        return float(cleaned)
    except:
        return None

def init_db():
    print(f"Connecting to database to initialize tables...")
    conn = psycopg2.connect(SUPABASE_DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("Enabling PostGIS extension...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    cur.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")

    print("Dropping existing tables if any...")
    cur.execute("DROP TABLE IF EXISTS public.cghs_procedures CASCADE;")
    cur.execute("DROP TABLE IF EXISTS public.hospitals CASCADE;")

    print("Creating public.cghs_procedures...")
    cur.execute("""
        CREATE TABLE public.cghs_procedures (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            cghs_code VARCHAR(50),
            procedure_name TEXT,
            rate_non_nabh NUMERIC,
            rate_nabh NUMERIC,
            rate_super_speciality NUMERIC,
            specialty_classification VARCHAR(255)
        );
    """)

    print("Creating public.hospitals...")
    cur.execute("""
        CREATE TABLE public.hospitals (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sr_no VARCHAR(50),
            hospital_name TEXT,
            hospital_category VARCHAR(100),
            care_type VARCHAR(100),
            discipline VARCHAR(100),
            address TEXT,
            state VARCHAR(100),
            district VARCHAR(100),
            subdistrict VARCHAR(100),
            town VARCHAR(100),
            pincode VARCHAR(50),
            telephone VARCHAR(100),
            mobile VARCHAR(100),
            emergency_num VARCHAR(100),
            ambulance_phone VARCHAR(100),
            bloodbank_phone VARCHAR(100),
            email_primary VARCHAR(255),
            email_secondary VARCHAR(255),
            website TEXT,
            specialties TEXT,
            facilities TEXT,
            accreditation VARCHAR(255),
            registration_number VARCHAR(100),
            total_beds INTEGER,
            private_wards INTEGER,
            num_doctors INTEGER,
            established_year VARCHAR(50),
            emergency_services VARCHAR(100),
            tariff_range VARCHAR(100),
            empanelment TEXT,
            lat NUMERIC,
            lng NUMERIC,
            location GEOGRAPHY(Point, 4326),
            tier VARCHAR(50),
            nabh_accredited BOOLEAN,
            state_id VARCHAR(50),
            district_id VARCHAR(50)
        );
    """)

    print("Creating PostGIS geography index...")
    cur.execute("CREATE INDEX IF NOT EXISTS hospitals_location_idx ON public.hospitals USING GIST (location);")

    cur.close()
    conn.close()

def import_procedures():
    conn = psycopg2.connect(SUPABASE_DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/cleaned_cghs_rates_full.csv'))
    print(f"Importing procedures from {csv_path}...")
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            data.append((
                row.get('CGHS Code', ''),
                row.get('CGHS TREATMENT PROCEDURE/INVESTIGATION LIST', ''),
                clean_rate(row.get('Non-NABH', '')),
                clean_rate(row.get('NABH', '')),
                clean_rate(row.get('Super Speciality', '')),
                row.get('Speciality Classification', '')
            ))
            
        sql = """
            INSERT INTO public.cghs_procedures (
                cghs_code, procedure_name, rate_non_nabh, rate_nabh, rate_super_speciality, specialty_classification
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """
        execute_batch(cur, sql, data)
        print(f"Inserted {len(data)} procedures.")

    cur.close()
    conn.close()

def import_hospitals():
    conn = psycopg2.connect(SUPABASE_DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/final_hospital_directory.csv'))
    print(f"Importing hospitals from {csv_path}...")
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        data = []
        for row in reader:
            lat = None
            lng = None
            coords = row.get('Location_Coordinates', '')
            if coords and ',' in coords:
                parts = coords.split(',')
                try:
                    lat = float(parts[0].strip())
                    lng = float(parts[1].strip())
                except:
                    pass
            
            try:
                beds = int(row.get('Total_Num_Beds', 0))
                beds = min(beds, 100000)
            except:
                beds = 0
                
            try:
                docs = int(row.get('Number_Doctor', 0))
                docs = min(docs, 100000)
            except:
                docs = 0

            tier = 'budget'
            if beds > 500:
                tier = 'premium'
            elif beds > 100:
                tier = 'mid_tier'
                
            accreditation = row.get('Accreditation', '')
            nabh = 'NABH' in (accreditation or '').upper()
            
            pw = row.get('Number_Private_Wards', '')
            pw = int(pw) if str(pw).isdigit() else 0
            pw = min(pw, 100000)

            data.append((
                str(row.get('Sr_No', ''))[:50],
                str(row.get('Hospital_Name', '')),
                str(row.get('Hospital_Category', ''))[:100],
                str(row.get('Hospital_Care_Type', ''))[:100],
                str(row.get('Discipline_Systems_of_Medicine', ''))[:100],
                str(row.get('Address_Original_First_Line', '')),
                str(row.get('State', ''))[:100],
                str(row.get('District', ''))[:100],
                str(row.get('Subdistrict', ''))[:100],
                str(row.get('Town', ''))[:100],
                str(row.get('Pincode', ''))[:50],
                str(row.get('Telephone', ''))[:100],
                str(row.get('Mobile_Number', ''))[:100],
                str(row.get('Emergency_Num', ''))[:100],
                str(row.get('Ambulance_Phone_No', ''))[:100],
                str(row.get('Bloodbank_Phone_No', ''))[:100],
                str(row.get('Hospital_Primary_Email_Id', ''))[:255],
                str(row.get('Hospital_Secondary_Email_Id', ''))[:255],
                str(row.get('Website', '')),
                str(row.get('Specialties', '')),
                str(row.get('Facilities', '')),
                str(accreditation)[:255],
                str(row.get('Hospital_Regis_Number', ''))[:100],
                beds,
                pw,
                docs,
                str(row.get('Establised_Year', ''))[:50],
                str(row.get('Emergency_Services', ''))[:100],
                str(row.get('Tariff_Range', ''))[:100],
                str(row.get('Empanelment_or_Collaboration_with', '')),
                lat,
                lng,
                tier,
                nabh,
                str(row.get('State_ID', ''))[:50],
                str(row.get('District_ID', ''))[:50],
                # 4 args for the case statement in SQL
                lng, lat, lng, lat
            ))
            
        sql = """
            INSERT INTO public.hospitals (
                sr_no, hospital_name, hospital_category, care_type, discipline, address,
                state, district, subdistrict, town, pincode, telephone, mobile, emergency_num,
                ambulance_phone, bloodbank_phone, email_primary, email_secondary, website,
                specialties, facilities, accreditation, registration_number, total_beds,
                private_wards, num_doctors, established_year, emergency_services, tariff_range,
                empanelment, lat, lng, tier, nabh_accredited, state_id, district_id, location
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                CASE WHEN %s IS NOT NULL AND %s IS NOT NULL THEN ST_SetSRID(ST_MakePoint(%s, %s), 4326) ELSE NULL END
            )
        """
        # Uploading in chunks to avoid blowing up memory/query limits
        chunk_size = 1000
        total_inserted = 0
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            execute_batch(cur, sql, chunk)
            total_inserted += len(chunk)
            print(f"Batch inserted {total_inserted}/{len(data)} hospitals...")

        print(f"Successfully inserted {total_inserted} hospitals.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    init_db()
    import_procedures()
    import_hospitals()
    print("Database seeding completed.")
