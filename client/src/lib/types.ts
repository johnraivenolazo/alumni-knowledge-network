export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserType = 'STUDENT' | 'ALUMNI';

export function displayUserType(u?: { role?: Role; userType?: UserType } | null): string {
	if (!u) return '';
	if (u.role === 'ADMIN' || u.role === 'SUPERADMIN') return 'STAFF';
	if (u.userType === 'ALUMNI') return 'ALUMNUS';
	return u.userType || '';
}

export function userTypeBadgeClass(u?: { role?: Role; userType?: UserType } | null): string {
	const label = displayUserType(u);
	switch (label) {
		case 'STAFF':
			return 'border-red-500/40 bg-red-500/15 text-red-300';
		case 'STUDENT':
			return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
		case 'ALUMNUS':
			return 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300';
		default:
			return 'border-white/10 bg-white/5 text-neutral-400';
	}
}

export function categoryBadgeClass(category?: string | null): string {
	switch ((category || '').toLowerCase()) {
		case 'general':
			return 'border-sky-500/40 bg-sky-500/15 text-sky-300';
		case 'tech':
			return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300';
		case 'career':
			return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
		case 'mentorship':
			return 'border-violet-500/40 bg-violet-500/15 text-violet-300';
		case 'events':
			return 'border-pink-500/40 bg-pink-500/15 text-pink-300';
		default:
			return 'border-white/10 bg-white/5 text-neutral-300';
	}
}

export interface User {
	id: string;
	name: string;
	email: string;
	role: Role;
	status: UserStatus;
	userType: UserType;
	industry?: string;
	batch?: string;
	bio?: string;
	profilePic?: string;
	expertise: string[];
	isExpert: boolean;
	isBanned: boolean;
}

export type ReactionType = 'WOW' | 'HELPFUL' | 'INSIGHTFUL';

export interface PostReaction {
	id: string;
	userId: string;
	type: ReactionType;
}

export interface Post {
	id: string;
	title: string;
	content: string;
	category: string;
	createdAt: string;
	author?: User;
	authorId?: string;
	comments?: Comment[];
	reactions?: PostReaction[];
}

export interface Comment {
	id: string;
	content: string;
	authorId: string;
	postId: string;
	createdAt: string;
	author?: Partial<User>;
}

export interface MentorshipRequest {
	id: string;
	studentId: string;
	alumniId: string;
	message: string;
	status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
	createdAt: string;
	student: User;
	alumni: User;
	messages?: Message[];
}

export interface Message {
	id: string;
	content: string;
	senderId: string;
	receiverId: string;
	requestId: string;
	createdAt: string;
	sender?: {
		name: string;
		profilePic?: string;
	};
}

export interface SystemStats {
	totalUsers: number;
	students: number;
	alumni: number;
	pending: number;
	industryStats: { industry: string; _count: { _all: number } }[];
	postLividity?: number;
	totalPosts?: number;
	postsLast7Days?: number;
	postsByDay?: { day: string; count: number }[];
	alumniConsistency?: number;
	studentConsistency?: number;
	mostUsedInteraction?: { type: ReactionType; count: number } | null;
	reactionBreakdown?: { type: ReactionType; count: number }[];
}
