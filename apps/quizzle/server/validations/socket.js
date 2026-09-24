const Joi = require('joi');
const {CHARACTER_DATA} = require('../utils/characters');

module.exports.checkRoom = Joi.object({
    code: Joi.alternatives().try(
        Joi.number().max(9999),
        Joi.string().pattern(/^[A-Z]{4}$/i)
    ).required()
});

module.exports.joinRoom = Joi.object({
    code: Joi.alternatives().try(
        Joi.number().max(9999),
        Joi.string().pattern(/^[A-Z]{4}$/i)
    ).required(),
    name: Joi.string().required().min(2).max(20)
        .pattern(/^[a-zA-Z0-9\s\-_]+$/)
        .custom((value, helpers) => {
            const trimmed = value.trim().replace(/\s+/g, ' ');
            if (trimmed.length < 2) {
                return helpers.error('string.min');
            }
            if (trimmed !== value) {
                return trimmed;
            }
            return value;
        })
        .messages({
            'string.pattern.base': 'O nome pode conter apenas letras, números, espaços, hífens e sublinhados',
            'string.min': 'O nome deve ter pelo menos 2 caracteres',
            'string.max': 'O nome pode ter no máximo 20 caracteres'
        }),
    character: Joi.string().required().valid(...Object.keys(CHARACTER_DATA))
});

module.exports.answerQuestion = Joi.object({
    answers: Joi.alternatives().try(
        Joi.array().items(Joi.number().required()).min(0).max(8),
        Joi.string().max(200).allow(''),
        Joi.number()
    )
});