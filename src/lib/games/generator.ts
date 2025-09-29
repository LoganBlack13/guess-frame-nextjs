import {
  createOrGetMovie,
} from '../database';
import {
  MovieFrame,
  MovieMetadata,
  createTMDBClient,
} from '../tmdb';

export interface QuizGenerationOptions {
  roomCode: string;
  frameCount: number;
  difficulty: 'easy' | 'normal' | 'hard';
  genres?: string[];
  excludeGenres?: string[];
  yearRange?: {
    min: number;
    max: number;
  };
  language?: string;
}

export interface QuizGenerationResult {
  gameId: string;
  frames: MovieFrame[];
  movies: MovieMetadata[];
  totalMovies: number;
  totalFrames: number;
}

export class QuizGenerator {
  private tmdbClient: ReturnType<typeof createTMDBClient>;
  private cache = new Map<string, MovieMetadata>();

  constructor(apiKey: string) {
    this.tmdbClient = createTMDBClient(apiKey);
  }

  // Nouvelle méthode pour générer un quiz depuis la base de données
  async generateQuizFromDatabase(options: {
    roomCode: string;
    frameCount: number;
    difficulty: 'easy' | 'normal' | 'hard';
    genres?: string[];
    yearRange?: { min: number; max: number };
  }): Promise<QuizGenerationResult> {
    const { roomCode, frameCount, difficulty, genres, yearRange } = options;

    console.log('🎬 Generating quiz from database with options:', {
      roomCode,
      frameCount,
      difficulty,
      genres,
      yearRange,
    });

    try {
      // Récupérer des films depuis la base de données
      const { prisma } = await import('../prisma');

      const whereClause: { releaseDate?: { gte: Date; lte: Date } } = {};

      // Note: Les genres sont stockés en JSON, donc on ne peut pas filtrer directement
      // On récupérera tous les films et on filtrera côté application

      if (yearRange) {
        whereClause.releaseDate = {
          gte: new Date(yearRange.min, 0, 1),
          lte: new Date(yearRange.max, 11, 31),
        };
      }

      const movies = await prisma.movie.findMany({
        where: whereClause,
        take: frameCount * 2, // Prendre plus de films pour avoir du choix
        orderBy: { createdAt: 'desc' },
      });

      console.log(`📚 Found ${movies.length} movies in database`);

      if (movies.length === 0) {
        throw new Error(
          'No movies found in database. Please fetch some movies first using the admin panel.'
        );
      }

      // Filtrer par genres si spécifié (côté application)
      let filteredMovies = movies;
      if (genres && genres.length > 0) {
        filteredMovies = movies.filter((movie) => {
          try {
            const movieGenres = JSON.parse(movie.genres || '[]');
            return genres.some((genre) => movieGenres.includes(genre));
          } catch {
            return false;
          }
        });
      }

      // Sélectionner aléatoirement les films pour le quiz
      const shuffledMovies = this.shuffleArray(filteredMovies).slice(
        0,
        frameCount
      );

      // Créer les frames avec des scènes de films (stills) au lieu de posters
      const frames: MovieFrame[] = shuffledMovies.map((movie, index) => {
        // Utiliser les stills (scènes) si disponibles, sinon les backdrops
        const stills = movie.stillsUrls ? JSON.parse(movie.stillsUrls) : [];
        const imageUrl =
          stills.length > 0
            ? stills[0]
            : movie.backdropUrl || movie.posterUrl || '';

        return {
          movieId: movie.id.toString(),
          imageUrl,
          aspectRatio: stills.length > 0 ? 16 / 9 : 1.5, // 16:9 pour les scènes, 1.5 pour les posters
          isScene: stills.length > 0, // true si c'est une scène, false si c'est un poster
          order: index,
        };
      });

      console.log(`🎯 Selected ${frames.length} frames for quiz`);

      return {
        gameId: 'temp-game-id',
        frames,
        movies: shuffledMovies.map((movie) => ({
          id: movie.id,
          title: movie.title,
          releaseYear: movie.releaseDate ? movie.releaseDate.getFullYear() : 0,
          genre: movie.genres, // JSON string
          posterUrl: movie.posterUrl || '',
          aspectRatio: 1.5,
          isScene: true,
        })),
        totalMovies: shuffledMovies.length,
        totalFrames: frames.length,
      };
    } catch (error) {
      console.error('❌ Failed to generate quiz from database:', error);
      throw error;
    }
  }

