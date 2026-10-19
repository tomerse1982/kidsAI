# Retrieval & answer evaluation

Generated: 2026-10-13T19:21:22.132Z · answer mode: **extractive (no LLM)** · cases: 51 · errors: 0

| Metric | Value |
|---|---|
| Milestone top-1 accuracy (in-scope) | 95.1% |
| Milestone top-3 recall (in-scope) | 100% |
| Hebrew top-1 / Arabic top-1 | 96.6% (n=29) / 91.7% (n=12) |
| Broad / specific / video-targeted top-1 | 80% / 96.9% / 100% |
| Off-topic questions refused (not_covered) | 100% |
| Near-domain questions the handbooks do not answer, refused | 100% |
| Answers, sources and videos all in the selected language | 100% |
| In-scope questions answered | 95.1% |
| Expected sub-milestone video highlighted | 100% |
| Every shown video exists in the Excel mapping | yes |
| Citations in the question's language | 100% |

| Case | Lang | Type | Expected | Retrieved | Activities | Video | Citation |
|---|---|---|---|---|---|---|---|
| he-01 | he | broad | 1.1, 2.1 | 2.1 ✅ | 2.1-E6, 2.1-E7 | 2.1.4:hck-0i9EgeI:he/educator | handbook-he p.18 |
| he-02 | he | specific | 1.2, 2.2 | 1.2 ✅ | 1.2-E7, 1.2-E1 | 1.2.7:ti_D8_ACSfA:he/educator | handbook-he p.10 |
| he-03 | he | specific | 1.3 | 1.3 ✅ | 1.3-E2, 1.3-E3 | 1.3.1:nz7mK-qO_5s:he/educator | handbook-he p.12 |
| he-04 | he | specific | 1.4, 2.7 | 1.4 ✅ | 1.4-E3, 1.4-E9 | 1.4.4:BNi8TQRkRds:he/educator | handbook-he p.14 |
| he-05 | he | specific | 2.5 | 2.5 ✅ | 2.5-E7, 2.5-E2 | 2.5.1:o_PHE6bfic0:he/educator | handbook-he p.26 |
| he-06 | he | specific | 2.6 | 2.6 ✅ | 2.6-E1, 2.6-E5 | 2.6.5:vUiICiMgRK0:he/educator | handbook-he p.28 |
| he-07 | he | specific | 3.1 | 3.1 ✅ | 3.1-E4, 3.1-E1 | 3.1.2:sKcJBM1Xb98:he/educator | handbook-he p.34 |
| he-08 | he | specific | 3.3 | not covered 🟡 top-3 |  | — | — |
| he-09 | he | specific | 3.4 | 3.4 ✅ | 3.4-E5, 3.4-E2 | 3.4.1:PWSkb4cXrCo:he/educator | handbook-he p.40 |
| he-10 | he | specific | 4.2 | 4.2 ✅ | 4.2-E4, 4.2-E8 | 4.2.8:DsUGbLJIcQg:he/educator | handbook-he p.46 |
| he-11 | he | specific | 4.4 | 4.4 ✅ | 4.4-E2, 4.4-E3 | 4.4.3:emIM-ON8b9U:he/educator | handbook-he p.50 |
| he-12 | he | specific | 4.7 | 4.7 ✅ | 4.7-E1, 4.7-E9 | 4.7.1:yfp4GphVIt0:he/educator | handbook-he p.56 |
| he-13 | he | specific | 4.9 | 4.9 ✅ | 4.9-E9, 4.9-E5 | 4.9.1:9iFx2q8r3LU:he/educator | handbook-he p.60 |
| he-14 | he | specific | 5.4, 5.3 | 5.4 ✅ | 5.4-E9, 5.4-E11 | 5.4.4:ngArZrN174U:he/educator | handbook-he p.72 |
| he-15 | he | specific | 5.5 | 5.5 ✅ | 5.5-E6, 5.5-E5 | 5.5.1:zWntvLA4Hbs:he/educator | handbook-he p.74 |
| he-16 | he | specific | 5.7 | 5.7 ✅ | 5.7-E4, 5.7-E7 | 5.7.5:a7YfsDZanGg:he/educator | handbook-he p.78 |
| he-17 | he | specific | 6.1 | 6.1 ✅ | 6.1-E4, 6.1-E8 | 6.1.3:1BIOc9y3FZg:he/educator | handbook-he p.82 |
| he-18 | he | specific | 6.4 | 6.4 ✅ | 6.4-E4, 6.4-E6 | 6.4.1:hbwZDos4Ag0:he/educator | handbook-he p.88 |
| he-19 | he | specific | 6.5 | 6.5 ✅ | 6.5-E5, 6.5-E4 | 6.5.1:JTd54e7yXz8:he/educator | handbook-he p.90 |
| he-20 | he | specific | 7.4 | 7.4 ✅ | 7.4-E11, 7.4-E2 | 7.4.1:sG-JmaqJPhY:he/parent | handbook-he p.108 |
| he-21 | he | specific | 7.9 | 7.9 ✅ | 7.9-E11, 7.9-E10 | 7.9.7:vXX8yVH80nA:he/parent | handbook-he p.118 |
| he-22 | he | specific | 8.3 | 8.3 ✅ | 8.3-E3, 8.3-E1 | 8.3.1:osrIH9A18nI:he/educator | handbook-he p.126 |
| he-23 | he | specific | 8.4 | 8.4 ✅ | 8.4-E3, 8.4-E1 | 8.4.1:ReMotKsqG5M:he/educator | handbook-he p.128 |
| he-24 | he | specific | 8.5, 7.8 | 8.5 ✅ | 8.5-E6, 8.5-E1 | 8.5.1:gcsUchlge9o:he/educator | handbook-he p.130 |
| he-25 | he | broad | 7.4, 7.1, 7.3, 6.7, 8.2 | 7.4 ✅ | 7.4-E11, 7.4-E2 | 7.4.1:sG-JmaqJPhY:he/parent | handbook-he p.108 |
| he-26 | he | broad | 4.1, 4.7, 5.7, 6.5, 7.8, 8.5, 3.1, 2.5, 2.6 | 4.7 ✅ | 4.7-E1, 4.7-E4 | 4.7.1:yfp4GphVIt0:he/educator | handbook-he p.56 |
| he-27 | he | video | 1.1 | 1.1 ✅ | 1.1-E1, 1.1-E2 | 1.1.3 ✅ | handbook-he p.8 |
| he-28 | he | specific | 6.3, 7.6 | 7.6 ✅ | 7.6-E14, 7.6-E6 | 7.6.1:FbjKQC1OGHM:he/parent | handbook-he p.112 |
| he-29 | he | off_topic | not covered | not covered ✅ |  | — | — |
| he-30 | he | off_topic | not covered | not covered ✅ |  | — | — |
| ar-01 | ar | broad | 1.1, 2.1 | not covered 🟡 top-3 |  | — | — |
| ar-02 | ar | broad | 7.4, 7.1, 7.3, 6.7, 8.2 | 6.7 ✅ | 6.7-E11, 6.7-E10 | 6.7.1:SCRO__Q_JbU:ar/educator | handbook-ar p.94 |
| ar-03 | ar | specific | 6.4 | 6.4 ✅ | 6.4-E5, 6.4-E2 | 6.4.1:z_moLnnl6KQ:ar/educator | handbook-ar p.88 |
| ar-04 | ar | specific | 4.2 | 4.2 ✅ | 4.2-E2, 4.2-E11 | 4.2.2:4CjISmaxfTE:ar/educator | handbook-ar p.46 |
| ar-05 | ar | specific | 8.3 | 8.3 ✅ | 8.3-E3, 8.3-E1 | 8.3.2:ZMN0SW2Jg3M:ar/educator | handbook-ar p.126 |
| ar-06 | ar | specific | 7.9 | 7.9 ✅ | 7.9-E3, 7.9-E8 | 7.9.1:mGJJDA6EDbE:ar/educator | handbook-ar p.118 |
| ar-07 | ar | specific | 4.7 | 4.7 ✅ | 4.7-E1, 4.7-E8 | — | handbook-ar p.56 |
| ar-08 | ar | specific | 4.4 | 4.4 ✅ | 4.4-E6, 4.4-E5 | 4.4.4:rj3RrOvgcB0:ar/educator | handbook-ar p.50 |
| ar-09 | ar | specific | 1.3 | 1.3 ✅ | 1.3-E3, 1.3-E2 | 1.3.1:liHZlzb63aY:ar/educator | handbook-ar p.12 |
| ar-10 | ar | specific | 6.5 | 6.5 ✅ | 6.5-E3, 6.5-E4 | 6.5.3:OPW3Gbme3ow:ar/educator | handbook-ar p.90 |
| ar-11 | ar | video | 1.1 | 1.1 ✅ | 1.1-E1, 1.1-E2 | 1.1.3 ✅ | handbook-ar p.8 |
| ar-12 | ar | off_topic | not covered | not covered ✅ |  | — | — |
| nd-he-01 | he | near_domain | not covered | not covered ✅ |  | — | — |
| nd-he-02 | he | near_domain | not covered | not covered ✅ |  | — | — |
| nd-he-03 | he | near_domain | not covered | not covered ✅ |  | — | — |
| nd-he-04 | he | near_domain | not covered | not covered ✅ |  | — | — |
| nd-he-05 | he | near_domain | not covered | not covered ✅ |  | — | — |
| nd-ar-01 | ar | near_domain | not covered | not covered ✅ |  | — | — |
| nd-ar-02 | ar | near_domain | not covered | not covered ✅ |  | — | — |
| xl-01 | he | cross_language | 6.4 | 6.4 ✅ | 6.4-E5, 6.4-E2 | 6.4.1:hbwZDos4Ag0:he/educator | handbook-he p.88 |
| xl-02 | ar | cross_language | 6.3, 7.6 | 7.6 ✅ | 7.6-E14, 7.6-E6 | 7.6.1:P1-iHO4_cxQ:ar/educator | handbook-ar p.112 |
