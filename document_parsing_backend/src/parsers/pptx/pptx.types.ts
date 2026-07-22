export interface TableContent {
  columns: string[];
  rows: string[][];
}

export interface ImagePlaceholder {
  relationId: string;
  name: string;
  contentType: string;
}

export type SlideElementType = 'heading' | 'paragraph' | 'list' | 'table';

export interface SlideElement {
  type: SlideElementType;
  content: string | string[] | TableContent;
}

export interface PptxSlide {
  slideNumber: number;
  title: string;
  elements: SlideElement[];
  notes?: string;
  images: ImagePlaceholder[];
}

export interface PptxPresentation {
  slides: PptxSlide[];
  slideCount: number;
  author: string;
}
