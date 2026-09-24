import {QUESTION_TYPES, ANSWER_LIMITS, MINIMUM_ANSWERS} from '../constants/QuestionTypes.js';

export class QuizValidationUtil {
    static LIMITS = {MAX_QUESTIONS: 50, MIN_QUESTIONS: 1, MAX_QUESTION_LENGTH: 200, MAX_ANSWER_LENGTH: 150};

    static validateQuiz(questions, title) {
        if (!title || title.trim() === "") return { isValid: false, error: "O título do quiz não pode estar vazio." };
        if (questions.length === 0) return { isValid: false, error: "É necessário haver pelo menos uma pergunta." };
        if (questions.length > this.LIMITS.MAX_QUESTIONS) return { isValid: false, error: `O quiz pode conter no máximo ${this.LIMITS.MAX_QUESTIONS} perguntas.` };

        for (const question of questions) {
            const questionValidation = this.validateQuestion(question);
            if (!questionValidation.isValid) return questionValidation;
        }
        return { isValid: true };
    }

    static validateQuestion(question) {
        if (!question.title || question.title.trim() === "") return { isValid: false, error: "As perguntas não podem estar vazias." };
        if (question.title.trim().length > this.LIMITS.MAX_QUESTION_LENGTH) return { isValid: false, error: `As perguntas podem ter no máximo ${this.LIMITS.MAX_QUESTION_LENGTH} caracteres.` };
        const questionType = question.type || QUESTION_TYPES.MULTIPLE_CHOICE;
        return this.validateAnswers(question.answers || [], questionType);
    }

    static validateAnswers(answers, questionType) {
        const minAnswers = MINIMUM_ANSWERS[questionType] || 1;
        const maxAnswers = ANSWER_LIMITS[questionType] || 6;

        if (answers.length < minAnswers) return { isValid: false, error: this.getMinAnswersErrorMessage(questionType, minAnswers) };
        if (answers.length > maxAnswers) return { isValid: false, error: this.getMaxAnswersErrorMessage(questionType, maxAnswers) };

        switch (questionType) {
            case QUESTION_TYPES.TEXT: return this.validateTextAnswers(answers);
            case QUESTION_TYPES.TRUE_FALSE: return this.validateTrueFalseAnswers(answers);
            case QUESTION_TYPES.SEQUENCE: return this.validateSequenceAnswers(answers);
            case QUESTION_TYPES.SLIDER: return this.validateSliderAnswers(answers);
            case QUESTION_TYPES.MULTIPLE_CHOICE:
            default: return this.validateMultipleChoiceAnswers(answers);
        }
    }

    static validateTextAnswers(answers) {
        if (answers.some(a => !a.content || a.content.trim() === "")) return { isValid: false, error: "Respostas de texto não podem estar vazias." };
        return { isValid: true };
    }

    static validateTrueFalseAnswers(answers) {
        if (answers.length !== 2) return { isValid: false, error: "Perguntas de Verdadeiro/Falso devem ter exatamente duas opções." };
        if (!answers.some(a => a.is_correct)) return { isValid: false, error: "Perguntas de Verdadeiro/Falso devem ter pelo menos uma resposta correta." };
        return { isValid: true };
    }

    static validateMultipleChoiceAnswers(answers) {
        if (answers.filter(a => a.is_correct).length === 0) return { isValid: false, error: "Cada pergunta de múltipla escolha deve ter pelo menos uma resposta correta." };
        if (answers.some(a => (!a.content || a.content.trim() === "") && a.imageId === undefined)) return { isValid: false, error: "Respostas de múltipla escolha não podem estar vazias." };
        if (answers.some(a => a.content?.trim().length > this.LIMITS.MAX_ANSWER_LENGTH && a.type === QUESTION_TYPES.TEXT)) return { isValid: false, error: `Respostas de múltipla escolha podem ter no máximo ${this.LIMITS.MAX_ANSWER_LENGTH} caracteres.` };
        return { isValid: true };
    }

    static validateSequenceAnswers(answers) {
        if (answers.some(a => !a.content || a.content.trim() === "")) return { isValid: false, error: "Respostas de sequência não podem estar vazias." };
        if (answers.some(a => a.content?.trim().length > this.LIMITS.MAX_ANSWER_LENGTH)) return { isValid: false, error: `Respostas de sequência podem ter no máximo ${this.LIMITS.MAX_ANSWER_LENGTH} caracteres.` };
        return { isValid: true };
    }

