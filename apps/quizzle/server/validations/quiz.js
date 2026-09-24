const Joi = require('joi');

module.exports.questionValidation = Joi.object({
    title: Joi.string().required().min(1).max(200)
        .custom((value, helpers) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return helpers.error('string.min');
            }
            return trimmed;
        })
        .messages({
            'string.min': 'O título da pergunta não pode estar vazio',
            'string.max': 'O título da pergunta pode ter no máximo 200 caracteres'
        }),
    type: Joi.string().valid('multiple-choice', 'true-false', 'text', 'sequence', 'slider').required(),
    timer: Joi.number().integer().min(-1).max(3600).optional()
        .messages({
            'number.min': 'O temporizador deve ser -1 (ilimitado) ou um número positivo',
            'number.max': 'O temporizador pode ter no máximo 3600 segundos (1 hora)'
        }),
    pointMultiplier: Joi.string().valid('none', 'double').optional()
        .messages({
            'any.only': 'O multiplicador de pontos deve ser "none" ou "double"'
        }),
    b64_image: Joi.string().max(10000000),
    answers: Joi.when('type', {
        is: 'slider',
        then: Joi.array().items(Joi.object({
            correctValue: Joi.number().required(),
            min: Joi.number().required(),
            max: Joi.number().required(),
            step: Joi.number().positive().optional().default(1),
            answerMargin: Joi.string().valid('none', 'low', 'medium', 'high', 'maximum').optional().default('medium'),
            type: Joi.string().optional()
        })).length(1),
        otherwise: Joi.when('type', {
        is: 'text',
        then: Joi.array().items(Joi.object({
            content: Joi.string().required().min(1).max(150)
                .custom((value, helpers) => {
                    const trimmed = value.trim();
                    if (trimmed.length === 0) {
                        return helpers.error('string.min');
                    }
                    return trimmed;
                })
                .messages({
                    'string.min': 'A resposta não pode estar vazia',
                    'string.max': 'A resposta pode ter no máximo 150 caracteres'
                })
        })).min(1).max(10),
        otherwise: Joi.when('type', {
            is: 'sequence',
            then: Joi.array().items(Joi.object({
                content: Joi.string().required().min(1).max(150)
                    .custom((value, helpers) => {
                        const trimmed = value.trim();
                        if (trimmed.length === 0) {
                            return helpers.error('string.min');
                        }
                        return trimmed;
                    })
                    .messages({
                        'string.min': 'A resposta não pode estar vazia',
                        'string.max': 'A resposta pode ter no máximo 150 caracteres'
                    }),
                order: Joi.number().integer().min(1).optional()
            })).min(2).max(8),
            otherwise: Joi.when('type', {
                is: 'true-false',
                then: Joi.array().items(Joi.object({
                type: Joi.string().valid('text', 'image').required(),
                content: Joi.string().required().min(1).max(150)
                    .custom((value, helpers) => {
                        const trimmed = value.trim();
                        if (trimmed.length === 0) {
                            return helpers.error('string.min');
                        }
                        return trimmed;
                    })
                    .messages({
                        'string.min': 'A resposta não pode estar vazia',
                        'string.max': 'A resposta pode ter no máximo 150 caracteres'
                    }),
                is_correct: Joi.boolean().required()
            })).length(2).custom((answers, helpers) => {
                const correctCount = answers.filter(a => a.is_correct).length;
                if (correctCount !== 1) {
                    return helpers.error('array.correctCount');
                }
                return answers;
            }).messages({
                'array.correctCount': 'Perguntas de Verdadeiro/Falso devem ter exatamente uma resposta correta'
            }),
            otherwise: Joi.array().items(Joi.object({
                type: Joi.string().valid('text', 'image').required(),
                content: Joi.string().required().min(1).max(10000000)
                    .messages({
                        'string.min': 'A URL da imagem não pode estar vazia',
                        'string.max': 'A imagem é muito grande'
                    }),
                is_correct: Joi.boolean().required()
            })).min(2).max(6)
            })
        })
    })
    })
});

module.exports.settingsValidation = Joi.object({
    description: Joi.string().allow('').max(300).optional(),
    coverImage: Joi.string().max(10000000).allow(null).optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').allow(null).optional(),
    shuffleQuestions: Joi.boolean().optional(),
    shuffleAnswers: Joi.boolean().optional(),
    defaultTimer: Joi.number().integer().min(-1).max(3600).optional(),
    scoringMode: Joi.string().valid('time-based', 'flat').optional()
});

module.exports.quizUpload = Joi.object({
    title: Joi.string().required().min(1).max(100)
        .custom((value, helpers) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return helpers.error('string.min');
            }
            return trimmed;
        })
        .messages({
            'string.min': 'O título do quiz não pode estar vazio',
            'string.max': 'O título do quiz pode ter no máximo 100 caracteres'
        }),
    settings: module.exports.settingsValidation.optional(),
    questions: Joi.array().items(module.exports.questionValidation).min(1).max(50).required()
        .messages({
            'array.min': 'O quiz deve conter pelo menos uma pergunta',
            'array.max': 'O quiz pode conter no máximo 50 perguntas'
        })
});