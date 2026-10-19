# Import validation report

Generated 2026-10-13T19:21:23.964Z from database `kidsai` by `npm run report`. Every number below is the literal result of the SQL shown.

## 1. Canonical milestones

```sql
SELECT count(*) AS milestones FROM milestones;
```

| milestones |
| --- |
| 55 |

## 2. Milestones per age group

```sql
SELECT ag.code, ag.label_he, count(m.id) AS milestones FROM age_groups ag LEFT JOIN milestones m ON m.age_group_id = ag.id GROUP BY ag.code, ag.label_he, ag.display_order ORDER BY ag.display_order;
```

| code | label_he | milestones |
| --- | --- | --- |
| 6w-3m | 6 שבועות עד 3 חודשים | 4 |
| 3m-6m | 3 עד 6 חודשים | 7 |
| 6m-9m | 6 עד 9 חודשים | 4 |
| 9m-12m | 9 עד 12 חודשים | 10 |
| 12m-18m | 12 עד 18 חודשים | 7 |
| 18m-24m | 18 עד 24 חודשים | 9 |
| 24m-36m | 24 עד 36 חודשים | 9 |
| 36m-48m | 36 עד 48 חודשים | 5 |

## 3. Sub-milestones (Excel video segments) and handbook exercises

```sql
SELECT activity_type, count(*) FROM activities GROUP BY activity_type ORDER BY 1;
```

| activity_type | count |
| --- | --- |
| video_segment | 539 |
| handbook_exercise | 517 |

## 4. Hebrew content records (current source versions)

```sql
SELECT 'milestone_translations (pdf)' AS kind, count(*) FROM milestone_translations WHERE language='he' AND source_origin='pdf' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'activity_translations (pdf)', count(*) FROM activity_translations WHERE language='he' AND source_origin='pdf' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'activity_translations (excel)', count(*) FROM activity_translations WHERE language='he' AND source_origin='excel' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'knowledge_chunks', count(*) FROM knowledge_chunks WHERE language='he' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'source_references', count(*) FROM source_references WHERE language='he' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL);
```

| kind | count |
| --- | --- |
| milestone_translations (pdf) | 55 |
| activity_translations (pdf) | 511 |
| activity_translations (excel) | 486 |
| knowledge_chunks | 1107 |
| source_references | 566 |

## 5. Arabic content records (current source versions)

```sql
SELECT 'milestone_translations (pdf)' AS kind, count(*) FROM milestone_translations WHERE language='ar' AND source_origin='pdf' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'activity_translations (pdf)', count(*) FROM activity_translations WHERE language='ar' AND source_origin='pdf' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'activity_translations (excel)', count(*) FROM activity_translations WHERE language='ar' AND source_origin='excel' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'knowledge_chunks', count(*) FROM knowledge_chunks WHERE language='ar' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL)
UNION ALL SELECT 'source_references', count(*) FROM source_references WHERE language='ar' AND source_version_id IN (SELECT current_version_id FROM source_documents WHERE current_version_id IS NOT NULL);
```

| kind | count |
| --- | --- |
| milestone_translations (pdf) | 55 |
| activity_translations (pdf) | 510 |
| activity_translations (excel) | 486 |
| knowledge_chunks | 1106 |
| source_references | 565 |

## 6. Instructional videos by language

```sql
SELECT language, count(*) AS videos FROM videos GROUP BY language ORDER BY 1;
```

| language | videos |
| --- | --- |
| he | 1058 |
| ar | 484 |

## 7. Video availability (YouTube oEmbed check)

```sql
SELECT availability_status, count(*), max(last_checked_at) AS last_checked FROM videos GROUP BY 1;
```

| availability_status | count | last_checked |
| --- | --- | --- |
| unavailable | 2 | 2026-10-13T16:51:36 |
| available | 1540 | 2026-10-13T16:51:43 |

## 8. Active video mappings by language and confidence

```sql
SELECT language, confidence_status, count(*) FROM activity_video_mappings WHERE is_active GROUP BY 1,2 ORDER BY 1,2;
```

| language | confidence_status | count |
| --- | --- | --- |
| he | verified | 14 |
| he | source_asserted | 920 |
| he | needs_review | 73 |
| he | conflict | 54 |
| ar | verified | 481 |
| ar | needs_review | 4 |
| ar | conflict | 1 |

## 9. Mapping traceability (must be 0)

```sql
SELECT count(*) AS mappings_without_source_row FROM activity_video_mappings WHERE source_sheet IS NULL OR source_row_number IS NULL OR raw_sub_milestone_code IS NULL;
```

| mappings_without_source_row |
| --- |
| 0 |

## 10. Mappings by relationship type

```sql
SELECT mapping_type, count(*) FROM activity_video_mappings GROUP BY 1 ORDER BY 2 DESC;
```

| mapping_type | count |
| --- | --- |
| exact_activity | 1259 |
| milestone_overview | 152 |
| parent_guidance | 136 |

## 11. Milestone 1.1 — sub-milestone → video (with Excel source row)

```sql
SELECT a.activity_code, v.provider_video_id, v.canonical_url, m.language, m.confidence_status, m.source_sheet, m.source_row_number, m.raw_correlation_text
FROM activity_video_mappings m JOIN activities a ON a.id = m.activity_id JOIN videos v ON v.id = m.video_id JOIN milestones ms ON ms.id = m.milestone_id
WHERE ms.milestone_code = '1.1' ORDER BY m.source_row_number;
```

| activity_code | provider_video_id | canonical_url | language | confidence_status | source_sheet | source_row_number | raw_correlation_text |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1.1 | jMs2-ktt5cw | https://youtu.be/jMs2-ktt5cw | he | source_asserted | סדרה 1 | 2 | ∅ |
| 1.1.1 | LqyXxUs9tZk | https://youtu.be/LqyXxUs9tZk | he | source_asserted | סדרה 1 | 2 | ∅ |
| 1.1.1 | pn-JcrmEDA0 | https://youtu.be/pn-JcrmEDA0 | ar | verified | מיפוי | 2 | מלאה: 1.1 תת-סעיף 1 |
| 1.1.2 | 36Dya9njr7g | https://youtu.be/36Dya9njr7g | he | verified | סדרה 1 | 3 | ∅ |
| 1.1.2 | LG-AImdjzSw | https://youtu.be/LG-AImdjzSw | ar | verified | מיפוי | 3 | מלאה: 1.1 תת-סעיף 2 |
| 1.1.2 | fXgVavLxp9w | https://youtu.be/fXgVavLxp9w | he | source_asserted | סדרה 1 | 3 | ∅ |
| 1.1.3 | 5R2Rd1zV7mY | https://youtu.be/5R2Rd1zV7mY | he | source_asserted | סדרה 1 | 4 | ∅ |
| 1.1.3 | e4RsJQ4yJMo | https://youtu.be/e4RsJQ4yJMo | ar | verified | מיפוי | 4 | מלאה: 1.1 תת-סעיף 3 |
| 1.1.3 | j312B6F7PUI | https://youtu.be/j312B6F7PUI | he | source_asserted | סדרה 1 | 4 | ∅ |
| 1.1.4 | X78FUyBJ_c8 | https://youtu.be/X78FUyBJ_c8 | he | verified | סדרה 1 | 5 | ∅ |
| 1.1.4 | 4ToTo_4V1Sc | https://youtu.be/4ToTo_4V1Sc | he | source_asserted | סדרה 1 | 5 | ∅ |
| 1.1.4 | dIzoimC-730 | https://youtu.be/dIzoimC-730 | ar | verified | מיפוי | 5 | מלאה: 1.1 תת-סעיף 4 |
| 1.1.5 | 1xsVhpIbnZI | https://youtu.be/1xsVhpIbnZI | ar | verified | מיפוי | 6 | מלאה: 1.1 תת-סעיף 5 |
| 1.1.5 | KUKBgGEgtJs | https://youtu.be/KUKBgGEgtJs | he | source_asserted | סדרה 1 | 6 | ∅ |
| 1.1.5 | M25gpymVWSU | https://youtu.be/M25gpymVWSU | he | source_asserted | סדרה 1 | 6 | ∅ |
| 1.1.6 | 9Dct0YJ8Z84 | https://youtu.be/9Dct0YJ8Z84 | ar | verified | מיפוי | 7 | מלאה: 1.1 תת-סעיף 6 |
| 1.1.6 | QSrSmd6Mask | https://youtu.be/QSrSmd6Mask | he | source_asserted | סדרה 1 | 7 | ∅ |
| 1.1.6 | 2sZANgFjty8 | https://youtu.be/2sZANgFjty8 | he | source_asserted | סדרה 1 | 7 | ∅ |

