import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
  if (!isObjectId(userId) || !isObjectId(teamId) || typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 400 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  const memberIds = members === undefined ? [] : members;
  const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim() || !Array.isArray(memberIds) || !memberIds.every(isObjectId)) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const uniqueMemberIds = [...new Set(memberIds)];
  const existingMembers = await User.countDocuments({ _id: { $in: uniqueMemberIds } });
  if (existingMembers !== uniqueMemberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 400 });
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: uniqueMemberIds });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{ teamName: string; totalPoints: number }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    { $unwind: { path: '$activities', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id',
        teamName: { $first: '$name' },
        totalPoints: { $sum: { $ifNull: ['$activities.points', 0] } },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
    { $project: { _id: 0, teamName: 1, totalPoints: 1 } },
  ]);

  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('_id fitnessGoal').lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const normalizedGoal = user.fitnessGoal.trim().toLowerCase();
  const goalMatches = workouts.filter((workout) => workout.focus.toLowerCase() === normalizedGoal);
  const activityFocus = recentActivity
    ? ({ run: 'endurance', cycle: 'endurance', strength: 'strength', walk: 'mobility' }[recentActivity.type.toLowerCase()] ?? recentActivity.type.toLowerCase())
    : undefined;
  const activityMatches = activityFocus ? workouts.filter((workout) => workout.focus.toLowerCase() === activityFocus) : [];
  const suggestions = goalMatches.length > 0 ? goalMatches : activityMatches;
  if (suggestions.length === 0) return [];

  const reason = goalMatches.length > 0
    ? `Recommended to support your ${user.fitnessGoal} fitness goal${recentActivity ? ` and recent ${recentActivity.type} activity` : ''}.`
    : `Recommended based on your recent ${recentActivity?.type} activity.`;
  return suggestions.map((workout) => ({ ...workout, reason }));
}

export { User };
