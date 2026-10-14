"""Budget for opt-in report runs, measured exactly like Electron's decoded JSON."""
import json

SESSION_CONTEXT_THRESHOLD = 131072
REPORT_RUN_RESERVE = 98304
LOCAL_RESPONSE_LIMIT = 262144
REPORT_RESULT_BYTES = 24 * 1024


def wire_json(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def utf16_units(text):
    return len(text.encode('utf-16-le')) // 2


def json_units(value):
    return utf16_units(wire_json(value))


class SessionContextCapacity(Exception):
    pass


def require_capacity(snapshot):
    if json_units(snapshot) > SESSION_CONTEXT_THRESHOLD:
        raise SessionContextCapacity('SESSION_CONTEXT_CAPACITY：请显式新建会话；已保存历史保留。')
