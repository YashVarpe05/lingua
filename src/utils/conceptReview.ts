import type { ConceptMemoryEntry, ExerciseAttempt } from "@/types/learning";

export const FOCUSED_REVIEW_PASS_SCORE = 80;
const FOCUSED_REVIEW_FRESH_MS = 7 * 86400000;
const TIMESTAMP_GRACE_MS = 1000;

export const hasFreshSuccessfulFocusedReview = (
	entry: ConceptMemoryEntry | undefined,
	now = Date.now()
) => {
	if (!entry?.lastFocusedReviewAt || entry.lastFocusedReviewScore === undefined) {
		return false;
	}

	if (entry.lastFocusedReviewScore < FOCUSED_REVIEW_PASS_SCORE) return false;
	if (now - entry.lastFocusedReviewAt > FOCUSED_REVIEW_FRESH_MS) return false;

	return entry.lastFocusedReviewAt + TIMESTAMP_GRACE_MS >= entry.lastPracticed;
};

export const isAttemptRepairedByFocusedReview = (
	attempt: ExerciseAttempt,
	conceptMemory: Record<string, ConceptMemoryEntry>
) =>
	attempt.conceptIds.some((conceptId) => {
		const entry = conceptMemory[conceptId];

		return (
			hasFreshSuccessfulFocusedReview(entry) &&
			(entry?.lastFocusedReviewAt ?? 0) > attempt.createdAt
		);
	});
