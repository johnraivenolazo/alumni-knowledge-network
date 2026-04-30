export interface User {
	id: string;
	name: string;
	email: string;
	role: string;
	industry?: string;
	batch?: string;
	bio?: string;
	profilePic?: string;
}

export interface Post {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	author?: User;
}

export interface MentorshipRequest {
	id: string;
	studentId: string;
	alumniId: string;
	message: string;
	status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
	createdAt: string;
	student: User;
	alumni: User;
}
