// Types pour l'API TMDB
export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: Array<{
    id: number;
    name: string;
  }>;
  production_companies: Array<{
    id: number;
    name: string;
    logo_path: string | null;
  }>;
  spoken_languages: Array<{
    english_name: string;
    iso_639_1: string;
    name: string;
  }>;
  runtime: number;
  tagline: string;
}

export interface TMDBImage {
  aspect_ratio: number;
  height: number;
  width: number;
  iso_639_1: string | null;
  file_path: string;
  vote_average: number;
  vote_count: number;
}

export interface TMDBImagesResponse {
  id: number;
  backdrops: TMDBImage[];
  logos: TMDBImage[];
  posters: TMDBImage[];
  stills: TMDBImage[];
}

export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBConfiguration {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}

// Types pour notre application
export interface MovieMetadata {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  genres: string[];
  runtime: number;
  tagline: string;
  languages: string[];
  images: {
    poster: string | null;
    backdrop: string | null;
    stills: string[];
  };
}

export interface MovieFrame {
  movieId: number;
  imageUrl: string;
  aspectRatio: number;
  isScene: boolean; // true si c'est une scène, false si c'est un poster
}

export interface TMDBClientConfig {
  apiKey: string;
  baseUrl: string;
  imageBaseUrl: string;
  language: string;
  region: string;
}
