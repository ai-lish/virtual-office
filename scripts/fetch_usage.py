"""Import shim for scripts/fetch-usage.py.

The cron entry point keeps its hyphenated filename, while tests can import
``scripts.fetch_usage`` as a normal Python module.
"""
import importlib.util
from pathlib import Path

_SCRIPT = Path(__file__).with_name("fetch-usage.py")
_SPEC = importlib.util.spec_from_file_location("_fetch_usage_cli", _SCRIPT)
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)

for _name in dir(_MODULE):
    if not _name.startswith("__"):
        globals()[_name] = getattr(_MODULE, _name)
