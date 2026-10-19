/** Output of ingestion/pdf_structure.py (one per handbook language). */
export interface HandbookActivity {
  sequence: number;
  title: string;
  text: string;
  kind: "activity" | "parent_guidance";
  page_index: number;
  printed_page: number | null;
}

export interface HandbookMilestone {
  code: string;
  chapter: number | null;
  title: string;
  age_text: string;
  page_indexes: number[];
  printed_pages: (number | null)[];
  intro: string;
  when: string;
  how_intro: string;
  remember: string;
  curriculum_text: string;
  curriculum_pages: number[];
  activities: HandbookActivity[];
  extraction_status: "complete" | "partial";
  extraction_notes: string[];
}

export interface HandbookChapter {
  number: number;
  page_index: number;
  age_heading: string;
  intro_text: string;
  intro_page_index: number;
  printed_page: number | null;
}

export interface HandbookStructure {
  file: string;
  language: "he" | "ar";
  page_count: number;
  chapters: HandbookChapter[];
  milestones: HandbookMilestone[];
  front_matter_pages: number[];
  appendix_pages: number[];
  unclassified_pages: number[];
  image_only_pages: number[];
  warnings: { severity: string; code?: string; page_index?: number; message: string }[];
  completeness: Record<string, unknown>;
}
