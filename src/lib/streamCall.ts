export const sanitizeStreamIdPart = (value: string) =>
	value.replace(/[^a-zA-Z0-9-_]/g, "");

export const buildLessonCallId = (lessonId: string, userId: string) =>
	`lesson-${sanitizeStreamIdPart(lessonId)}-${sanitizeStreamIdPart(userId)}`.slice(0, 64);

export const isSafeStreamId = (value: string) =>
	/^[a-zA-Z0-9-_]{1,64}$/.test(value);
