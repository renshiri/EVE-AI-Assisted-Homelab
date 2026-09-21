#!/usr/bin/env python3
import os
from eve_graph import neo4j_driver

SERVICES_ROOT = os.path.expanduser("~/services")

def index_folder_structure():
    if not neo4j_driver:
        print("[Neo4j] Kein Treiber verfügbar.")
        return

    print("--- Indiziere Ordnerstruktur in Neo4j ---")
    ignored = ["node_modules", ".venv", "venv", "__pycache__", ".git", "build", "dist"]

    query = """
    MERGE (d:Directory {path: $dir_path})
    SET d.name = $dir_name
    WITH d
    UNWIND $files AS f
    MERGE (file:ProjectFile {path: f.path})
    SET file.name = f.name, file.extension = f.ext
    MERGE (d)-[:CONTAINS_FILE]->(file)
    """

    with neo4j_driver.session() as session:
        for root, dirs, files in os.walk(SERVICES_ROOT):
            dirs[:] = [d for d in dirs if d not in ignored]
            
            rel_root = os.path.relpath(root, SERVICES_ROOT)
            file_data = []
            for f in files:
                ext = os.path.splitext(f)[1]
                rel_file_path = os.path.join(rel_root, f)
                file_data.append({"name": f, "path": rel_file_path, "ext": ext})

            if file_data:
                session.run(query, dir_path=rel_root, dir_name=os.path.basename(root) or "services", files=file_data)

    print("✅ Ordnerstruktur erfolgreich im Neo4j-Graphen gespeichert!")

if __name__ == "__main__":
    index_folder_structure()