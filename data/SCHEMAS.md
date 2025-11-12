# CSV Schemas (A5)

We keep it small; enough to demo matching in A6/A7.

## 1) ecc_extractors.csv

Each row = one ECC/BW extractor.

| Column                | Type       | Required | Example                    | Notes                         |
| --------------------- | ---------- | -------- | -------------------------- | ----------------------------- |
| extractor_name        | string     | yes      | 2LIS_11_VAITM              | Technical name.               |
| extractor_text        | string     | yes      | Sales Document: Item Data  | Short description.            |
| application_component | string     | no       | SD-BF                      | SAP app component.            |
| extractor_type        | string     | no       | LIS                        | LIS/FI/Generic/etc.           |
| delta_supported       | boolean/YN | no       | Y                          | Whether delta exists.         |
| delta_mechanism       | string     | no       | Queue                      | Queue/After-Image/etc.        |
| notes                 | string     | no       | includes sales qty & matnr | Free text.                    |
| fields_json           | JSON array | yes      | see below                  | **Array of field objects**.   |
| primary_keys_json     | JSON array | yes      | ["VBELN","POSNR"]          | **Array of key field names**. |

**`fields_json` object example**

```json
[
  {
    "field_name": "VBELN",
    "description": "Sales Document",
    "data_type": "CHAR",
    "length": 10,
    "is_key": true,
    "unit": null
  }
]
```