    static validateSliderAnswers(answers) {
        if (!answers || answers.length !== 1) return { isValid: false, error: "Perguntas de barra deslizante devem ter exatamente uma configuração." };
        const config = answers[0];
        if (config.correctValue === undefined || config.correctValue === null) return { isValid: false, error: "Perguntas de barra deslizante devem ter um valor correto definido." };
        if (config.min === undefined || config.max === undefined) return { isValid: false, error: "Perguntas de barra deslizante devem ter valores mínimo e máximo." };
        if (config.min >= config.max) return { isValid: false, error: "O valor mínimo deve ser menor que o valor máximo." };
        if (config.correctValue < config.min || config.correctValue > config.max) return { isValid: false, error: "O valor correto deve estar entre o mínimo e o máximo." };
        if (config.step !== undefined && config.step <= 0) return { isValid: false, error: "O valor de incremento deve ser maior que 0." };
        return { isValid: true };
    }

    static getMinAnswersErrorMessage(questionType, minAnswers) {
        switch (questionType) {
            case QUESTION_TYPES.TEXT: return "Perguntas de texto devem ter pelo menos uma resposta aceita.";
            case QUESTION_TYPES.TRUE_FALSE: return "Perguntas de Verdadeiro/Falso devem ter exatamente duas opções.";
            case QUESTION_TYPES.SEQUENCE: return "Perguntas de sequência devem ter pelo menos duas respostas.";
            case QUESTION_TYPES.SLIDER: return "Perguntas de barra deslizante devem ter uma configuração.";
            case QUESTION_TYPES.MULTIPLE_CHOICE:
            default: return "Perguntas de múltipla escolha devem ter pelo menos duas respostas.";
        }
    }

    static getMaxAnswersErrorMessage(questionType, maxAnswers) {
        switch (questionType) {
            case QUESTION_TYPES.TEXT: return `Perguntas de texto podem ter no máximo ${maxAnswers} respostas aceitas.`;
            case QUESTION_TYPES.TRUE_FALSE: return "Perguntas de Verdadeiro/Falso devem ter exatamente duas opções.";
            case QUESTION_TYPES.SEQUENCE: return `Perguntas de sequência podem ter no máximo ${maxAnswers} respostas.`;
            case QUESTION_TYPES.SLIDER: return "Perguntas de barra deslizante podem ter apenas uma configuração.";
            case QUESTION_TYPES.MULTIPLE_CHOICE:
            default: return `Perguntas de múltipla escolha podem ter no máximo ${maxAnswers} respostas.`;
        }
    }

    static validateQuizForContext(json) {
        if (json.__type !== "QUIZZLE2") return false;
        const {title, questions} = json;
        if (!title || title.length > 100) return false;
        if (!questions || questions.length === 0) return false;
        if (questions.some(q => !q.title || q.title === "" || q.title.length > 200)) return false;

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            if (!question.type) return false;
            const questionType = question.type;
            
            if (questionType === QUESTION_TYPES.TEXT) {
                if (!question.answers || question.answers.length === 0 || question.answers.length > 10) return false;
                if (question.answers.some(a => !a.content || a.content.trim() === "")) return false;
            } else if (questionType === QUESTION_TYPES.TRUE_FALSE) {
                if (!question.answers || question.answers.length !== 2) return false;
                if (question.answers.some(a => typeof a.is_correct !== 'boolean')) return false;
                if (!question.answers.some(a => a.is_correct) || question.answers.filter(a => a.is_correct).length !== 1) return false;
            } else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
                if (!question.answers || question.answers.length < 2 || question.answers.length > 6) return false;
                if (question.answers.some(a => typeof a.is_correct !== 'boolean')) return false;
                if (question.answers.filter(a => a.is_correct).length === 0) return false;
                if (question.answers.some(a => !a.content || a.content.trim() === "")) return false;
            } else if (questionType === QUESTION_TYPES.SEQUENCE) {
                if (!question.answers || question.answers.length < 2 || question.answers.length > 8) return false;
                if (question.answers.some(a => !a.content || a.content.trim() === "")) return false;
            } else if (questionType === QUESTION_TYPES.SLIDER) {
                if (!question.answers || question.answers.length !== 1) return false;
                const cfg = question.answers[0];
                if (cfg.correctValue == null || cfg.min == null || cfg.max == null) return false;
                if (cfg.min >= cfg.max || cfg.correctValue < cfg.min || cfg.correctValue > cfg.max) return false;
            } else {
                return false;
            }
        }
        return true;
    }
}