import sqlite3
import pathlib
import sys

def migrate_database(db_path: pathlib.Path):
    print(f"Starting migration on {db_path}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute("PRAGMA foreign_keys = OFF;")
    
    # 1. Inspect existing personnel
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='personnel';")
    if cur.fetchone():
        # Get existing columns
        cols_info = cur.execute("PRAGMA table_info(personnel);").fetchall()
        col_names = [c[1] for c in cols_info]
        print("Existing personnel columns:", col_names)
        
        # Read existing rows
        cur.execute("SELECT * FROM personnel;")
        existing_personnel = cur.fetchall()
        
        # Create temp table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS personnel_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                matricule VARCHAR NOT NULL UNIQUE,
                nom VARCHAR NOT NULL,
                categorie VARCHAR NOT NULL,
                statut VARCHAR NOT NULL DEFAULT 'actif'
            );
        """)
        
        # Determine column indexes
        id_idx = col_names.index('id') if 'id' in col_names else 0
        mat_idx = col_names.index('matricule') if 'matricule' in col_names else -1
        nom_idx = col_names.index('nom') if 'nom' in col_names else 1
        role_idx = col_names.index('role') if 'role' in col_names else (col_names.index('categorie') if 'categorie' in col_names else -1)
        statut_idx = col_names.index('statut') if 'statut' in col_names else -1
        
        used_mats = set()
        for row in existing_personnel:
            pid = row[id_idx]
            nom = row[nom_idx] or ""
            role = row[role_idx] if role_idx >= 0 else "TECH"
            raw_statut = row[statut_idx] if statut_idx >= 0 else "actif"
            
            # Normalize statut
            if raw_statut in ("retrait", "en_retrait"):
                statut = "en_retrait"
            elif raw_statut in ("hors_service", "inactif"):
                statut = "hors_service"
            else:
                statut = "actif"
                
            # Matricule
            mat = None
            if mat_idx >= 0 and row[mat_idx]:
                mat = str(row[mat_idx]).strip()
            if not mat or mat in used_mats:
                candidate = f"ID-{pid}"
                idx = 1
                while candidate in used_mats:
                    candidate = f"ID-{pid}_{idx}"
                    idx += 1
                mat = candidate
            used_mats.add(mat)
            
            cur.execute(
                "INSERT INTO personnel_new (id, matricule, nom, categorie, statut) VALUES (?, ?, ?, ?, ?);",
                (pid, mat, nom, role, statut)
            )
        
        cur.execute("DROP TABLE personnel;")
        cur.execute("ALTER TABLE personnel_new RENAME TO personnel;")
        print("Migrated table 'personnel' successfully.")

    # 2. Inspect existing salle
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='salle';")
    if cur.fetchone():
        cols_info = cur.execute("PRAGMA table_info(salle);").fetchall()
        col_names = [c[1] for c in cols_info]
        print("Existing salle columns:", col_names)
        
        cur.execute("SELECT * FROM salle;")
        existing_salles = cur.fetchall()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS salle_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR NOT NULL,
                min_senior INTEGER NOT NULL DEFAULT 1,
                max_senior INTEGER NOT NULL DEFAULT 2,
                min_resident INTEGER NOT NULL DEFAULT 1,
                max_resident INTEGER NOT NULL DEFAULT 3,
                min_inf INTEGER NOT NULL DEFAULT 0,
                max_inf INTEGER NOT NULL DEFAULT 1,
                min_tech INTEGER NOT NULL DEFAULT 1,
                max_tech INTEGER NOT NULL DEFAULT 3,
                senior_mode VARCHAR NOT NULL DEFAULT 'EXCLUSIVE',
                mode_compatibilite VARCHAR NOT NULL DEFAULT 'AUCUNE'
            );
        """)
        
        # Create table indisponibilite_salle early for migration
        cur.execute("""
            CREATE TABLE IF NOT EXISTS indisponibilite_salle (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salle_id INTEGER NOT NULL,
                date_debut VARCHAR NOT NULL,
                date_fin VARCHAR NOT NULL,
                motif VARCHAR,
                FOREIGN KEY (salle_id) REFERENCES salle(id) ON DELETE CASCADE
            );
        """)
        
        for row in existing_salles:
            d = dict(zip(col_names, row))
            sid = d.get('id')
            nom = d.get('nom', '')
            min_sen = d.get('min_senior', 1)
            max_sen = d.get('max_senior', 2)
            min_res = d.get('min_resident', 1)
            max_res = d.get('max_resident', 3)
            min_inf = d.get('min_inf', 0)
            max_inf = d.get('max_inf', 1)
            min_tech = d.get('min_tech', 1)
            max_tech = d.get('max_tech', 3)
            senior_mode = d.get('senior_mode', 'EXCLUSIVE')
            mode_compat = d.get('mode_compatibilite', 'AUCUNE')
            
            # Check if broken data exists to migrate into indisponibilite_salle
            if d.get('is_broken') and d.get('broken_start'):
                cur.execute(
                    "INSERT INTO indisponibilite_salle (salle_id, date_debut, date_fin, motif) VALUES (?, ?, ?, ?);",
                    (sid, d.get('broken_start'), d.get('broken_end') or d.get('broken_start'), d.get('broken_reason') or 'Maintenance')
                )
            
            cur.execute("""
                INSERT INTO salle_new (id, nom, min_senior, max_senior, min_resident, max_resident, min_inf, max_inf, min_tech, max_tech, senior_mode, mode_compatibilite)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (sid, nom, min_sen, max_sen, min_res, max_res, min_inf, max_inf, min_tech, max_tech, senior_mode, mode_compat))
        
        cur.execute("DROP TABLE salle;")
        cur.execute("ALTER TABLE salle_new RENAME TO salle;")
        print("Migrated table 'salle' successfully.")

    # 3. Table personnel_salle
    cur.execute("""
        CREATE TABLE IF NOT EXISTS personnel_salle (
            personnel_id INTEGER NOT NULL,
            salle_id INTEGER NOT NULL,
            PRIMARY KEY (personnel_id, salle_id),
            FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_id) REFERENCES salle(id) ON DELETE CASCADE
        );
    """)

    # 4. Table salle_compatibilite
    cur.execute("""
        CREATE TABLE IF NOT EXISTS salle_compatibilite (
            salle_id INTEGER NOT NULL,
            salle_compatible_id INTEGER NOT NULL,
            PRIMARY KEY (salle_id, salle_compatible_id),
            FOREIGN KEY (salle_id) REFERENCES salle(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_compatible_id) REFERENCES salle(id) ON DELETE CASCADE
        );
    """)

    # 5. Table conge_personnel
    cur.execute("""
        CREATE TABLE IF NOT EXISTS conge_personnel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personnel_id INTEGER NOT NULL,
            type VARCHAR NOT NULL,
            date_debut VARCHAR NOT NULL,
            date_fin VARCHAR NOT NULL,
            raison VARCHAR,
            FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
        );
    """)

    # 6. Table jour_ferie
    cur.execute("""
        CREATE TABLE IF NOT EXISTS jour_ferie (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date VARCHAR NOT NULL UNIQUE,
            libelle VARCHAR NOT NULL
        );
    """)

    # 7. Table planning_semaine
    cur.execute("""
        CREATE TABLE IF NOT EXISTS planning_semaine (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            semaine_code VARCHAR,
            date_validation DATETIME,
            snapshot_personnel JSON NOT NULL,
            snapshot_salles JSON NOT NULL,
            affectations JSON NOT NULL
        );
    """)

    # Check foreign keys
    cur.execute("PRAGMA foreign_keys = ON;")
    fk_errors = cur.execute("PRAGMA foreign_key_check;").fetchall()
    if fk_errors:
        print("FOREIGN KEY WARNINGS:", fk_errors)
        # Clean orphan relations if any
        cur.execute("DELETE FROM personnel_salle WHERE personnel_id NOT IN (SELECT id FROM personnel) OR salle_id NOT IN (SELECT id FROM salle);")
        cur.execute("DELETE FROM salle_compatibilite WHERE salle_id NOT IN (SELECT id FROM salle) OR salle_compatible_id NOT IN (SELECT id FROM salle);")
        cur.execute("DELETE FROM indisponibilite_salle WHERE salle_id NOT IN (SELECT id FROM salle);")
        cur.execute("DELETE FROM conge_personnel WHERE personnel_id NOT IN (SELECT id FROM personnel);")
    
    conn.commit()
    conn.close()
    print("Database migration completed successfully!")

if __name__ == "__main__":
    db_file = pathlib.Path(__file__).resolve().parents[3] / "data" / "planning.db"
    migrate_database(db_file)
