import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus?: string;
  minutes?: number;
  reason?: string;
};

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then((result) => {
        if (active) setSuggestions(result.suggestions);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {hasError ? (
          <p role="alert">Unable to load workout suggestions.</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions found.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item px-0" key={suggestion._id ?? `${suggestion.title}-${index}`}>
                <strong>{suggestion.title}</strong>
                {suggestion.focus && <span> ({suggestion.focus})</span>}
                {suggestion.minutes !== undefined && <span>, {suggestion.minutes} minutes</span>}
                {suggestion.reason && <p className="mb-0 mt-1">{suggestion.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
