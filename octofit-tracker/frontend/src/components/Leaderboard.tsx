import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((result) => {
        if (active) setLeaderboard(result.leaderboard);
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
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {hasError ? (
          <p role="alert">Unable to load leaderboard.</p>
        ) : leaderboard === null ? (
          <p role="status">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p>No leaderboard scores yet.</p>
        ) : (
          <ul className="list-group list-group-flush">
            {leaderboard.map((entry) => (
              <li className="list-group-item d-flex justify-content-between" key={`${entry.rank}-${entry.teamName}`}>
                <span>{entry.rank}. {entry.teamName}</span>
                <span>{entry.totalPoints} points</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