## 12. Milestones without any video mapping

```sql
SELECT m.milestone_code FROM milestones m WHERE NOT EXISTS (SELECT 1 FROM activity_video_mappings x WHERE x.milestone_id = m.id AND x.is_active) ORDER BY m.display_order;
```

_(no rows)_

## 13. Sub-milestones listed in the workbook without a video

```sql
SELECT count(*) AS missing_video_mappings FROM import_issues WHERE code = 'missing_video_mapping' AND NOT is_resolved AND import_job_id = (SELECT id FROM import_jobs WHERE job_type='video_workbook' AND status='published' ORDER BY finished_at DESC LIMIT 1);
```

| missing_video_mappings |
| --- |
| 0 |

## 14. Mappings flagged for review

```sql
SELECT a.activity_code, v.provider_video_id, m.confidence_status, m.validation_notes::text AS notes
FROM activity_video_mappings m JOIN activities a ON a.id = m.activity_id JOIN videos v ON v.id = m.video_id
WHERE m.confidence_status <> 'verified' ORDER BY a.activity_code;
```

| activity_code | provider_video_id | confidence_status | notes |
| --- | --- | --- | --- |
| 1.1.1 | LqyXxUs9tZk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, {" |
| 1.1.1 | jMs2-ktt5cw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, { |
| 1.1.2 | fXgVavLxp9w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, {" |
| 1.1.3 | 5R2Rd1zV7mY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, {" |
| 1.1.3 | j312B6F7PUI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, { |
| 1.1.4 | 4ToTo_4V1Sc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, { |
| 1.1.5 | KUKBgGEgtJs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, { |
| 1.1.5 | M25gpymVWSU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, {" |
| 1.1.6 | QSrSmd6Mask | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, { |
| 1.1.6 | 2sZANgFjty8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.1", "result": "match"}, {" |
| 1.2.1 | DE0VdL6LJHA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.1 | jyjJt-BZdEY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.3 | 4cuG6g06EIM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.4 | 3ojLFGADw9g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.4 | Rg5uTXQw0P4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.5 | _AvVpFdpiyw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.5 | HSThi92spSY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.6 | boLZyPaM21k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.7 | -Eq59s5MrmU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.8 | 6D8a_-9RAgk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.8 | O7_EdyjTZTQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.2.9 | ZPzLsKw5X0k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, { |
| 1.2.9 | ocpDUuNVOc8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.2", "result": "match"}, {" |
| 1.3.1 | ZbldPhqRl94 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.1 | nz7mK-qO_5s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.2 | iK-kLG_tK4U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.3 | fJ0MCuXm884 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.3 | YzRqf3RjVXo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.4 | 6oDZUmAQGYQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.4 | cBgVoKPd22I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.5 | DD0oFlwnou4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.5 | p-XYgkTt8_Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.6 | DJJ2orMYvq4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.6 | vrT9aHhibFQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.7 | AtUzejoyOSM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.8 | qx8-cBz2G6I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.3.8 | -7oB0LxyHcU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.9 | gYZvVi3xWw8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, { |
| 1.3.9 | eC2KSSwnXio | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.3", "result": "match"}, {" |
| 1.4.1 | 3QL2Q3tKNQs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.1 | On8PCGaPo1Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.10 | uURoNZPikR8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.10 | RExnpvLZFls | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.2 | B7i02_VeGqw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.3 | mBPesktTEc8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.3 | vdX5G1FxKI4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.4 | OC_TQbdAW7s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.4 | BNi8TQRkRds | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.5 | MWib2fAZLQE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.5 | VPHIivuTXjI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.6 | FXKQN1Ugimg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.6 | FfYhK4aGdls | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.7 | 0qmOXQkj3UA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.8 | 4lXKV39ous8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.8 | 4oy5UNNJLpo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 1.4.9 | A60U1Prk0Zo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, {" |
| 1.4.9 | xqfOPOuBF9I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 1!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "1.4", "result": "match"}, { |
| 2.1.1 | nVO4RQYC4ik | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.1 | zGyfAUmsKYU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.2 | BkEe9Ph-QaA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.3 | VU8hsGSFcUY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.3 | 0sax5GdQf-Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.4 | yZ9b8fNpgPQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.4 | hck-0i9EgeI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.5 | WibhvGskhVQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.5 | oBCdgDFnDK8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.6 | ngfI0Rh-d7Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.6 | F5NCjCZ3ins | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.7 | JIpJDIzt6ws | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.1.8 | a9mqBoB7cQY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, { |
| 2.1.8 | 23Y6WWdgQz8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.1", "result": "match"}, {" |
| 2.2.1 | T4wHtJVCSmw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.1 | Z6WxnTGliYk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.2 | MMUkwryE7A0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.2 | r1J8O0CCH5A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.3 | yS_d0MpU8jA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.4 | Gzu1TOSCcSI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.4 | Wf7iJhWixD4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.5 | Ioo8IliNdmA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.5 | oIa9dwRv9V8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.6 | G9N1asUx_PE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.6 | GKOhN5Sceuc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.7 | FZ9tSE_6hqo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.7 | EXuJYlBWJWo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.8 | 3bA8lv7gDWI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.2.8 | N8YCItEHGVQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.9 | iLnrzX2bnyk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, { |
| 2.2.9 | kYWyNWILPCM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.2", "result": "match"}, {" |
| 2.3.1 | EUv3bTHoMPk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.1 | iLsQ3k8XyWA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.2 | O5sTsDLSf5g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.2 | YNyQ4NsKlZY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.3 | 4xXDFNAiTF8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.3 | NvKEzeK7Z4E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.4 | XYHsDv8azMw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.4 | PX_i6XJXrvs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.5 | Ega72wikfp8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.5 | KW53T4MtH5I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.6 | _frSB6wqS2w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.6 | jSuhc-oQLDU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.7 | V0XbdeQtWyI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.7 | m8WGBw_MZI4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.3.8 | 0n1jaemv6eI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, { |
| 2.3.8 | LnH9YdFZ-wo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.3", "result": "match"}, {" |
| 2.4.1 | LASVpjs0cdc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.1 | IRSKLxYsjwg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.2 | t7fiPbPRAYQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.2 | KnUS7pH1xoQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.3 | l66fs35LqqM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.3 | VNcVDZMDXD4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.4 | uFX-L3Y_Tno | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}] |
| 2.4.4 | 818zw77ghEY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.5 | Px13tgbk2rI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.5 | GrsBcstgl0A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.6 | VTlVXwdzYg4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.6 | QSXr8Fh5ee4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.7 | WT8CZMCXj9E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.7 | F0gsG2GV0Ek | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.8 | A5yaWz5x-YY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.8 | tvg3d9Rjg_c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.4.9 | lGaXGZUOP8o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, { |
| 2.4.9 | JacTNhsTilo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.4", "result": "match"}, {" |
| 2.5.1 | o_PHE6bfic0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, { |
| 2.5.1 | QvXZ8XqSw30 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, {" |
| 2.5.2 | 2pQCNVGhP24 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, {" |
| 2.5.2 | KehYqMPnlEQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, { |
| 2.5.3 | mITCt3Vwwzc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, { |
| 2.5.3 | H8GCEfCEDPQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, {" |
| 2.5.4 | y5yHc1agwZI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, { |
| 2.5.4 | hRTHXgvd9yg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.5", "result": "match"}, {" |
| 2.6.1 | Y6cdV_fIA8g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.1 | 6NoDqUBnq5E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.6.2 | lwt-9Guqtbw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.6.2 | eq1rr-q4WpM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.3 | nCllI1PEoTI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.3 | v5H09OyKuT8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.6.4 | Zpbm0qvtDFQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.6.4 | yM3-Jw_3Ct0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.5 | VFm-Q060wBQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.5 | vUiICiMgRK0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.6.6 | MiuJC_TzO28 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, {" |
| 2.6.6 | aSdWY8OahGg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.6", "result": "match"}, { |
| 2.7.1 | O8y49YlaE8c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.1 | W1DiCyIBr4k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 2.7.2 | IpXmRCDyulM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.2 | 9X-V0LBuwV8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 2.7.3 | VrheU3BfaU4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 2.7.3 | rleef2sEjS8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.4 | 85T8aN9AkIs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 2.7.4 | radhP3panXw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.5 | O6sLPaV-1QQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.5 | g-j37B1MZcg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 2.7.6 | p7fx7I3muKw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, {" |
| 2.7.6 | U_zSer4KBzg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 2!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "2.7", "result": "match"}, { |
| 3.1.1 | 0VWAO1Ms30Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.1 | SexM5hEPqes | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.1.2 | WJsN8QcCVZQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.1.2 | sKcJBM1Xb98 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.3 | Ce7XfPvX31s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.3 | Tr4F8en-Mfo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.1.4 | qvzvmmVMKnU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.1.4 | Jy1K6Z8eAg0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.5 | bAEBV3lFIGM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.5 | dgmDAoXVogM | needs_review | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.1.6 | u1PH5CyOA5c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, { |
| 3.1.6 | 0ubFu47HHuA | needs_review | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.1", "result": "match"}, {" |
| 3.2.1 | xegUXYl0eQA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.1 | h-p35uexVe4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.2 | igw5ho1gV-I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.2 | So63Q2ltwec | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.3 | PmXNQTIUGu0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.3 | 0vCSktsX7GQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.4 | rWpslesuaX4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.4 | h8LdCu1TITM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.5 | wjLOfd7_ppQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.5 | EylVYPbsHpQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.6 | vYeDpEBry3M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.6 | VzMWDj92iDA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.7 | iNd51lCl29w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.7 | 6Q0Nl9pVNmg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.8 | vK2MsYzx1yc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.8 | DP8wqsxAQjk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.2.9 | U5b6v44edfE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, {" |
| 3.2.9 | I7qhB_XCUsM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.2", "result": "match"}, { |
| 3.3.1 | TQoZ5toV1Ak | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, { |
| 3.3.1 | ZvproV2H6xg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, {" |
| 3.3.2 | GJDXs3Uwhzw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, {" |
| 3.3.2 | 9PH9gcXuYPI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, { |
| 3.3.3 | J3y49mxtRbA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, {" |
| 3.3.3 | CUFlv4GYQQA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, { |
| 3.3.4 | AtUBbseNWuQ | needs_review | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, { |
| 3.3.4 | oLgi-5VUvTw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, {" |
| 3.3.5 | TKmk-a5dRvM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, {" |
| 3.3.5 | AtUBbseNWuQ | needs_review | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.3", "result": "match"}, { |
| 3.4.1 | PWSkb4cXrCo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.1 | MtBhAzKx0iU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 3.4.2 | iMayxgGuQu0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 3.4.2 | SZWyOIc-iMw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.3 | _mv4RCe7FsQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.3 | e7_Tak-bvao | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 3.4.4 | eJ0YLDqaRxo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.4 | mU1Rup0qCtM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 3.4.5 | ZGC7U_e7iS8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 3.4.5 | AKuKsCydlLc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.6 | XIrNvTsLwok | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, { |
| 3.4.6 | KrHYVN0uMzI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 3!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "3.4", "result": "match"}, {" |
| 4.1.1 | c44shUkBz04 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.1 | QkTVojJMgzM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.1.2 | ymm3UXBjvys | needs_review | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.2 | UzxmLsIXrLY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.1.3 | ymm3UXBjvys | needs_review | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.3 | MX91vTi8qz0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.1.4 | LTWt5UJa840 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.1.4 | bMoG7bs3uZY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.5 | cf97Px9evhw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.1.5 | MHg0IzSQgUQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.6 | jTUaY9est_8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.1.6 | -_HTiQ7a8Q4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.1 | UtUHT2G4OnI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.1 | Brzzv7aQYDg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.10 | vzPfaWxfpg8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.10 | 92F41axIgAg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.11 | ar8klkW23o0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.11 | iJ6FRT7b-9M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.12 | GJPNk7DYepM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.12 | ZscaBfqEG5A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.13 | 1G1TOT0sLgQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.13 | M8idiAznp9I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.2 | id29pd9HtLI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.2 | uLpVKSPVCoQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.3 | QTzJyRVnYk8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.3 | 7FE3ygoFd9Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.4 | _bDocmb-Acw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.4 | pyVqd9X_G5g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.5 | 1kNxVed9JSw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.5 | ZHDkL50pI-M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.6 | YnZl8r1si1Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.6 | nYQfk285WYY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.7 | sbFFtGAc3wA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.7 | pDW6ZCSRzF8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.8 | GPR_ebWc5Yw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.8 | Gkr0lCRFhuA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.10.9 | StY-WHd6tz4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, {" |
| 4.10.9 | 8_qm3Eyha7k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.1", "result": "match"}, { |
| 4.2.1 | 1jXgQUAc1U8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.1 | sCQtrIXzJSw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.10 | JC12fdtXSoQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.10 | ahRueTxHw3E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.11 | sqSJ8Z3DqC0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.11 | Jd62vfkg3Bc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.2 | Brfoz1k1e9E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.2 | xn0MCZGcZLQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.3 | tvbsQNaCgdQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.3 | MGFdK-3RoG0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.4 | 2-wQQdFafWU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.4 | ZqwLCYssIao | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.5 | Loo4qp9Ap9Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.5 | a8YI06Zzq9c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.6 | yE_65NZT1hs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.6 | qrTQsgIk544 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.7 | CVkIJyw6yDc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.7 | uyEs9UEUh7M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.8 | DsUGbLJIcQg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.2.8 | TinOzZjbho0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.9 | qirEWonbLLA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, {" |
| 4.2.9 | A6f7F61q0Qg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.2", "result": "match"}, { |
| 4.3.1 | UsYiT4a_FWE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.1 | hVBk9rH03L4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.10 | LHrrsvndRGc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.10 | A6LsjT9Evs8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.11 | ithHVAa5RpI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.11 | o89oCuKDCsk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.12 | 72i2Z3ZFIS0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.12 | vtSRPTohxAk | needs_review | [{"check": "milestone_merged_range", "detail": "A129=4.3", "result": "match"}, {"check": "correlation_text", "detail": "מלאה: 4.3 תת-סעיף 12", "result": "match" |
| 4.3.12 | dnh9HrBPrkI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.13 | vtSRPTohxAk | needs_review | [{"check": "milestone_merged_range", "detail": "A129=4.3", "result": "match"}, {"check": "correlation_text", "detail": "מלאה: 4.3 תת-סעיף 13", "result": "match" |
| 4.3.13 | tPEBvmgfYzY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.13 | 9tRw_rPWgNo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.2 | QOEjgAIoFTI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.2 | 6QtfeRjROqI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.3 | 7GDlOTCT9Vc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.3 | wqv0ZssqXxc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.4 | PEBzhrj7Dmk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.4 | 3Tmb50R6yRg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.5 | -grk5mn2fXw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.5 | yHuT9ox-vgw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.6 | 0iuGLb_94WM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.6 | 7iQizilSJzo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.7 | ZyqhfJ4CNyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.7 | Dnh5QAxwBNw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.8 | tlblA8PYe7o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.3.8 | dd7Izbx0pgk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.9 | vnV2klr9Mrs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, {" |
| 4.3.9 | 2uyI2VC8guc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.3", "result": "match"}, { |
| 4.4.1 | Rk-3-Wungb8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.1 | KI2N2eek0kQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.10 | lkbxwmT3pu0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.10 | 13vz5PolghE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.2 | b4GSroVzKFg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.2 | hriYCCoMbbA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}] |
| 4.4.3 | emIM-ON8b9U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.3 | maidGBwQlXQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.4 | 9_zNFZTK0yQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.4 | qa3CGzxJCVk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.5 | jBCyOwdu5Vc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.5 | JVmkX_knsY0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.6 | Kesian1C3GE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.6 | Bf5sUuR2o_Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.7 | Zu--e4e36P4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.7 | 5NgbwQOkZ34 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.8 | eOvj_el2nDU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.8 | 9nfM2jMSNWs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.4.9 | tvtnPuMhiiQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, { |
| 4.4.9 | 1kuaynRL96w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.4", "result": "match"}, {" |
| 4.5.1 | 8nUB3sIWE1g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.1 | ZGfqPyIXgNM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.2 | YeNV04YHu6A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.2 | PFtNplPKCx8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.3 | lSQK6Md_yRU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.3 | UQC2v6gugpQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.4 | Xqbz5muU9uw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.4 | XWVlQixlswQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.5 | X0O8h_fe8BA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.5 | fYrdMOzzfj4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.6 | NPYUNtopPLU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.6 | yBjrr-c8Cf8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.7 | 9WRklQHJvBA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.7 | 0kjtEheaDco | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.5.8 | VkCJK7APT_A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, { |
| 4.5.8 | 0N8c3eOKpLk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.5", "result": "match"}, {" |
| 4.6.1 | ub5LbjMCgEs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.1 | y7e3F-JF9eE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.2 | 114w6F5wvZc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.2 | _mykOty9GiY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.3 | jbtVzHl6uiM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.3 | 0RcqUQYSvYc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.4 | fJaUEExg4u8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.4 | GBceLJmrzrk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.5 | kQxYEcJVkRg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.5 | bbRfgoW7g4I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.5 | eNs1RlF7knk | conflict | [{"check": "milestone_merged_range", "detail": "A160=4.6", "result": "match"}, {"check": "correlation_text", "detail": "מלאה: 4.6 תת-סעיף 5", "result": "match"} |
| 4.6.6 | NMwcWlR2dpg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.6 | tFCW1yzBn_M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.7 | HbWxSyfbks0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.7 | MJhq1lH6i3Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.6.8 | EopLN04wPCw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, {" |
| 4.6.8 | asuuJ3l0K08 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.6", "result": "match"}, { |
| 4.7.1 | yfp4GphVIt0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.1 | 9c1R-yM1Np4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.10 | mLJ1sANUaNw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.10 | jgONIMjgZjA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.11 | PUMR9Sk9IbE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.11 | L0pGSlXp-2w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.2 | gNjXmUT9t30 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.2 | fi52XZ13Dts | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.3 | TEMsLPyVCXM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.3 | qMEWJlF5HG4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.4 | DgYOegYDzZU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.4 | G_xt-B_x-YQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.5 | kw0ZIyxVTGI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.5 | FnGiVRZGkVg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.6 | MVDCWho1BR0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.6 | KTojuQl83gY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.7 | Bfsd00X9yYY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.7 | Lu0kWCLTyg8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.8 | rlsyLCnO0bo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.8 | skjq5hy_9Vg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.7.9 | 9igYK5uw_rA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, { |
| 4.7.9 | i90sfwPKVHY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.7", "result": "match"}, {" |
| 4.8.1 | w8id-2-WYKQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.1 | udPeyHRnS14 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.10 | v5LYrSwIZOk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.10 | PiTDTfR2-VM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.11 | qv5AqbIMLAY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.11 | VvDjYmE_8BY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.12 | FHW6M1MJ9QM | conflict | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.12 | KsObd0VKpb0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.13 | eUlUVp-R36s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.13 | MXXxSvxr600 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.14 | meAqjfp5Fx4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.14 | -jFyLnqGX1M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.2 | RGaICr3MCtQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.2 | Z1fl6Q6D8cM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.3 | 9XkgCX7qOSM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.3 | kFwHy9TDbDE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.4 | OwAElx4wVTw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.4 | 8ZnbkNoZIcE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.5 | 51-ixLeKYyI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.5 | Zqi57AtxAYw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.6 | j1fGRfvpGAE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.6 | rtKTiGlJcCU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.7 | 2pEXfq0k_dY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.7 | Aj0AEIVS3MU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.8 | MqkLWfjljwU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.8.8 | x6q7Q6cC_so | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.9 | OSDrI2A-A8k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, { |
| 4.8.9 | y-9PsW8PIXg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.8", "result": "match"}, {" |
| 4.9.1 | 9iFx2q8r3LU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.1 | uS8Mo8CtE5s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.10 | 2pgDaifhjHg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.10 | dpo6ZybGamE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.2 | G9Em20vWDpA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.2 | YceuN9EoazM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.3 | gTspXRGMPjc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.3 | WyMObeES8Oc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.4 | 78WbX0v8Nd0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.4 | H4WI7lItNg4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.5 | YlTD4BZUezk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.5 | 7iLZGw5l9jY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.6 | KIBOpSJN6a0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.6 | yFMclvzTSsw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.7 | 7LTjZXjsIEc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.7 | M53f7TeGwwg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.8 | ZNtoKj-kMZQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.8 | 018Bj-Q3x4w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 4.9.9 | 7O3o4xg3Jao | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, { |
| 4.9.9 | 1H-fWTq423w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 4!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "4.9", "result": "match"}, {" |
| 5.1.1 | mK7k8-FcFHs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.1 | qGySPdVOYe4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.10 | 4Zoe6mhg980 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.10 | GMOK9lWQIQc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.11 | vTDwfj_s3BY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.11 | PPgqoZnns2o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.2 | myQ_1gP97QM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.2 | asd0YfnNm68 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.3 | BX_VnEk1pC8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.3 | EISTn3A44Vo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.4 | Y_lgpEjYhG8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.4 | n7B2F0kZOnY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.5 | UBD-DDFKobc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.5 | qUIExInwMzo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.6 | GOs-JmYb6Lo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.6 | oYItPyyJYJI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.7 | j9Tk_vXSb9s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.7 | -1I7D_bQhz0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.8 | 17o_Vx9D_uw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.8 | Tm_1f1xyuk8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.1.9 | UQsIr0j4_IE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, {" |
| 5.1.9 | cwJbf8EH_Mo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.1", "result": "match"}, { |
| 5.2.1 | PSFTyygwZZE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.1 | TcSY1rqUndk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.10 | FAmYCFIKwpw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.10 | IqLVFTnKkng | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.11 | y2gzXIc_5Gk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.11 | _dfvZCEsBkE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.12 | wAUSBBI4bS8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.12 | grF7mL1514I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.2 | iU48F68u7xo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.2 | KxiVVOU-uCQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.3 | XgJIk-pf8rg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.3 | Q3hIJ1sZy3k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.4 | QpJc_lNpptU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.4 | 8-_cIcuZ1KU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.5 | ZJ0Qse5KMZI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.5 | FBURqXsbC7U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.6 | YPDeLt-IMnw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.6 | NaWVB9aOWgg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.7 | -vAxFTiLosM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.7 | Mw2je824ne0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.8 | bOewBwv9G6s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.8 | -2-ADM5IlaQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.2.9 | SnCLe0Iqkok | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, { |
| 5.2.9 | xy_Z7bd9Wls | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.2", "result": "match"}, {" |
| 5.3.1 | Wp7iamiGh18 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.1 | bqW3ogiCxJU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.2 | tW1DjYgL3k0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.2 | EM1an5ZU1_c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.3 | jexwrJFCb4Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.3 | 8snBVZt8T4I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.4 | um0RhJ1zuE4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.4 | 7Govo4kAtNE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.5 | CWh9XNVqMtk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.5 | Lj7jd5mPYWo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.6 | vtDeOy8RgBM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.6 | hZ_IC9CIh7s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.7 | YzroG45bmSI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.3.7 | FmtpZgW62P4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.8 | Pazt1PUSSHE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, { |
| 5.3.8 | 4upVQONhOg4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.3", "result": "match"}, {" |
| 5.4.1 | fFH4z-OvCc0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.1 | EPb9Yudhpgg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.2 | pL50dCYh2t4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.2 | RVD5v-sEWik | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.3 | Pxzv3IxSxt4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.3 | NvkJnsNTRfk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.4 | ngArZrN174U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.4 | kDd83VwX0bY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.5 | PHIFqwI0kig | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.5 | 8x2UvXuNtZ8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.6 | CYDQXQMPvKA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.6 | lm54kkcpH4A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.7 | naKv4cu7q5A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.7 | pLp3GwVCslU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.8 | xk7EYLgi2ws | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.4.8 | jkgG98CgLE8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.9 | EfO4C3XqqIE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, { |
| 5.4.9 | vhj3Q7zjY7E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.4", "result": "match"}, {" |
| 5.5.1 | zWntvLA4Hbs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.1 | XNYzyXX7Pik | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.10 | 6DST1ct0_Y0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.10 | uWMLbRTuuaQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.2 | 5_0dkebNfUw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.2 | nzTqZ8zkP0g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.3 | 43-RaW7Znc4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.3 | Oz8HBLf34Ok | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.4 | JGMkMhQpJ9o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.4 | HRlheS7W-NU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.5 | _u9e5QDzedg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.5 | ywbeEZ63XSo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.6 | Tli_1xMtxZ0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.6 | UEmZUs4YM-g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.7 | G6Vpj_sBgvQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.7 | zSYu5sGeGBg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.8 | nN_NI6HwrWI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.5.8 | f-EgGoC3Ey8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.9 | 85h-eOjBTH0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, { |
| 5.5.9 | z00veIHng9o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.5", "result": "match"}, {" |
| 5.6.1 | cMsEy1hEaGA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.1 | LPri2Nhdk8o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.10 | IhkUHzRuxKI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.10 | 2dKDxMZn_Zw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.11 | _3IPYAHnWd0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.11 | XQT9q9ky7UI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.12 | IT_t1QM3qqE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.12 | Q1sjy8ikAq4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.13 | 3zd2HNu0VqQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.13 | yrPAeT8WZUw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.2 | 4vgUwwQkQS4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.2 | DqyTBOsc2kI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.3 | My5_QozzfH8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.3 | Wgt1H6i4bvc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.4 | UBhN-zVKQg8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.4 | JtOYhHJ-Z1A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.5 | DlJv3o0U9_c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.5 | NRERNuEK7Fc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.6 | MIH7jbqHy4o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.6 | Vt_8zgaviTs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.7 | I_g1zPjAzYY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.7 | E5XT0Euk2ds | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.8 | TcfzEsvdY0A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.8 | o8eVGIjm7Ls | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.6.9 | DOlRmY8s_Hg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, {" |
| 5.6.9 | f3vqP9pASy8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.6", "result": "match"}, { |
| 5.7.1 | X59J3Fbb38w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.1 | 9XYT4LJIBVI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.10 | bDFKIgb4_0c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.10 | uTJiKwpcTcc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.11 | QBxlQ--ziCk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.11 | Vur7ky2mCYU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.12 | f6Ua0EChTyE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.12 | 4VbJyecVj_A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.2 | 4fbXIrVnjrE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.2 | NHAbeb681Uo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.3 | lOKuk7tZmxI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.3 | ZvcetBksA6g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.4 | lyWahQwAjGs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.4 | -pJ7lydjQW4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.5 | a7YfsDZanGg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.5 | gReE4LHhlFE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.6 | slUIolkUDYI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.6 | UUxLPo48x5M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.7 | 3ccv-ryaJJc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.7 | xYoBTZaH_z4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.8 | yNlS-a_O9ds | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 5.7.8 | 1NV2Gg4horA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.9 | WmDM-jQrjBg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, { |
| 5.7.9 | 8JMD2zg5FEs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 5!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "5.7", "result": "match"}, {" |
| 6.1.1 | bJBZz3Ou2h0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.1 | xTbco-U0_bc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.10 | TOB79MH2T9w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.10 | fkBOvu0jIJA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.2 | UxktCDCHxV8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.2 | ZXqZhbO849Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.3 | 1BIOc9y3FZg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.3 | fpMc31HrP0I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.4 | fx1OAs82cNE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.4 | cugvGcPWBIA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.5 | INhKDVeArGw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.5 | 1zsM3Ov18N8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.6 | slYhg31Z09o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.6 | E_a49jBSEsE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.7 | s507Ymfj_Q4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.7 | D_7TUjQnODw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.8 | c9UX4j5ntbs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.1.8 | cOh2M02mr5c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.9 | SSn7boyU4Lc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, {" |
| 6.1.9 | ScZawnV8qUY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.1", "result": "match"}, { |
| 6.2.1 | R0B7misHlx8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.1 | FPpRS1-up3I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.10 | mF8etRgUKdU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.10 | 1ZrZrsu06uw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.11 | 718ec73UYl8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.11 | z_FgwhOezF8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.12 | HOwk7EjfRyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.12 | Y5GpOQev5-4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.13 | l3w0VLXwdfk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.13 | uQ3USA38fho | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.2 | rWAkWCc38fE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.2 | inPIWFKf9ik | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.3 | NKd7s6CuLw8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.3 | TEARO9tKsUE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.4 | V7Iwgt2q72U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.4 | ulwXwO66EE0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.5 | rcFoG2fcEnc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.5 | u1VXklb5SxQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.6 | O6Sta8-A9Sg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.6 | lPyXCUqCWkM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.7 | qXPt_usxzCU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.7 | 1AFJ_3ZY9fo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.8 | I7gH9d3VFio | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.2.8 | OSypaB9L7Hs | needs_review | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.9 | OSypaB9L7Hs | needs_review | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, {" |
| 6.2.9 | gIBNyzuJ7Z0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.2", "result": "match"}, { |
| 6.3.1 | fAMCQQO5L98 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.1 | 6tj1Xrr1KK8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.10 | K2YSzYqU_sM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.10 | LXnPoupZ0Eo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.11 | pHiBUjpuKj8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.11 | c3DxwOi12pA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.2 | bO2pzCFQyyI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.2 | 92sEyq_dv_A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.3 | M90iCHqu8as | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.3 | kWqFyHByOJs | needs_review | [{"check": "milestone_merged_range", "detail": "A264=6.3", "result": "match"}, {"check": "correlation_text", "detail": "מלאה: 6.3 תת-סעיף 3", "result": "match"} |
| 6.3.3 | Zd4MTL5iFNw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.4 | kWqFyHByOJs | needs_review | [{"check": "milestone_merged_range", "detail": "A264=6.3", "result": "match"}, {"check": "correlation_text", "detail": "מלאה: 6.3 תת-סעיף 4", "result": "match"} |
| 6.3.4 | fXut6IGCIBQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.4 | YFxm65SWn04 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.5 | Bljv2Sh_nO0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.5 | E5JT5HAXwnk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.6 | 3kCf_D3IH90 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.6 | UBhXA-1SzH4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.7 | nFQ4ubCSBvY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.7 | wOk4Zp03cHQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.8 | iPZ7i2e2nSo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.3.8 | kN1OlBt5MCg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.9 | OTGKfefJICA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, { |
| 6.3.9 | _3t9UVErPvs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.3", "result": "match"}, {" |
| 6.4.1 | 9paq8rjxuRU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.1 | hbwZDos4Ag0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.2 | UeJgGcV7AZ8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.2 | MkzJS5DLg9w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.3 | 0hyTpyT5C_o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.3 | vpJrq8IpE4s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.4 | VwxzQANNYNk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.4 | 2IW2foJ3J7k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.5 | M9CxZPL4DCM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.5 | K62DMuLwLUE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.6 | 1M2DWJ9W7PQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.6 | 5b_TVxlyUjg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.7 | lPJX_9IM-Kg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.7 | 5lJFNJLkmgo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.8 | w-bl1YH82uo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.8 | iGxowHgcL_E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.4.9 | 6M6vYhsRo_o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, { |
| 6.4.9 | _hXB1hy8KZk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.4", "result": "match"}, {" |
| 6.5.1 | hn4PRa6NNrw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.1 | JTd54e7yXz8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.2 | vigBM3qk5wU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.2 | 9irZUQFTNy0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.3 | wrOiqQ4E150 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.3 | Ztozl5Pb-RM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.4 | MJGQEL9r1I4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.4 | YSqoW5RmeHo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.5 | eoV86edwU8k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.5 | tFyCoUtS1t0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.6 | Ur1RUXUcXy0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.6 | sCFtUltFDAs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.7 | BngaXP9YlBU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.7 | fgmfzprE0zU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.8 | kBeF9E0TalE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.8 | nmNE6oN7u1I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.5.9 | ta9GDyuQuXY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, { |
| 6.5.9 | IwIVQMXQNWg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.5", "result": "match"}, {" |
| 6.6.1 | LB0izyKs_Ic | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.1 | VKthmZPtMas | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.2 | SCi3H15juHE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.2 | vqg7gBjgkTY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.3 | QKSRoAu8nG4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.3 | 38te5Nl4yq0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.4 | Xs9gNemBxa0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.4 | krD-zLTN20s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.5 | ZsiL1Y6iyfk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.5 | 1i_GilnsuL0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.6 | f62nc8H-I0Y | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.6 | 7m0kAyRFpcw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.7 | GtKHBrA40eA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.7 | m_DaqTVaAVI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.8 | wwwRtgrwT3E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.8 | TFQx2e6ZSbc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.6.9 | rlj5z2I_KAE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, { |
| 6.6.9 | axG1KPSZYU8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.6", "result": "match"}, {" |
| 6.7.1 | 1RsyaztLHWg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.1 | V3-7rUauDhk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.10 | _EHahXDII1w | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.10 | esxCI8X8964 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.11 | iIJU8LE0Xbs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.11 | YET3xAF9NqY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.12 | X8nATjX634o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.12 | GPNTWELEBik | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.13 | fdTB0LCqSQg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.13 | 3eH-PIoedPk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.2 | 9u7BW-1aerk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.2 | 4XVz6U5dyXk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.3 | H5AAyQzTgJw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.3 | 9vNMLfHnxvI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.4 | kWZlyz3ygGI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.4 | kY-br7ScFTQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.5 | 6oz4duNK0Rk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.5 | 9dq5AF4hARs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.6 | h5sItwXOZ5k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.6 | ek6r2hbZJ9Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.7 | -rbfol17te4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.7 | UmWKi0S7xOI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.8 | KYm1AyixndQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.8 | TvJ3hu8M3b0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.7.9 | QUcHZngnV2c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, {" |
| 6.7.9 | fOJf74iOjOo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.7", "result": "match"}, { |
| 6.8.1 | GQ1Sc7cAxzA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.1 | mh1fJYLFEjc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.10 | eBzVun-kh2U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.10 | U7egSm0GwIA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.11 | mYrn1KFjkqg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.11 | lJ_ps_oZxps | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.12 | 7gUkxjQ7NCQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.12 | cfpjdfTv0f0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.2 | sZ2xDAP6-go | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.2 | D0pEe1rmqJk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.3 | 4dPofAvUT40 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.3 | ZVHLvP6ASuc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.4 | WvXcONkWgdw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.4 | LdPQpvdH-Wg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.5 | SDekIBeU8pM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.5 | -pkAMDfBZ0s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.6 | Q7lY6teEwMg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.6 | gtREPJCxnM8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.7 | luiZ8aBzJ2Q | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.7 | -iQG0Ey8mHA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.8 | 8l6YXSzggTg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.8 | 746Qf7xNFHA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.8.9 | hzlI7mXsuyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, {" |
| 6.8.9 | cxp9p2o_QoM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.8", "result": "match"}, { |
| 6.9.1 | NQaKQKS3hDs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.1 | hWEjm3CiDQA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.2 | emdIhTPsQbg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.2 | QMzEL9f3hiM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.3 | NExy_bvP-Lc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.3 | 9qvskngF7RA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.4 | Ff6re78m7VU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.4 | sIX2GapFvmY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.5 | d8Tb2A3JgNE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.5 | 7gXtESVqcf4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.6 | RRu53U_gHX8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.6 | ELN1McD3xSk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.7 | wGc9kbtc-Qc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.7 | ELsisWwW6y4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.8 | FV5PcgUfzAU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 6.9.8 | kKK4AqLff60 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.9 | ic-inhEmaOk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!K: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, {" |
| 6.9.9 | W9LGBGSvgCY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 6!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "6.9", "result": "match"}, { |
| 7.1.1 | q7QIThJnobU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.1 | SB7BdsZs-f0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.10 | dMHw28zoaeI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.10 | 5PjP3yXBti4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.2 | GeGiRtnGxEw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.2 | OdknI0Ln6rQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.3 | vPMvqhYt8mc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.3 | h9UnrfUZUj4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.4 | PFQ468q52EE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.4 | TccH1_44BUE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.5 | v_5Mg6wsrmc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.5 | oF5XiPqQs2s | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.6 | oyWbxr14zf8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.6 | WI7FiYIvCHE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.7 | b0eEIKpzpII | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.7 | 63valXgTCws | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.8 | jsfoMuDWQws | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.1.8 | a2BMuqpqJhQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.9 | Md_Ag0Yxz34 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, {" |
| 7.1.9 | FUyVExdFt4k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.1", "result": "match"}, { |
| 7.2.1 | 7iUXr-mzvmk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.1 | CFSqcSU7z9w | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.10 | QAWFgFSRgJ8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.10 | ED1-7nwI9SQ | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.11 | qtiGOP3O4_o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.11 | 61IvqgW3vXE | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.12 | y-bwE7JVyJU | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "mismatch"} |
| 7.2.12 | y2dEecAExLM | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "mismatch"}, |
| 7.2.2 | Ydrvws6BLLc | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.2 | j7lccTsM0UU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.3 | ZESQ1-EfoSw | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.3 | HCNRTASfQIQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.4 | cz8_KZDzJGE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.4 | wTWTJTZnJb0 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.5 | MG1gg30nEw4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.5 | JB7h2rpLw1s | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.6 | FHVu8vQvX38 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.6 | 6fsVAhPWFTw | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.7 | pqny5srJ1hI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.7 | b8xnNwKgBXg | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.8 | xrtA4CLw5Bo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.8 | NVJPGJ5mvb8 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.2.9 | oMhsGXClZ3E | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, {" |
| 7.2.9 | O1FEsa47YxY | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.2", "result": "match"}, { |
| 7.3.1 | 9RQOOZZgENE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.1 | KFC_IS8pzmI | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.2 | w7JaTBBCpT0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.2 | egtSLD7cNMA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.3 | 3cHRuPQ_vf4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.3 | aPJYB_btRHA | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.4 | lzbPF9RSlnE | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.4 | am7ThL2QUfo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.5 | 9Pj8-eUy89g | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.5 | gf44zj8elFw | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.6 | EiZ1NlEK5h8 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.6 | 499LqFsCTuQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.7 | Rj8RbhxGj28 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, { |
| 7.3.7 | HscmaxIIXyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.3", "result": "match"}, {" |
| 7.3.8 | h1P3kS_9slo | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "mismatch"} |
| 7.3.8 | 2x-pm6pJ-qY | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "mismatch"}, |
| 7.4.1 | wMlqYU8bNj0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.1 | sG-JmaqJPhY | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.10 | YkmLTzIJ0JM | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.10 | Oi4h4NJWWE4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.11 | YsYvEYgB7N0 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "mismatch"}, |
| 7.4.11 | 2FW22xNXx14 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "mismatch"} |
| 7.4.2 | gXQ2tN_QUKM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.2 | VhBX2eH47t0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.3 | 7YKYk8kr_6U | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.3 | dakvZOLvFQE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.4 | Wqfa9-o0liA | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.4 | usEL07YRksQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.5 | ksZzozoVCz4 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.5 | 9doA_lu8JNk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.6 | -mZ_0eOmAlE | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.6 | -eOQWc2IAWA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.7 | uAEUd5-uAdg | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.7 | 8JdhO8sZzx4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.8 | 8DSNYN8-q7M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.4.8 | loeoqtigB4o | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.9 | DZv90TtroA4 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, { |
| 7.4.9 | ScodyIcOhcc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.4", "result": "match"}, {" |
| 7.5.1 | _RgJWqV__RI | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.10 | HM9M9Vpm0D0 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.10 | GzYp462q2sA | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.11 | b4WqEvB5Lmk | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.11 | zaKdK4XWi9Q | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.12 | l_Fy9BxJr7M | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.12 | oMLX7X9oGIM | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.13 | Yzjz1FWrXlY | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "mismatch"}, |
| 7.5.13 | jQ5cyx40RAg | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "mismatch"} |
| 7.5.2 | ZBAiwc-wZ6c | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.2 | t1xyzpXEhg0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.3 | W6bihSPHIhI | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.3 | J9IK1C3S79s | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.4 | QXKFqRSm1KA | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.4 | 0I0YYOn1gug | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.5 | tqmR5M9NqCk | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.5 | aTbkefugrZg | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.6 | TnXdBP6Qk6Q | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.6 | 3sw6aZK7znw | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.7 | CKhZtQhPmcY | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.7 | 8PhnjJWUIog | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.8 | 16Lc7AOdk7U | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.5.8 | xRPaHcXGm0g | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.9 | FRlglnOvRJ0 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, { |
| 7.5.9 | dAUIzuakAYc | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.5", "result": "match"}, {" |
| 7.6.1 | FbjKQC1OGHM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.1 | Y2eTs7bbsCc | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.10 | Z4fIWnLmlmQ | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.10 | WPvwSGodfbg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.11 | qVsCp6B6CEM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.11 | buQcF0xZW7I | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.12 | bCwaqC9-2cA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.12 | 0TvwrMu7Jps | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.13 | TQyouwR1Z8o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.13 | oUDmbW9xPTs | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.14 | A05mLxfB30A | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.14 | qvbu1kFFnhk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.15 | YRESW6EgxFo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check":  |
| 7.6.15 | Hi6TU22imT4 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 7.6.16 | 38Hm7Q2oRac | conflict | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "mismatch"}, |
| 7.6.16 | B6sMFy7_KWU | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "mismatch"} |
| 7.6.2 | 4PPuOBiKt8k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.2 | 9PNAoDhJ8hc | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.3 | qicgP3MRQ-Q | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.3 | icj_YjaTBQs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.4 | diPM2ugpDZ0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.4 | bau6WoKMuVQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.5 | 8CEZnGdghWE | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.5 | 7lZisitMKp0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.6 | G-T4b3Tfbr8 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.6 | dPvbiJqDpRs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.7 | KwrJtMkSxyw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.7 | EjDPi7kUsh0 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.8 | yGYvD11Mj9I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.8 | 9djSYQDXKDI | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.6.9 | zcsABk3_C-U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, {" |
| 7.6.9 | pMZ29YREIm8 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.6", "result": "match"}, { |
| 7.7.1 | tmxEQqreETg | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.1 | h-oymCL6kOA | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.2 | m0cjKSmFoOE | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.2 | XeNXDPB0eXg | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.3 | Y1aea0Zvspg | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.3 | 5UEu1T3Pqeo | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.4 | yx04Mn_2wu4 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.4 | SwRhPkHg-fY | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.5 | jbbz6jh3NuY | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.5 | B4Sl9S1HEeI | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.6 | J7BxvqODYZM | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.6 | zqLiYbA4CqE | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.7 | 5I1Z9xxOo_A | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.7 | -iUYZy9hqTE | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, {" |
| 7.7.8 | j4wzDw0p7YA | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.7", "result": "match"}, { |
| 7.7.9 | Ip6ms0ztxjo | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "mismatch"} |
| 7.7.9 | LHfIICm8qNA | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "mismatch"}, |
| 7.8.1 | WMxMe04vSWo | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.1 | OHxCD5o648M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.10 | 3MJolIxtOVk | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "mismatch"} |
| 7.8.10 | 8onyUn_sN9c | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "mismatch"}, |
| 7.8.2 | dygWBqFgoDU | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.2 | VT8sYPolpIQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.3 | LjUHpPFmfms | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.3 | UGvp3_GCznU | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.4 | UtuSLPU0Uy0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.4 | 4jEi1ChUAKw | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.5 | EZLrioyBQpg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.5 | tF6DAVf6jUE | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.6 | myQIkgUF-8M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.6 | efbmMiEDgCI | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.7 | GpKG4IsDwRE | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.7 | AsPjpSz_z-A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.8 | vILUL7BOywg | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, { |
| 7.8.8 | Mm1eMM1ZJXs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.8", "result": "match"}, {" |
| 7.8.9 | fjX_Zd1nXFw | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 7.8.9 | NH4RvG_uMPU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check":  |
| 7.9.1 | 230MhvWeFcE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.1 | M_-wNIQbgC8 | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.10 | xM8TVdWOd_0 | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.10 | XaDaZvxiYe0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.11 | hM5ZEinqwGU | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 7.9.11 | 0XWlUIH_UR0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check":  |
| 7.9.12 | -eyT7WeQelE | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 7.9.13 | p4C0vx2t7dQ | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 7.9.2 | rVQADnrvUCQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.2 | EsDZe-CVX7Q | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.3 | P6eiadj_mGU | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.3 | PidXdwyyn9o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.4 | Oy-qrb1effc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.4 | d7pDiUX-skU | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.5 | 2qlMzy95dd0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.5 | OMaEzOqJzFU | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.6 | DWXXHI_VRRo | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.6 | YQptcm9OfYo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.7 | vjWsgD6g5hw | conflict | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.7 | vXX8yVH80nA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.8 | -nstUim68wg | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 7.9.8 | Mj2EXJfNOWQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.9 | XuoJrvLvGVU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 7!L: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, {" |
| 7.9.9 | 6ufeZEhYKtA | needs_review | [{"check": "workbook_column", "detail": "סדרה 7!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "7.9", "result": "match"}, { |
| 8.1.1 | luiQ1D14R4U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.1 | -CgjzGmKes4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.10 | 97_7BjrK150 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.10 | 2y0fIn8ngvA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.11 | GmQ43g3B-kI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.11 | ApnIAolgJzI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.2 | MO3ZhzepItk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.2 | VakgHrI6DDo | needs_review | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.3 | S1EY-tPznbo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.3 | YU-faTSAA0I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.4 | rtvuhLPj4d8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.4 | 0YdQnGeDaxQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.5 | acTG3Y38C4k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.5 | WlNkkXM3iNA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.6 | Gg0EWSnaN_U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.6 | jwPXvgx1F5c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.7 | zMbrgCg5ETg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.7 | L5WQfi1-xto | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.8 | IvqLGoE5VHQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.1.8 | fu4rDXJgspU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.9 | 25QVkoNARCc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, {" |
| 8.1.9 | iuajaURjmPc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.1", "result": "match"}, { |
| 8.2.1 | jbeyHcHJ4TM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.1 | wC-ckNiqdyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.10 | xjigwd4xhcw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.10 | -kWHlPYVrjg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.11 | fLYU1KINaiE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "result": "not_applicable"}, {"check": |
| 8.2.2 | TgoLfpYUt5o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.2 | 8zgGPtR529k | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.3 | xPCNFnwFlgI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.3 | oGM4E6geYrI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.4 | q2QVbtTkPn8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.4 | nFCLvfzD2Jk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.5 | 72OtupaiKgI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.5 | r9096OONdh8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.6 | NzteC5rjzRk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.6 | MTFvQ9Weqrc | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.7 | QSam8WX5IaQ | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.7 | Af4uH0PlaEU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.8 | XMkw9MUQqFM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.8 | eD6aLJbshMs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.2.9 | BTQ0NMrfaAo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, {" |
| 8.2.9 | NTSTU18GNyk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.2", "result": "match"}, { |
| 8.3.1 | dXMxYAUz6Is | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.1 | osrIH9A18nI | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.2 | 8SwQ1a-EXEs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.2 | dcURGI7d3PU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.3 | DlBTJJpKx9I | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.3 | etk838cLXIU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.4 | _LAjdlxxfG8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.4 | P-KjL6FLZfE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.5 | du0sYoeSrIE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.5 | Q4KSsP6vU78 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.6 | vNnk5xnWnD0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.6 | 2HOhLPr4QYo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.7 | eRni0aeEK5A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.7 | 6TqYSZ_mGLk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.3.8 | jRZIv2NJZUw | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, {" |
| 8.3.8 | OefRScTXcyM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.3", "result": "match"}, { |
| 8.4.1 | ReMotKsqG5M | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.1 | N5WmEQeohBg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.10 | PipKjSahTOM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.10 | qU2OVDMNav4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.2 | 99btAxdUvu0 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.2 | _JHWYKZVqSE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.3 | 2QRljOrojuE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.3 | 3ULo7RjGvQM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.4 | sQcQvdnoTcU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.4 | OxpUhv0V3Ak | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.5 | 4JFZsSMRTYk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.5 | 5HAUAmTxRnk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.6 | SbodfYeyUnA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.6 | 8A7OvgCSEuo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.7 | T3_Zu1US5ls | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.7 | vPEYcWR2ZvM | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.8 | Hn48VHkgf1o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.4.8 | SXr7INUVwwo | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.9 | 9QwhiO1Uapk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, { |
| 8.4.9 | 5g55z98Iol4 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.4", "result": "match"}, {" |
| 8.5.1 | gcsUchlge9o | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.1 | OV1oL4Un908 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.2 | ETucoNJqLeE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.2 | miC0DD0VMXs | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.3 | w0g-iWGTvP8 | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.3 | u69MRy5Mw0U | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.4 | hrU7qGXcXbk | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.4 | mcmmoRsJPsU | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.5 | 0jovIbT0_jA | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.5 | -iij4Hwsyis | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.6 | hsvml4AETjg | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |
| 8.5.6 | VQA6F-Lvf6c | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.7 | b9QOND_E_9A | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!M: לינק יוטיוב הורים", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, {" |
| 8.5.7 | K7ekdEkaYPE | source_asserted | [{"check": "workbook_column", "detail": "סדרה 8!E: לינק יוטיוב מעונות", "result": "match"}, {"check": "milestone_column", "detail": "8.5", "result": "match"}, { |

## 15. Derived segment ↔ exercise links

```sql
SELECT link_type, method, count(*) FROM activity_links GROUP BY 1,2 ORDER BY 1;
```

| link_type | method | count |
| --- | --- | --- |
| exact_activity | title_similarity | 205 |
| parent_guidance | role_rule | 34 |
| requires_review | title_similarity | 196 |

## 16. Development domains (from the scale chart)

```sql
SELECT coalesce(development_domain, '(none)') AS domain, count(*) FROM milestones GROUP BY 1 ORDER BY 1;
```

| domain | count |
| --- | --- |
| (none) | 9 |
| fine_motor | 11 |
| gross_motor | 11 |
| language | 16 |
| social | 8 |

## 17. PDF page references for milestone 1.1

```sql
SELECT r.language, sd.document_key, r.pdf_page_index, r.printed_page_number, r.section_heading FROM source_references r JOIN source_versions sv ON sv.id = r.source_version_id JOIN source_documents sd ON sd.id = sv.source_document_id JOIN milestones m ON m.id = r.milestone_id WHERE m.milestone_code='1.1' AND r.activity_id IS NULL ORDER BY 1;
```

| language | document_key | pdf_page_index | printed_page_number | section_heading |
| --- | --- | --- | --- | --- |
| he | handbook-he | 8 | 8 | עוקב במבט אחרי עצם נע / פנים |
| ar | handbook-ar | 6 | 8 | يتتبع بنظره جسما متحركاً / وجها |

## 18. Milestone translations flagged for editorial review

```sql
SELECT m.milestone_code, t.language, t.content_review_status FROM milestone_translations t JOIN milestones m ON m.id = t.milestone_id WHERE t.source_origin='pdf' AND t.is_primary AND t.content_review_status <> 'unreviewed' ORDER BY 1,2;
```

| milestone_code | language | content_review_status |
| --- | --- | --- |
| 2.1 | he | needs_review |
| 2.1 | ar | needs_review |
| 2.7 | he | needs_review |
| 3.2 | he | needs_review |
| 3.2 | ar | needs_review |

## 19. Unresolved import issues by severity

```sql
SELECT severity, count(*) FROM import_issues WHERE NOT is_resolved GROUP BY 1 ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END;
```

| severity | count |
| --- | --- |
| error | 59 |
| warning | 185 |
| info | 28 |

## 20. Unresolved import issues by code

```sql
SELECT severity, code, count(*) FROM import_issues WHERE NOT is_resolved GROUP BY 1,2 ORDER BY 1,3 DESC;
```

| severity | code | count |
| --- | --- | --- |
| info | milestone_name_variant | 11 |
| info | excluded_column | 9 |
| info | auxiliary_sheet_audit | 2 |
| info | pdf_non_milestone_pages | 2 |
| info | domain_not_in_scale_chart | 1 |
| info | hyperlink_text_mismatch | 1 |
| info | video_language_check_incomplete | 1 |
| info | outside_merged_range | 1 |
| warning | video_title_mismatch | 66 |
| warning | missing_video_mapping | 53 |
| warning | milestone_column_shifted | 26 |
| warning | missing_video | 16 |
| warning | duplicate_video_id | 10 |
| warning | intro_matches_other_milestone | 5 |
| warning | pdf_header_warning | 4 |
| warning | pdf_page_number_warning | 2 |
| warning | exercise_count_mismatch | 1 |
| warning | alternative_link_in_cross_sheet | 1 |
| warning | pdf_partial_extraction | 1 |
| error | video_title_mismatch | 55 |
| error | invalid_video_identifier | 2 |
| error | video_unavailable | 2 |

## 21. Source documents and versions

```sql
SELECT sd.document_key, sd.source_type, sd.language, sv.version_number, sv.page_count, sv.import_status, left(sv.checksum, 16) AS checksum FROM source_documents sd JOIN source_versions sv ON sv.source_document_id = sd.id ORDER BY 1, 4;
```

| document_key | source_type | language | version_number | page_count | import_status | checksum |
| --- | --- | --- | --- | --- | --- | --- |
| handbook-ar | PDF | ar | 1 | 145 | published | 4445aad18bf32410 |
| handbook-he | PDF | he | 1 | 147 | published | d69f2b4eb1b98697 |
| video-workbook-ar | XLSX | multilingual | 1 | ∅ | published | 8b83d9e6df2ad892 |
| video-workbook-he | XLSX | multilingual | 1 | ∅ | published | 46ee07b4cc97496b |

## 22. Import jobs

```sql
SELECT job_type, status, count(*) FROM import_jobs GROUP BY 1,2 ORDER BY 1,2;
```

| job_type | status | count |
| --- | --- | --- |
| video_workbook | parsing | 1 |
| video_workbook | published | 6 |
| pdf_handbook | published | 12 |
