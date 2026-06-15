import React, { useMemo } from "react";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { images } from "@/constants/images";
import { getCurriculumConceptsForLesson } from "@/data/curriculum";
import type { Lesson, Unit, WordBankOption } from "@/types/learning";

type PreviewPhrase = {
	value: string;
	pronunciation?: string;
	translation?: string;
};

interface LessonTeachingPreviewProps {
	lesson: Lesson;
	unit?: Unit;
}

const compact = (value?: string) => value?.trim() || undefined;

const addPhrase = (
	phrases: PreviewPhrase[],
	seen: Set<string>,
	phrase?: PreviewPhrase
) => {
	const value = compact(phrase?.value);
	if (!value || seen.has(value)) return;

	seen.add(value);
	phrases.push({
		value,
		pronunciation: compact(phrase?.pronunciation),
		translation: compact(phrase?.translation),
	});
};

const findWordBankOption = (
	wordBank: WordBankOption[] | undefined,
	value: string
) => wordBank?.find((option) => option.value === value);

const getPreviewPhrases = (lesson: Lesson) => {
	const phrases: PreviewPhrase[] = [];
	const seen = new Set<string>();

	for (const exercise of lesson.exercises ?? []) {
		if (phrases.length >= 5) break;

		if (exercise.type === "fill-in-the-blank") {
			const option = findWordBankOption(exercise.wordBank, exercise.correctAnswer);
			addPhrase(phrases, seen, {
				value: option?.label ?? option?.value ?? exercise.correctAnswer,
				pronunciation: option?.pronunciation,
				translation: option?.translation,
			});
			continue;
		}

		if (exercise.type === "matching-pairs") {
			for (const pair of exercise.pairs ?? []) {
				if (phrases.length >= 5) break;
				addPhrase(phrases, seen, {
					value: pair.left,
					translation: pair.right,
				});
			}
			continue;
		}

		addPhrase(phrases, seen, {
			value: exercise.correctAnswer,
		});
	}

	return phrases;
};

export default function LessonTeachingPreview({
	lesson,
	unit,
}: LessonTeachingPreviewProps) {
	const concepts = useMemo(
		() => getCurriculumConceptsForLesson(lesson.id),
		[lesson.id]
	);
	const previewPhrases = useMemo(() => getPreviewPhrases(lesson), [lesson]);
	const mainGoal =
		lesson.canDoStatement ?? lesson.goals[0] ?? unit?.canDoGoal ?? lesson.description;
	const teachingFocus =
		lesson.teachingFocus ??
		concepts[0]?.explanationHint ??
		concepts[0]?.description ??
		lesson.goals[1];
	const primaryConcept = concepts[0];
	const conceptHint =
		primaryConcept?.explanationHint ??
		primaryConcept?.description ??
		primaryConcept?.reviewPrompt;

	return (
		<View className="gap-4">
			<View className="rounded-2xl border border-[#D7FFB8] bg-[#F5FFE8] p-4">
				<View className="flex-row items-start gap-3">
					<View className="w-9 h-9 rounded-full bg-[#58CC02] items-center justify-center">
						<Image
							source={images.appIconTarget}
							className="w-5 h-5"
							contentFit="contain"
						/>
					</View>
					<View className="flex-1">
						<Text className="font-poppins-bold text-[11px] uppercase tracking-wider text-[#58A700]">
							Can-do goal
						</Text>
						<Text className="font-poppins-bold text-[15px] text-neutral-primary leading-[21px] mt-1">
							{mainGoal}
						</Text>
						{teachingFocus ? (
							<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-2">
								{teachingFocus}
							</Text>
						) : null}
					</View>
				</View>
			</View>

			{previewPhrases.length > 0 ? (
				<View>
					<Text className="font-poppins-bold text-[13px] text-neutral-primary uppercase tracking-wider mb-2.5">
						New phrases
					</Text>
					<View className="flex-row flex-wrap gap-2">
						{previewPhrases.map((phrase) => (
							<View
								key={phrase.value}
								className="bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-2.5"
								style={{ minWidth: 118 }}
							>
								<Text className="font-poppins-bold text-[15px] text-neutral-primary leading-[20px]">
									{phrase.value}
								</Text>
								{phrase.pronunciation ? (
									<Text className="font-poppins-semibold text-[11px] text-[#1CB0F6] mt-0.5">
										{phrase.pronunciation}
									</Text>
								) : null}
								{phrase.translation ? (
									<Text className="font-poppins text-[11px] text-neutral-secondary mt-0.5">
										{phrase.translation}
									</Text>
								) : null}
							</View>
						))}
					</View>
				</View>
			) : null}

			{concepts.length > 0 ? (
				<View className="rounded-2xl border border-[#DDF4FF] bg-[#F4FBFF] p-4">
					<View className="flex-row items-center gap-2 mb-2">
						<Feather name="info" size={15} color="#1CB0F6" />
						<Text className="font-poppins-bold text-[13px] text-[#0D90D0]">
							Pattern to notice
						</Text>
					</View>
					<Text className="font-poppins-bold text-[14px] text-neutral-primary">
						{primaryConcept?.title}
					</Text>
					{conceptHint ? (
						<Text className="font-poppins text-[12px] text-neutral-secondary leading-[18px] mt-1.5">
							{conceptHint}
						</Text>
					) : null}
					<View className="flex-row flex-wrap gap-1.5 mt-3">
						{concepts.slice(0, 3).map((concept) => (
							<View
								key={concept.id}
								className="px-2.5 py-1 rounded-full bg-white border border-[#DDF4FF]"
							>
								<Text className="font-poppins-semibold text-[10px] text-[#1CB0F6]">
									{concept.title}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}
		</View>
	);
}