  // Nouvelle méthode pour récupérer et stocker des films par batch
  async fetchAndStoreMovies(settings: {
    pages: number;
    genres: string[];
    years: { min: number; max: number };
    difficulty: 'easy' | 'medium' | 'hard';
  }): Promise<{ totalFetched: number; totalSaved: number }> {
    console.log('🎬 Starting batch fetch with settings:', settings);

    let totalFetched = 0;
    let totalSaved = 0;

    try {
      // Récupérer des films par pages
      for (let page = 1; page <= settings.pages; page++) {
        console.log(`📄 Fetching page ${page}/${settings.pages}...`);

        const response = await this.tmdbClient.discoverMovies({
          page,
          withGenres:
            settings.genres.length > 0 ? settings.genres.join(',') : undefined,
          year: Math.floor((settings.years.min + settings.years.max) / 2), // Année moyenne
          sortBy: 'popularity.desc',
          voteAverageGte: 6.0,
          voteCountGte: 100,
          withoutGenres: '99,10770', // Exclure documentaires et TV
        });

        const movies = response.results || [];
        totalFetched += movies.length;
        console.log(`📊 Page ${page} returned ${movies.length} movies`);

        // Traiter chaque film pour récupérer les détails et images
        const movieMetadataList: Array<{ tmdbId: number; title: string; overview: string; releaseDate: string; genres: number[]; runtime: number; tagline: string; languages: string[]; posterUrl: string; backdropUrl: string; stillsUrls: string[] }> = [];
        for (const movie of movies) {
          try {
            const [details, images] = await Promise.all([
              this.tmdbClient.getMovieDetails(movie.id),
              this.tmdbClient.getMovieImages(movie.id),
            ]);

            const metadata = this.tmdbClient.transformMovieToMetadata(
              details,
              images
            );

            // Vérifier qu'on a des images utilisables
            if (this.tmdbClient.hasLandscapeImages(metadata)) {
              movieMetadataList.push(metadata);
            }
          } catch (error) {
            console.warn(
              `Failed to fetch details for movie ${movie.id}:`,
              error
            );
          }
        }

        // Sauvegarder les films en base
        const savedMovies = await this.saveMoviesInBatches(movieMetadataList);
        totalSaved += savedMovies.length;

        console.log(`💾 Saved ${savedMovies.length} movies from page ${page}`);

        // Petite pause entre les pages pour éviter de surcharger l'API
        if (page < settings.pages) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `✅ Batch fetch completed: ${totalFetched} fetched, ${totalSaved} saved`
      );
      return { totalFetched, totalSaved };
    } catch (error) {
      console.error('❌ Batch fetch failed:', error);
      throw error;
    }
  }

  // Génère un quiz complet
  async generateQuiz(
    options: QuizGenerationOptions
  ): Promise<QuizGenerationResult> {
    const {
      roomCode,
      frameCount,
      difficulty,
      genres,
      excludeGenres,
      yearRange,
      language,
    } = options;

    console.log('🎬 QuizGenerator.generateQuiz called with options:', {
      roomCode,
      frameCount,
      difficulty,
      genres,
      excludeGenres,
      yearRange,
      language,
    });

    // 1. Récupérer des films populaires
    console.log('🔍 Fetching movies for quiz...');
    const movies = await this.fetchMoviesForQuiz({
      count: Math.max(frameCount * 2, 20), // Récupérer plus de films pour avoir du choix
      difficulty,
      genres,
      excludeGenres,
      yearRange,
      language,
    });

    console.log('📚 Found movies:', movies.length);

    // 2. Sélectionner les meilleurs films
    const selectedMovies = this.selectBestMovies(
      movies,
      frameCount,
      difficulty
    );

    // 3. Générer les frames pour chaque film
    const allFrames: MovieFrame[] = [];
    const usedMovies: MovieMetadata[] = [];

    for (const movie of selectedMovies) {
      const frames = this.tmdbClient.generateMovieFrames(movie, 1); // 1 frame par film
      if (frames.length > 0) {
        allFrames.push(...frames);
        usedMovies.push(movie);
      }
    }

    // 4. Mélanger les frames
    const shuffledFrames = this.shuffleArray(allFrames).slice(0, frameCount);

    // 5. Créer la partie en base (sera créé après la transaction principale)
    const game: { id: string; roomCode: string; status: string; startedAt: Date | null; completedAt: Date | null; createdAt: Date } | null = null;

    // 6. Sauvegarder les films en base par batch (déplacé après la transaction)
    // const savedMovies = await this.saveMoviesInBatches(usedMovies);

    // 7. Créer les frames de jeu (désactivé temporairement)
    // const gameFrames = await addGameFrames(
    //   game.id,
    //   shuffledFrames.map((frame, index) => ({
    //     movieId: savedMovies.find(m => m.tmdbId === frame.movieId)?.id || '',
    //     imageUrl: frame.imageUrl,
    //     aspectRatio: frame.aspectRatio,
    //     isScene: frame.isScene,
    //     order: index,
    //   }))
    // );

    // 8. Retourner les frames avec les vrais titres pour la synchronisation
    const framesWithTitles = shuffledFrames.map((frame) => {
      const movie = usedMovies.find((m) => m.tmdbId === frame.movieId);
      return {
        ...frame,
        title: movie?.title || `Movie ${frame.movieId}`,
      };
    });

    // 8. Enregistrer l'événement de génération (désactivé temporairement)
    // await addGameEvent(game.id, {
    //   type: 'game_started',
    //   data: {
    //     roomCode,
    //     playerCount: 0, // Sera mis à jour quand la partie commencera
    //     targetFrameCount: frameCount,
    //     generatedMovies: usedMovies.length,
    //     difficulty,
    //   },
    // });

    return {
      gameId: game?.id || 'temp-game-id', // ID temporaire si pas de game
      frames: framesWithTitles,
      movies: usedMovies,
      totalMovies: usedMovies.length,
      totalFrames: framesWithTitles.length,
    };
  }

