# api/app/validators.py
from __future__ import annotations

import json
from typing import Dict, List, Tuple, Any, Iterable


ApiAlert = Dict[str, Any]


def _missing_columns(df, required: Iterable[str]) -> List[str]:
    return [c for c in required if c not in df.columns]


def _rownum(ix: int) -> int:
    # CSV row number: header is row 1; first data row is 2
    return int(ix) + 2


def _parse_json(value: Any) -> Tuple[bool, Any, str]:
    if value is None:
        return False, None, "empty"
    if isinstance(value, (dict, list)):
        return True, value, ""
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return False, None, "empty"
        try:
            return True, json.loads(text), ""
        except Exception as e:
            return False, None, f"invalid_json: {e}"
    return False, None, f"unsupported_type: {type(value).__name__}"


def _validate_fields_json(arr: Any) -> Tuple[List[ApiAlert], List[ApiAlert], List[str]]:
    errors: List[ApiAlert] = []
    warnings: List[ApiAlert] = []
    names: List[str] = []

    if not isinstance(arr, list):
        errors.append({"code": "fields_not_array", "detail": "fields_json must be a JSON array"})
        return errors, warnings, names

    seen = set()
    for i, item in enumerate(arr):
        if not isinstance(item, dict):
            errors.append({"code": "field_not_object", "detail": f"fields_json[{i}] is not an object"})
            continue
        fname = item.get("field_name")
        if not isinstance(fname, str) or not fname.strip():
            errors.append({"code": "missing_field_name", "detail": f"fields_json[{i}].field_name is required"})
            continue

        if fname in seen:
            warnings.append({"code": "duplicate_field", "detail": f"duplicate field_name '{fname}'"})
        else:
            seen.add(fname)
            names.append(fname)

        if "length" in item and not _is_numberish(item["length"]):
            warnings.append({"code": "length_not_numeric", "detail": f"{fname}: length is not numeric"})
        if "data_type" in item and not _is_stringish(item["data_type"]):
            warnings.append({"code": "datatype_not_string", "detail": f"{fname}: data_type should be string"})
    return errors, warnings, names


def _is_numberish(v: Any) -> bool:
    if v is None:
        return True
    try:
        float(v)
        return True
    except Exception:
        return False


def _is_stringish(v: Any) -> bool:
    return v is None or isinstance(v, str)


def _validate_primary_keys_json(value: Any, field_names: List[str]) -> Tuple[List[ApiAlert], List[ApiAlert]]:
    errors: List[ApiAlert] = []
    warnings: List[ApiAlert] = []

    if value is None:
        return errors, warnings

    if not isinstance(value, list):
        errors.append({"code": "pk_not_array", "detail": "primary_keys_json must be a JSON array of strings"})
        return errors, warnings

    for i, k in enumerate(value):
        if not isinstance(k, str) or not k.strip():
            errors.append({"code": "pk_not_string", "detail": f"primary_keys_json[{i}] is not a non-empty string"})
        elif k not in field_names:
            warnings.append({"code": "pk_not_in_fields", "detail": f"primary key '{k}' is not present in fields_json"})
    return errors, warnings


def validate_ecc_df(df) -> Tuple[List[ApiAlert], List[ApiAlert]]:
    errors: List[ApiAlert] = []
    warnings: List[ApiAlert] = []

    required = [
        "extractor_name",
        "extractor_text",
        "application_component",
        "extractor_type",
        "fields_json",
    ]
    missing = _missing_columns(df, required)
    if missing:
        errors.append({
            "file": "ecc_extractors.csv",
            "code": "missing_required_column",
            "detail": f"Missing columns: {', '.join(missing)}",
        })
        return errors, warnings

    for ix, row in df.iterrows():
        rowno = _rownum(ix)

        ok, parsed_fields, msg = _parse_json(row.get("fields_json"))
        if not ok:
            errors.append({
                "file": "ecc_extractors.csv",
                "row": rowno,
                "code": "invalid_json",
                "detail": f"fields_json: {msg}",
            })
            continue

        fe, fw, field_names = _validate_fields_json(parsed_fields)
        for e in fe:
            e.update({"file": "ecc_extractors.csv", "row": rowno})
        for w in fw:
            w.update({"file": "ecc_extractors.csv", "row": rowno})
        errors.extend(fe)
        warnings.extend(fw)

        if "primary_keys_json" in df.columns:
            ok, parsed_pk, msg = _parse_json(row.get("primary_keys_json"))
            if ok:
                pe, pw = _validate_primary_keys_json(parsed_pk, field_names)
                for e in pe:
                    e.update({"file": "ecc_extractors.csv", "row": rowno})
                for w in pw:
                    w.update({"file": "ecc_extractors.csv", "row": rowno})
                errors.extend(pe)
                warnings.extend(pw)
            elif row.get("primary_keys_json") not in (None, "", "null"):
                errors.append({
                    "file": "ecc_extractors.csv",
                    "row": rowno,
                    "code": "invalid_json",
                    "detail": f"primary_keys_json: {msg}",
                })

    return errors, warnings


def validate_s4_df(df) -> Tuple[List[ApiAlert], List[ApiAlert]]:
    errors: List[ApiAlert] = []
    warnings: List[ApiAlert] = []

    required = [
        "cds_view_name",
        "cds_view_text",
        "application_component",
        "fields_json",
    ]
    missing = _missing_columns(df, required)
    if missing:
        errors.append({
            "file": "s4_cds.csv",
            "code": "missing_required_column",
            "detail": f"Missing columns: {', '.join(missing)}",
        })
        return errors, warnings

    for ix, row in df.iterrows():
        rowno = _rownum(ix)

        ok, parsed_fields, msg = _parse_json(row.get("fields_json"))
        if not ok:
            errors.append({
                "file": "s4_cds.csv",
                "row": rowno,
                "code": "invalid_json",
                "detail": f"fields_json: {msg}",
            })
            continue

        fe, fw, field_names = _validate_fields_json(parsed_fields)
        for e in fe:
            e.update({"file": "s4_cds.csv", "row": rowno})
        for w in fw:
            w.update({"file": "s4_cds.csv", "row": rowno})
        errors.extend(fe)
        warnings.extend(fw)

        if "primary_keys_json" in df.columns:
            ok, parsed_pk, msg = _parse_json(row.get("primary_keys_json"))
            if ok:
                pe, pw = _validate_primary_keys_json(parsed_pk, field_names)
                for e in pe:
                    e.update({"file": "s4_cds.csv", "row": rowno})
                for w in pw:
                    w.update({"file": "s4_cds.csv", "row": rowno})
                errors.extend(pe)
                warnings.extend(pw)
            elif row.get("primary_keys_json") not in (None, "", "null"):
                errors.append({
                    "file": "s4_cds.csv",
                    "row": rowno,
                    "code": "invalid_json",
                    "detail": f"primary_keys_json: {msg}",
                })

        if "annotations_json" in df.columns and row.get("annotations_json"):
            ok, _, msg = _parse_json(row.get("annotations_json"))
            if not ok:
                warnings.append({
                    "file": "s4_cds.csv",
                    "row": rowno,
                    "code": "invalid_annotations_json",
                    "detail": msg,
                })

    return errors, warnings
