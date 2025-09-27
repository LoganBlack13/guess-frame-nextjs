import { TMDBAdminClient } from "./TMDBAdminClient";

export default function TMDBAdminPage() {
  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              🎬 TMDB Admin
            </h1>
            <p className="text-lg text-base-content/70">
              Gérer la base de données des films TMDB
            </p>
          </div>
          
          <TMDBAdminClient />
        </div>
      </div>
    </div>
  );
}
