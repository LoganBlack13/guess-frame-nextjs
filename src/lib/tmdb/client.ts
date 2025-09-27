import { 
  TMDBMovie, 
  TMDBMovieDetails, 
  TMDBImagesResponse, 
  TMDBDiscoverResponse,
  TMDBConfiguration,
  MovieMetadata,
  MovieFrame,
  TMDBClientConfig
} from './types';

export class TMDBClient {
  private config: TMDBClientConfig;
  private baseUrl: string;

  constructor(config: TMDBClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Ajouter les paramètres par défaut
    const searchParams = new URLSearchParams({
      api_key: this.config.apiKey,
      language: this.config.language,
      region: this.config.region,
      ...params
    });
    
    url.search = searchParams.toString();

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getConfiguration(): Promise<TMDBConfiguration> {
    return this.makeRequest<TMDBConfiguration>('/configuration');
  }

  async discoverMovies(params: {
    page?: number;
    sortBy?: string;
    withGenres?: string;
    year?: number;
    voteAverageGte?: number;
    voteCountGte?: number;
    withoutGenres?: string;
  } = {}): Promise<TMDBDiscoverResponse> {
    const searchParams: Record<string, string> = {};
    
    if (params.page) searchParams.page = params.page.toString();
    if (params.sortBy) searchParams.sort_by = params.sortBy;
    if (params.withGenres) searchParams.with_genres = params.withGenres;
    if (params.year) searchParams.year = params.year.toString();
    if (params.voteAverageGte) searchParams['vote_average.gte'] = params.voteAverageGte.toString();
    if (params.voteCountGte) searchParams['vote_count.gte'] = params.voteCountGte.toString();
    if (params.withoutGenres) searchParams.without_genres = params.withoutGenres;

    return this.makeRequest<TMDBDiscoverResponse>('/discover/movie', searchParams);
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovieDetails> {
    return this.makeRequest<TMDBMovieDetails>(`/movie/${movieId}`);
  }

  async getMovieImages(movieId: number): Promise<TMDBImagesResponse> {
    return this.makeRequest<TMDBImagesResponse>(`/movie/${movieId}/images`);
  }

  async searchMovies(query: string, page: number = 1): Promise<TMDBDiscoverResponse> {
    return this.makeRequest<TMDBDiscoverResponse>('/search/movie', {
      query,
      page: page.toString()
    });
  }

  // Méthodes utilitaires pour transformer les données TMDB
  transformMovieToMetadata(movie: TMDBMovieDetails, images: TMDBImagesResponse): MovieMetadata {
    return {
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview,
      releaseDate: movie.release_date,
      genres: movie.genres.map(g => g.name),
      runtime: movie.runtime,
      tagline: movie.tagline,
      languages: movie.spoken_languages.map(l => l.english_name),
      images: {
        poster: movie.poster_path ? `${this.config.imageBaseUrl}w1280${movie.poster_path}` : null,
        backdrop: movie.backdrop_path ? `${this.config.imageBaseUrl}w1280${movie.backdrop_path}` : null,
        stills: (images.stills || [])
          .filter(img => img.iso_639_1 === null || img.iso_639_1 === this.config.language)
          .sort((a, b) => b.vote_average - a.vote_average)
          .slice(0, 10)
          .map(img => `${this.config.imageBaseUrl}w1280${img.file_path}`)
      }
    };
  }

  // Génère des frames pour un film en évitant les posters
  generateMovieFrames(movie: MovieMetadata, count: number = 5): MovieFrame[] {
    const frames: MovieFrame[] = [];
    
    // Utiliser les stills en priorité (scènes du film) - format paysage uniquement
    const stills = movie.images.stills.filter(url => {
      // Filtrer pour s'assurer que ce sont des stills (pas des posters)
      return url.includes('still') || url.includes('backdrop');
    });
    
    if (stills.length > 0) {
      const selectedStills = this.shuffleArray(stills).slice(0, Math.min(count, stills.length));
      
      selectedStills.forEach((imageUrl, index) => {
        frames.push({
          movieId: movie.tmdbId,
          imageUrl,
          aspectRatio: 16/9, // Les stills sont généralement en 16:9
          isScene: true
        });
      });
    }
    
    // Si pas assez de stills, utiliser des backdrops (mais JAMAIS de posters)
    if (frames.length < count && movie.images.backdrop) {
      // Vérifier que ce n'est pas un poster
      if (!movie.images.backdrop.includes('poster') && !movie.images.backdrop.includes('w342') && !movie.images.backdrop.includes('w500')) {
        frames.push({
          movieId: movie.tmdbId,
          imageUrl: movie.images.backdrop,
          aspectRatio: 16/9,
          isScene: true
        });
      }
    }
    
    return frames.slice(0, count);
  }

  // Mélange un tableau de manière aléatoire
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Récupère des films populaires pour générer un quiz
  async getPopularMoviesForQuiz(count: number = 10): Promise<MovieMetadata[]> {
    const movies: MovieMetadata[] = [];
    let page = 1;
    
    while (movies.length < count && page <= 5) { // Limite à 5 pages max
      const response = await this.discoverMovies({
        page,
        sortBy: 'popularity.desc',
        voteAverageGte: 6.0,
        voteCountGte: 100,
        withoutGenres: '99,10770' // Exclure documentaires et TV
      });
      
      for (const movie of response.results) {
        if (movies.length >= count) break;
        
        try {
          const [details, images] = await Promise.all([
            this.getMovieDetails(movie.id),
            this.getMovieImages(movie.id)
          ]);
          
          const metadata = this.transformMovieToMetadata(details, images);
          
          // Vérifier qu'on a des images utilisables (stills ou backdrops uniquement)
          const hasUsableImages = this.hasLandscapeImages(metadata);
          if (hasUsableImages) {
            movies.push(metadata);
          }
        } catch (error) {
          console.warn(`Failed to fetch details for movie ${movie.id}:`, error);
        }
      }
      
      page++;
    }
    
    return movies;
  }

  // Vérifie si un film a des images au format paysage utilisables
  hasLandscapeImages(movie: MovieMetadata): boolean {
    // Vérifier les stills (scènes du film)
    const validStills = movie.images.stills.filter(url => 
      url.includes('still') || url.includes('backdrop')
    );
    
    // Vérifier le backdrop (mais pas de poster)
    const validBackdrop = movie.images.backdrop && 
      !movie.images.backdrop.includes('poster') && 
      !movie.images.backdrop.includes('w342') && 
      !movie.images.backdrop.includes('w500');
    
    return validStills.length > 0 || !!validBackdrop;
  }
}