  // Récupère des films pour le quiz
  private async fetchMoviesForQuiz(options: {
    count: number;
    difficulty: string;
    genres?: string[];
    excludeGenres?: string[];
    yearRange?: { min: number; max: number };
    language?: string;
  }): Promise<MovieMetadata[]> {
    const { count, difficulty, genres, excludeGenres, yearRange, language } =
      options;

    console.log('🔍 fetchMoviesForQuiz called with:', {
      count,
      difficulty,
      genres,
      excludeGenres,
      yearRange,
      language,
    });

    // Paramètres de recherche basés sur la difficulté
    const searchParams: { sort_by?: string; vote_average?: { gte: number }; with_genres?: string; year?: number } = this.getSearchParamsForDifficulty(difficulty);
    console.log('🎯 Search params for difficulty:', searchParams);

    // Ajouter les filtres optionnels
    if (genres && genres.length > 0) {
      searchParams.withGenres = genres.join(',');
    }

    if (excludeGenres && excludeGenres.length > 0) {
      searchParams.withoutGenres = excludeGenres.join(',');
    }

    if (yearRange) {
      searchParams.year = Math.floor((yearRange.min + yearRange.max) / 2);
    }

    const movies: MovieMetadata[] = [];
    let page = 1;
    const maxPages = 5;

    while (movies.length < count && page <= maxPages) {
      try {
        console.log(`📄 Fetching page ${page} from TMDB...`);
        const response = await this.tmdbClient.discoverMovies({
          ...searchParams,
          page,
        });

        console.log(
          `📊 Page ${page} returned ${response.results.length} movies`
        );

        for (const movie of response.results) {
          if (movies.length >= count) break;

          try {
            // Vérifier le cache d'abord
            const cachedMovie = this.cache.get(movie.id.toString());
            if (cachedMovie) {
              console.log(`💾 Using cached movie: ${movie.title}`);
              movies.push(cachedMovie);
              continue;
            }

            console.log(
              `🎬 Fetching details for movie: ${movie.title} (ID: ${movie.id})`
            );

            // Récupérer les détails et images
            const [details, images] = await Promise.all([
              this.tmdbClient.getMovieDetails(movie.id),
              this.tmdbClient.getMovieImages(movie.id),
            ]);

            const metadata = this.tmdbClient.transformMovieToMetadata(
              details,
              images
            );

            // Vérifier qu'on a des images utilisables
            if (this.hasUsableImages(metadata)) {
              console.log(`✅ Movie ${movie.title} has usable images`);
              this.cache.set(movie.id.toString(), metadata);
              movies.push(metadata);
            } else {
              console.log(`❌ Movie ${movie.title} has no usable images`);
            }
          } catch (error) {
            console.warn(
              `Failed to fetch details for movie ${movie.id}:`,
              error
            );
          }
        }

        page++;
      } catch (error) {
        console.error('Error fetching movies:', error);
        break;
      }
    }

    console.log(`🎯 Final result: ${movies.length} movies found`);
    return movies;
  }

  // Paramètres de recherche selon la difficulté
  private getSearchParamsForDifficulty(difficulty: string) {
    switch (difficulty) {
      case 'easy':
        return {
          sortBy: 'popularity.desc',
          voteAverageGte: 7.0,
          voteCountGte: 1000,
        };
      case 'normal':
        return {
          sortBy: 'popularity.desc',
          voteAverageGte: 6.5,
          voteCountGte: 500,
        };
      case 'hard':
        return {
          sortBy: 'vote_average.desc',
          voteAverageGte: 6.0,
          voteCountGte: 100,
        };
      default:
        return {
          sortBy: 'popularity.desc',
          voteAverageGte: 6.0,
          voteCountGte: 100,
        };
    }
  }

