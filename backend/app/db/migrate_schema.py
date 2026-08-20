import sqlite3
import pathlib
import sys

def check_and_migrate_database(db_path: pathlib.Path):
    """
    Vérifie et assure l'existence des 9 tables canoniques de l'application SmartPlanning Radiologie:
    1. PERSONNEL
    2. SALLE
    3. BESOIN_SALLE
    4. COMPATIBILITE_SENIOR
    5. INDISPONIBILITE_SALLE
    6. CONGE
    7. JOUR_FERIE
    8. PERSONNEL_SALLE
    9. PLANNING
    """
    print(f"Vérification de la base de données : {db_path}")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Table PERSONNEL
    cur.execute("""
        CREATE TABLE IF NOT EXISTS PERSONNEL (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            matricule VARCHAR NOT NULL UNIQUE,
            nom_prenom VARCHAR NOT NULL,
            categorie VARCHAR NOT NULL,
            status VARCHAR NOT NULL DEFAULT 'actif'
        );
    """)

    # 2. Table SALLE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS SALLE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom VARCHAR NOT NULL UNIQUE,
            mode_affectation_senior VARCHAR NOT NULL DEFAULT 'exclusif'
        );
    """)

    # 3. Table BESOIN_SALLE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS BESOIN_SALLE (
            salle_id INTEGER NOT NULL,
            categorie VARCHAR NOT NULL,
            minimum INTEGER NOT NULL DEFAULT 0,
            maximum INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (salle_id, categorie),
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 4. Table COMPATIBILITE_SENIOR
    cur.execute("""
        CREATE TABLE IF NOT EXISTS COMPATIBILITE_SENIOR (
            salle_id INTEGER NOT NULL,
            salle_compatible_id INTEGER NOT NULL,
            PRIMARY KEY (salle_id, salle_compatible_id),
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_compatible_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 5. Table INDISPONIBILITE_SALLE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS INDISPONIBILITE_SALLE (
            salle_id INTEGER NOT NULL,
            date_debut DATE NOT NULL,
            date_fin DATE NOT NULL,
            raison VARCHAR,
            PRIMARY KEY (salle_id, date_debut),
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 6. Table CONGE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CONGE (
            personnel_id INTEGER NOT NULL,
            type_conge VARCHAR NOT NULL,
            date_debut DATE NOT NULL,
            date_fin DATE NOT NULL,
            raison VARCHAR,
            PRIMARY KEY (personnel_id, type_conge),
            FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE
        );
    """)

    # 7. Table JOUR_FERIE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS JOUR_FERIE (
            date DATE PRIMARY KEY,
            libelle VARCHAR NOT NULL
        );
    """)

    # 8. Table PERSONNEL_SALLE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS PERSONNEL_SALLE (
            personnel_id INTEGER NOT NULL,
            salle_id INTEGER NOT NULL,
            PRIMARY KEY (personnel_id, salle_id),
            FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 9. Table PLANNING
    cur.execute("""
        CREATE TABLE IF NOT EXISTS PLANNING (
            personnel_id INTEGER NOT NULL,
            salle_id INTEGER NOT NULL,
            date DATE NOT NULL,
            periode VARCHAR NOT NULL,
            PRIMARY KEY (personnel_id, date, periode),
            FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # Verification et nettoyage des orphelins si presents
    fk_errors = cur.execute("PRAGMA foreign_key_check;").fetchall()
    if fk_errors:
        print("Nettoyage des orphelins de cles etrangeres...")
        cur.execute("DELETE FROM PERSONNEL_SALLE WHERE personnel_id NOT IN (SELECT id FROM PERSONNEL) OR salle_id NOT IN (SELECT id FROM SALLE);")
        cur.execute("DELETE FROM COMPATIBILITE_SENIOR WHERE salle_id NOT IN (SELECT id FROM SALLE) OR salle_compatible_id NOT IN (SELECT id FROM SALLE);")
        cur.execute("DELETE FROM INDISPONIBILITE_SALLE WHERE salle_id NOT IN (SELECT id FROM SALLE);")
        cur.execute("DELETE FROM CONGE WHERE personnel_id NOT IN (SELECT id FROM PERSONNEL);")
        cur.execute("DELETE FROM BESOIN_SALLE WHERE salle_id NOT IN (SELECT id FROM SALLE);")
        cur.execute("DELETE FROM PLANNING WHERE personnel_id NOT IN (SELECT id FROM PERSONNEL) OR salle_id NOT IN (SELECT id FROM SALLE);")
        conn.commit()

    print("Integrite relationnelle validee : 0 orphelins.")

    # Statistiques
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [t[0] for t in cur.fetchall() if not t[0].startswith('sqlite_')]
    print(f"\nTables operationnelles ({len(tables)}) :")
    for t in tables:
        count = cur.execute(f"SELECT COUNT(*) FROM [{t}];").fetchone()[0]
        print(f"  - {t}: {count} enregistrements")

    conn.commit()
    conn.close()
    print("\nVerification et migration du schema terminees avec succes.")


if __name__ == "__main__":
    db_file = pathlib.Path(__file__).resolve().parents[3] / "data" / "planning.db"
    check_and_migrate_database(db_file)
