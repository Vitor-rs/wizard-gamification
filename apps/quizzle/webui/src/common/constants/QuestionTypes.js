import {faListUl, faToggleOn, faKeyboard, faSort, faSliders} from "@fortawesome/free-solid-svg-icons";

export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple-choice',
    TRUE_FALSE: 'true-false',
    TEXT: 'text',
    SEQUENCE: 'sequence',
    SLIDER: 'slider'
};

export const DEFAULT_QUESTION_TYPE = QUESTION_TYPES.MULTIPLE_CHOICE;

export const QUESTION_TYPE_CONFIG = [
    {type: QUESTION_TYPES.MULTIPLE_CHOICE, icon: faListUl, name: 'Múltipla Escolha', description: 'Jogadores escolhem entre opções predefinidas'},
    {type: QUESTION_TYPES.TRUE_FALSE, icon: faToggleOn, name: 'Verdadeiro/Falso', description: 'Jogadores escolhem entre Verdadeiro ou Falso'},
    {type: QUESTION_TYPES.TEXT, icon: faKeyboard, name: 'Digitação de Texto', description: 'Jogadores digitam a resposta em texto'},
    {type: QUESTION_TYPES.SEQUENCE, icon: faSort, name: 'Ordenar Sequência', description: 'Jogadores colocam as respostas na ordem correta'},
    {type: QUESTION_TYPES.SLIDER, icon: faSliders, name: 'Barra Deslizante', description: 'Jogadores estimam um valor na régua'}
];

const getQuestionTypeConfig = (type) => QUESTION_TYPE_CONFIG.find(config => config.type === type) || QUESTION_TYPE_CONFIG[0];
export const getQuestionTypeIcon = (type) => getQuestionTypeConfig(type).icon;
export const getQuestionTypeName = (type) => getQuestionTypeConfig(type).name;

export const getDefaultAnswersForType = (type) => {
    switch (type) {
        case QUESTION_TYPES.TRUE_FALSE: return [{type: QUESTION_TYPES.TEXT, content: 'Verdadeiro', is_correct: false}, {type: QUESTION_TYPES.TEXT, content: 'Falso', is_correct: false}];
        case QUESTION_TYPES.TEXT: return [{content: ''}];
        case QUESTION_TYPES.SEQUENCE: return [];
        case QUESTION_TYPES.SLIDER: return [{correctValue: 50, min: 0, max: 100, step: 1, answerMargin: 'medium'}];
        case QUESTION_TYPES.MULTIPLE_CHOICE:
        default: return [];
    }
};

export const ANSWER_LIMITS = {
    [QUESTION_TYPES.MULTIPLE_CHOICE]: 6,
    [QUESTION_TYPES.TRUE_FALSE]: 2,
    [QUESTION_TYPES.TEXT]: 10,
    [QUESTION_TYPES.SEQUENCE]: 8,
    [QUESTION_TYPES.SLIDER]: 1
};

export const MINIMUM_ANSWERS = {
    [QUESTION_TYPES.MULTIPLE_CHOICE]: 2,
    [QUESTION_TYPES.TRUE_FALSE]: 2,
    [QUESTION_TYPES.TEXT]: 1,
    [QUESTION_TYPES.SEQUENCE]: 2,
    [QUESTION_TYPES.SLIDER]: 1
};

export const SLIDER_MARGIN_CONFIG = {
    none: { label: 'Nenhuma', description: 'Apenas a resposta exata é aceita', factor: 0 },
    low: { label: 'Baixa', description: 'Baixa tolerância a desvios', factor: 0.05 },
    medium: { label: 'Média', description: 'Tolerância moderada', factor: 0.1 },
    high: { label: 'Alta', description: 'Alta tolerância a desvios', factor: 0.2 },
    maximum: { label: 'Máxima', description: 'A resposta mais próxima ganha pontos parciais', factor: 0.4 }
};