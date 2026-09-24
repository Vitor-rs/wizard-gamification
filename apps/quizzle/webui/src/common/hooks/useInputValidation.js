import {useState, useCallback} from 'react';

export const useInputValidation = (initialValue = '', validationRules = {}) => {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [touched, setTouched] = useState(false);

    const validateInput = useCallback((inputValue) => {
        const {
            required = false,
            minLength = 0,
            maxLength = Infinity,
            pattern = null,
            customValidator = null,
            allowedChars = null
        } = validationRules;

        if (required && (!inputValue || inputValue.trim().length === 0)) {
            return 'Este campo é obrigatório';
        }

        if (!inputValue || inputValue.trim().length === 0) {
            return '';
        }

        const trimmedValue = inputValue.trim();
        if (trimmedValue.length < minLength) {
            return `Mínimo de ${minLength} caracteres necessários`;
        }
        if (trimmedValue.length > maxLength) {
            return `Máximo de ${maxLength} caracteres permitidos`;
        }
        if (pattern && !pattern.test(inputValue)) {
            return 'Formato inválido';
        }

        if (allowedChars && !allowedChars.test(inputValue)) {
            return 'Contém caracteres inválidos';
        }

        if (customValidator) {
            const customError = customValidator(inputValue);
            if (customError) return customError;
        }

        return '';
    }, [validationRules]);

    const handleChange = useCallback((newValue) => {
        setValue(newValue);
        
        if (touched) {
            const errorMessage = validateInput(newValue);
            setError(errorMessage);

            if (!errorMessage && validationRules.maxLength) {
                const progress = newValue.length / validationRules.maxLength;
                if (progress > 0.8 && progress < 1) {
                    setWarning(`${validationRules.maxLength - newValue.length} caracteres restantes`);
                } else {
                    setWarning('');
                }
            }
        }
    }, [touched, validateInput, validationRules.maxLength]);

    const handleBlur = useCallback(() => {
        setTouched(true);
        const errorMessage = validateInput(value);
        setError(errorMessage);
    }, [value, validateInput]);

    const validate = useCallback(() => {
        setTouched(true);
        const errorMessage = validateInput(value);
        setError(errorMessage);
        return !errorMessage;
    }, [value, validateInput]);

    const reset = useCallback(() => {
        setValue(initialValue);
        setError('');
        setWarning('');
        setTouched(false);
    }, [initialValue]);

    return {
        value,
        error,
        warning,
        touched,
        isValid: !error && touched,
        setValue: handleChange,
        onBlur: handleBlur,
        validate,
        reset
    };
};

export const validationRules = {
    playerName: {
        required: true,
        minLength: 2,
        maxLength: 20,
        allowedChars: /^[a-zA-Z0-9\s\-_]*$/,
        customValidator: (value) => {
            const trimmed = value.trim();
            if (trimmed !== value) {
                return 'O nome não pode começar ou terminar com espaços';
            }
            if (/\s{2,}/.test(value)) {
                return 'Espaços múltiplos não são permitidos';
            }
            return null;
        }
    },
    quizTitle: {
        required: true,
        minLength: 1,
        maxLength: 100,
        customValidator: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return 'O título não pode estar vazio';
            }
            return null;
        }
    },
    questionTitle: {
        required: true,
        minLength: 1,
        maxLength: 200,
        customValidator: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return 'A pergunta não pode estar vazia';
            }
            return null;
        }
    },
    answerText: {
        required: true,
        minLength: 1,
        maxLength: 150,
        customValidator: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
                return 'A resposta não pode estar vazia';
            }
            return null;
        }
    }
};