  // Vérifie si un film a des images utilisables
  private hasUsableImages(movie: MovieMetadata): boolean {
    return movie.images.stills.length > 0 || movie.images.backdrop !== null;
  }

  // Sélectionne les meilleurs films pour le quiz
  private selectBestMovies(
    movies: MovieMetadata[],
    frameCount: number,
    difficulty: string
  ): MovieMetadata[] {
    // Trier par qualité (score + popularité)
    const sortedMovies = movies.sort((a, b) => {
      const scoreA = this.calculateMovieScore(a, difficulty);
      const scoreB = this.calculateMovieScore(b, difficulty);
      return scoreB - scoreA;
    });

    // Prendre les meilleurs films
    return sortedMovies.slice(0, frameCount);
  }

  // Calcule un score de qualité pour un film
  private calculateMovieScore(
    movie: MovieMetadata,
    difficulty: string
  ): number {
    let score = 0;

    // Score basé sur la disponibilité d'images
    if (movie.images.stills.length > 0) score += 10;
    if (movie.images.backdrop) score += 5;

    // Score basé sur la difficulté
    switch (difficulty) {
      case 'easy':
        // Films très populaires et récents
        if (movie.images.stills.length >= 5) score += 5;
        break;
      case 'normal':
        // Films populaires avec quelques images
        if (movie.images.stills.length >= 3) score += 3;
        break;
      case 'hard':
        // Films moins connus mais avec au moins une image
        if (movie.images.stills.length >= 1) score += 2;
        break;
    }

    // Bonus pour les films avec plus d'images
    score += Math.min(movie.images.stills.length, 10);

    return score;
  }

  // Sauvegarde un film en base de données
  private async saveMovieToDatabase(movie: MovieMetadata) {
    return createOrGetMovie({
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: movie.overview,
      releaseDate: movie.releaseDate ? new Date(movie.releaseDate) : undefined,
      genres: movie.genres,
      runtime: movie.runtime,
      tagline: movie.tagline,
      languages: movie.languages,
      posterUrl: movie.images.poster || undefined,
      backdropUrl: movie.images.backdrop || undefined,
      stillsUrls: movie.images.stills,
    });
  }

  // Sauvegarde les films par batch pour éviter les timeouts
  public async saveMoviesInBatches(
    movies: MovieMetadata[],
    batchSize: number = 5
  ): Promise<Array<{ id: string; tmdbId: number; title: string; originalTitle: string; overview: string | null; releaseDate: Date | null; genres: string[]; runtime: number | null; tagline: string | null; languages: string[]; posterUrl: string | null; backdropUrl: string | null; stillsUrls: string[]; createdAt: Date; updatedAt: Date }>> {
    const savedMovies: Array<{ id: string; tmdbId: number; title: string; originalTitle: string; overview: string | null; releaseDate: Date | null; genres: string[]; runtime: number | null; tagline: string | null; languages: string[]; posterUrl: string | null; backdropUrl: string | null; stillsUrls: string[]; createdAt: Date; updatedAt: Date }> = [];

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      console.log(
        `💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(movies.length / batchSize)} (${batch.length} movies)`
      );

      try {
        const batchResults = await Promise.all(
          batch.map((movie) => this.saveMovieToDatabase(movie))
        );
        savedMovies.push(...batchResults);

        // Petite pause entre les batches pour éviter la surcharge
        if (i + batchSize < movies.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(
          `⚠️ Batch ${Math.floor(i / batchSize) + 1} failed:`,
          error
        );
        // Continuer avec les autres batches
      }
    }

    console.log(
      `✅ Saved ${savedMovies.length}/${movies.length} movies to database`
    );
    return savedMovies;
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

  // Génère un quiz rapide avec des films populaires
  async generateQuickQuiz(
    roomCode: string,
    frameCount: number = 10
  ): Promise<QuizGenerationResult> {
    return this.generateQuiz({
      roomCode,
      frameCount,
      difficulty: 'normal',
    });
  }

  // Génère un quiz personnalisé
  async generateCustomQuiz(
    roomCode: string,
    options: Partial<QuizGenerationOptions>
  ): Promise<QuizGenerationResult> {
    return this.generateQuiz({
      roomCode,
      frameCount: options.frameCount || 10,
      difficulty: options.difficulty || 'normal',
      genres: options.genres,
      excludeGenres: options.excludeGenres,
      yearRange: options.yearRange,
      language: options.language,
    });
  }
}
