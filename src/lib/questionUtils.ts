import type { Question } from "@/lib/types";

export function selectUniformQuestions(questions: Question[], limit: number = 100): Question[] {
    if (questions.length <= limit) {
        // If we have fewer than or equal to the limit, just return shuffled array
        const array = [...questions];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Group questions by topic
    const questionsByTopic: Record<string, Question[]> = {};
    for (const q of questions) {
        // Assign a default topic if missing
        const topic = q.topic || "General";
        if (!questionsByTopic[topic]) {
            questionsByTopic[topic] = [];
        }
        questionsByTopic[topic].push(q);
    }

    const topics = Object.keys(questionsByTopic);

    // Shuffle questions within each topic so that popping them is random
    for (const topic of topics) {
        const array = questionsByTopic[topic];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    const selectedQuestions: Question[] = [];

    // Distribute the count as evenly as possible among topics
    let remaining = limit;

    // round-robin selection
    let activeTopics = [...topics];

    while (remaining > 0 && activeTopics.length > 0) {
        for (let i = 0; i < activeTopics.length; i++) {
            if (remaining === 0) break;
            const topic = activeTopics[i];
            const q = questionsByTopic[topic].pop();
            if (q) {
                selectedQuestions.push(q);
                remaining--;
            }
        }
        // Remove empty topics
        activeTopics = activeTopics.filter(topic => questionsByTopic[topic].length > 0);
    }

    // Finally, shuffle the selected questions so topics are not clustered together in round-robin order
    for (let i = selectedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedQuestions[i], selectedQuestions[j]] = [selectedQuestions[j], selectedQuestions[i]];
    }

    return selectedQuestions;
}
