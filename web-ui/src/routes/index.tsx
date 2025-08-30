import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SearchBar } from '../components/SearchBar';

function HomePage() {
  const navigate = useNavigate();

  const handleSearch = (query: string, limit: number) => {
    // Navigate to search route with query parameter and limit
    navigate({
      to: '/search',
      search: { q: query, limit },
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900">
          Video Frame Search
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Search through video frames using natural language descriptions.
          Powered by BEiT3 and FAISS vector search.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <SearchBar
          onSearch={handleSearch}
        />
      </div>

      {/* Quick Examples */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Try these examples:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            'person walking',
            'car on street',
            'beautiful landscape',
            'group of people',
            'dog playing',
            'sunny day'
          ].map((example) => (
            <button
              key={example}
              onClick={() => handleSearch(example, 20)}
              className="p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <span className="text-sm text-gray-700">"{example}"</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
