"""Offline schema export: no listening socket, process launcher or runtime credentials."""
import json
from .app import create_app

if __name__ == "__main__":
    print(json.dumps(create_app("schema-export-placeholder-not-a-secret").openapi(),
                     ensure_ascii=False, sort_keys=True, indent=2))
