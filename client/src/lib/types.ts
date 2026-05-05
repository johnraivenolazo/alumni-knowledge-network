export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserType = 'STUDENT' | 'ALUMNI';

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

export interface Post {
	id: string;
	title: string;
	content: string;
	category: string;
	createdAt: string;
	author?: User;
	comments?: Comment[];
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
}
