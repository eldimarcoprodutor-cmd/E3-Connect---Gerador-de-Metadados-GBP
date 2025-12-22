
export interface ImageMetadata {
  title?: string;
  subject?: string;
  rating?: string;
  description?: string;
  artist?: string;
  copyright?: string;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  userComment?: string;
}

export interface AppState {
  currentImage: string | null;
  fileName: string | null;
  mimeType: string | null;
  metadata: ImageMetadata;
  isLoading: boolean;
  error: string | null;
  addVisualTitle: boolean; // Novo campo
}

export interface AISuggestion {
  title: string;
  subject: string;
  description: string;
  tags: string[];
  rating: string;
}
