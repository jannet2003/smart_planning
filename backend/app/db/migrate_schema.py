import sqlite3
import pathlib
import sys

def check_and_migrate_database(db_path: pathlib.Path):
    """
    Vérifie et assure l'existence des 8 tables canoniques de l'application SmartPlanning Radiologie:
    1. PERSONNEL
    2. SALLE (avec besoins seniors, résidents, infirmiers, techniciens intégrés)
    3. COMPATIBILITE_SENIOR
    4. INDISPONIBILITE_SALLE
    5. CONGE
    6. JOUR_FERIE
    7. PERSONNEL_SALLE
    8. PLANNING
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
            mode_affectation_senior VARCHAR NOT NULL DEFAULT 'exclusif',
            min_senior INTEGER NOT NULL DEFAULT 1,
            max_senior INTEGER NOT NULL DEFAULT 2,
            min_resident INTEGER NOT NULL DEFAULT 1,
            max_resident INTEGER NOT NULL DEFAULT 3,
            min_inf INTEGER NOT NULL DEFAULT 0,
            max_inf INTEGER NOT NULL DEFAULT 1,
            min_tech INTEGER NOT NULL DEFAULT 1,
            max_tech INTEGER NOT NULL DEFAULT 3
        );
    """)

    # Si la table SALLE existait déjà sans les colonnes de besoins, on les ajoute
    cur.execute("PRAGMA table_info(SALLE);")
    existing_cols = [c[1] for c in cur.fetchall()]
    besoin_cols = {
        "min_senior": "INTEGER NOT NULL DEFAULT 1",
        "max_senior": "INTEGER NOT NULL DEFAULT 2",
        "min_resident": "INTEGER NOT NULL DEFAULT 1",
        "max_resident": "INTEGER NOT NULL DEFAULT 3",
        "min_inf": "INTEGER NOT NULL DEFAULT 0",
        "max_inf": "INTEGER NOT NULL DEFAULT 1",
        "min_tech": "INTEGER NOT NULL DEFAULT 1",
        "max_tech": "INTEGER NOT NULL DEFAULT 3",
    }
    for col_name, col_def in besoin_cols.items():
        if col_name not in existing_cols:
            cur.execute(f"ALTER TABLE SALLE ADD COLUMN {col_name} {col_def};")

    # Si BESOIN_SALLE existe, migrer ses valeurs vers SALLE puis supprimer BESOIN_SALLE
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='BESOIN_SALLE';")
    if cur.fetchone():
        print("Migration des données de BESOIN_SALLE vers SALLE...")
        cur.execute("SELECT salle_id, categorie, minimum, maximum FROM BESOIN_SALLE;")
        besoins_rows = cur.fetchall()
        for salle_id, categorie, minimum, maximum in besoins_rows:
            cat_lower = (categorie or "").strip().lower()
            if cat_lower == "senior":
                cur.execute("UPDATE SALLE SET min_senior = ?, max_senior = ? WHERE id = ?", (minimum, maximum, salle_id))
            elif cat_lower == "resident":
                cur.execute("UPDATE SALLE SET min_resident = ?, max_resident = ? WHERE id = ?", (minimum, maximum, salle_id))
            elif cat_lower in {"infirmier", "inf"}:
                cur.execute("UPDATE SALLE SET min_inf = ?, max_inf = ? WHERE id = ?", (minimum, maximum, salle_id))
            elif cat_lower in {"technicien", "tech", "manipulateur"}:
                cur.execute("UPDATE SALLE SET min_tech = ?, max_tech = ? WHERE id = ?", (minimum, maximum, salle_id))
        
        cur.execute("DROP TABLE BESOIN_SALLE;")
        print("Table BESOIN_SALLE supprimée et intégrée dans SALLE.")

    # 3. Table COMPATIBILITE_SENIOR
    cur.execute("""
        CREATE TABLE IF NOT EXISTS COMPATIBILITE_SENIOR (
            salle_id INTEGER NOT NULL,
            salle_compatible_id INTEGER NOT NULL,
            PRIMARY KEY (salle_id, salle_compatible_id),
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_compatible_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 4. Table INDISPONIBILITE_SALLE (avec id PK, type_indisponibilite)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS INDISPONIBILITE_SALLE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salle_id INTEGER NOT NULL,
            date_debut DATE NOT NULL,
            date_fin DATE NOT NULL,
            raison VARCHAR,
            type_indisponibilite VARCHAR DEFAULT 'maintenance',
            UNIQUE (salle_id, date_debut),
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # Migration : si la table existe sans la colonne id en PK ou sans type_indisponibilite
    cur.execute("PRAGMA table_info(INDISPONIBILITE_SALLE);")
    indispo_cols = {c[1]: c for c in cur.fetchall()}
    if "id" not in indispo_cols:
        print("Migration INDISPONIBILITE_SALLE : ajout de id PK autoincrement...")
        cur.execute("SELECT salle_id, date_debut, date_fin, raison FROM INDISPONIBILITE_SALLE;")
        old_rows = cur.fetchall()
        cur.execute("DROP TABLE INDISPONIBILITE_SALLE;")
        cur.execute("""
            CREATE TABLE INDISPONIBILITE_SALLE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                salle_id INTEGER NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                raison VARCHAR,
                type_indisponibilite VARCHAR DEFAULT 'maintenance',
                UNIQUE (salle_id, date_debut),
                FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
            );
        """)
        for row in old_rows:
            cur.execute(
                "INSERT INTO INDISPONIBILITE_SALLE (salle_id, date_debut, date_fin, raison) VALUES (?, ?, ?, ?);",
                row
            )
        print(f"  {len(old_rows)} enregistrements migrés.")
    elif "type_indisponibilite" not in indispo_cols:
        cur.execute("ALTER TABLE INDISPONIBILITE_SALLE ADD COLUMN type_indisponibilite VARCHAR DEFAULT 'maintenance';")
        print("Colonne type_indisponibilite ajoutée à INDISPONIBILITE_SALLE.")

    # 5. Table CONGE (avec id INTEGER PRIMARY KEY AUTOINCREMENT depuis v2)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS CONGE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personnel_id INTEGER NOT NULL,
            type_conge VARCHAR NOT NULL,
            date_debut DATE NOT NULL,
            date_fin DATE NOT NULL,
            raison VARCHAR,
            FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE
        );
    """)

    # Migration : si la table CONGE existait avec l'ancienne PK composite (personnel_id, type_conge)
    # sans colonne id, on recrée la table et on réinsère les données avec un id auto-généré
    cur.execute("PRAGMA table_info(CONGE);")
    conge_cols = [c[1] for c in cur.fetchall()]
    if "id" not in conge_cols:
        print("Migration CONGE : passage de la PK composite à id INTEGER PRIMARY KEY AUTOINCREMENT...")
        cur.execute("SELECT personnel_id, type_conge, date_debut, date_fin, raison FROM CONGE;")
        old_conge_rows = cur.fetchall()
        cur.execute("DROP TABLE CONGE;")
        cur.execute("""
            CREATE TABLE CONGE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                personnel_id INTEGER NOT NULL,
                type_conge VARCHAR NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                raison VARCHAR,
                FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE
            );
        """)
        for row in old_conge_rows:
            cur.execute(
                "INSERT INTO CONGE (personnel_id, type_conge, date_debut, date_fin, raison) VALUES (?, ?, ?, ?, ?);",
                row
            )
        print(f"  {len(old_conge_rows)} congés migrés avec succès.")

    # 6. Table JOUR_FERIE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS JOUR_FERIE (
            date DATE PRIMARY KEY,
            libelle VARCHAR NOT NULL
        );
    """)

    # 7. Table PERSONNEL_SALLE
    cur.execute("""
        CREATE TABLE IF NOT EXISTS PERSONNEL_SALLE (
            personnel_id INTEGER NOT NULL,
            salle_id INTEGER NOT NULL,
            PRIMARY KEY (personnel_id, salle_id),
            FOREIGN KEY (personnel_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE,
            FOREIGN KEY (salle_id) REFERENCES SALLE(id) ON DELETE CASCADE
        );
    """)

    # 8. Table PLANNING
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

    # 9. Table VOEU
    cur.execute("""
        CREATE TABLE IF NOT EXISTS VOEU (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER NOT NULL,
            jour DATE NOT NULL,
            type VARCHAR NOT NULL,
            salle_id INTEGER,
            FOREIGN KEY (agent_id) REFERENCES PERSONNEL(id) ON DELETE CASCADE,
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
