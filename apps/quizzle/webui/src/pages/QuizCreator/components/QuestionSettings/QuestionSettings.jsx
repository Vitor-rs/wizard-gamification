import "./styles.sass";
import SelectBox from "@/common/components/SelectBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faClock, faInfinity, faCoins, faSliders} from "@fortawesome/free-solid-svg-icons";
import {useState, useEffect} from "react";
import {motion} from "framer-motion";
import {QUESTION_TYPES, SLIDER_MARGIN_CONFIG} from "@/common/constants/QuestionTypes.js";

export const QuestionSettings = ({question, onChange, onCommit, defaultTimer = 60}) => {
    const [selectedTimer, setSelectedTimer] = useState(() => {
        if (question.timer === undefined || question.timer === null) return "default";
        if (question.timer === -1) return "unlimited";
        if (question.timer === 30) return "30";
        if (question.timer === 120) return "120";
        return "custom";
    });

    const [selectedPointMultiplier, setSelectedPointMultiplier] = useState(() => {
        if (question.pointMultiplier === undefined || question.pointMultiplier === null) return "standard";
        return question.pointMultiplier;
    });

    const defaultTimerLabel = defaultTimer === -1 ? "Sem limite" : `${defaultTimer}s`;

    const timerOptions = [
        {
            value: "default",
            label: `Padrão (${defaultTimerLabel})`,
            description: "Das configurações do Quiz",
            icon: faClock
        },
        {
            value: "30",
            label: "30 Segundos",
            description: "Perguntas rápidas",
            icon: faClock
        },
        {
            value: "60",
            label: "60 Segundos",
            description: "Um minuto por pergunta",
            icon: faClock
        },
        {
            value: "120",
            label: "2 Minutos",
            description: "Mais tempo para pensar",
            icon: faClock
        },
        {
            value: "unlimited",
            label: "Sem limite",
            description: "Sem limite de tempo",
            icon: faInfinity
        }
    ];

    const pointMultiplierOptions = [
        {
            value: "standard",
            label: "Padrão",
            description: "Pontuação normal",
            icon: faCoins
        },
        {
            value: "none",
            label: "Sem pontos",
            description: "Esta pergunta não vale pontos",
            icon: faCoins
        },
        {
            value: "double",
            label: "Pontos em dobro",
            description: "Esta pergunta vale o dobro de pontos (2x)",
            icon: faCoins
        }
    ];

    useEffect(() => {
        if (question.timer === undefined || question.timer === null) {
            setSelectedTimer("default");
        } else if (question.timer === -1) {
            setSelectedTimer("unlimited");
        } else if (question.timer === 30) {
            setSelectedTimer("30");
        } else if (question.timer === 120) {
            setSelectedTimer("120");
        } else {
            setSelectedTimer("custom");
        }

        if (question.pointMultiplier === undefined || question.pointMultiplier === null) {
            setSelectedPointMultiplier("standard");
        } else {
            setSelectedPointMultiplier(question.pointMultiplier);
        }
    }, [question.timer, question.pointMultiplier]);

    const handleTimerChange = (value) => {
        setSelectedTimer(value);
        const commit = onCommit || onChange;

        let timerNum;
        if (value === "default") {
            timerNum = undefined;
        } else if (value === "unlimited") {
            timerNum = -1;
        } else if (value === "30") {
            timerNum = 30;
        } else if (value === "120") {
            timerNum = 120;
        }

        commit({...question, timer: timerNum});
    };

    const handlePointMultiplierChange = (value) => {
        setSelectedPointMultiplier(value);
        const commit = onCommit || onChange;
        const multiplierValue = value === "standard" ? undefined : value;
        commit({...question, pointMultiplier: multiplierValue});
    };

    const handleAnswerMarginChange = (value) => {
        const commit = onCommit || onChange;
        const answers = question.answers || [{correctValue: 50, min: 0, max: 100, step: 1, answerMargin: 'medium'}];
        const updatedAnswers = [{...answers[0], answerMargin: value}];
        commit({...question, answers: updatedAnswers});
    };

    const answerMarginOptions = Object.entries(SLIDER_MARGIN_CONFIG).map(([key, config]) => ({
        value: key,
        label: config.label,
        description: config.description,
        icon: faSliders
    }));

    const isSliderType = question?.type === QUESTION_TYPES.SLIDER;
    const currentAnswerMargin = question?.answers?.[0]?.answerMargin || 'medium';

    if (!question) return null;

    return (
        <motion.div
            className="question-settings"
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.25, delay: 0.2, ease: "easeOut"}}
        >
            <div className="settings-header">
                <h3>Configurações da Pergunta</h3>
            </div>

            <div className="setting-group">
                <div className="setting-label">
                    <FontAwesomeIcon icon={faClock}/>
                    <span>Tempo Limite</span>
                </div>

                <SelectBox value={selectedTimer} onChange={handleTimerChange} options={timerOptions} placeholder="Selecione o tempo..."/>
            </div>

            <div className="setting-group">
                <div className="setting-label">
                    <FontAwesomeIcon icon={faCoins}/>
                    <span>Pontuação</span>
                </div>

                <SelectBox value={selectedPointMultiplier} onChange={handlePointMultiplierChange} options={pointMultiplierOptions} placeholder="Selecione a pontuação..."/>
            </div>

            {isSliderType && (
                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faSliders}/>
                        <span>Tolerância de Resposta</span>
                    </div>

                    <SelectBox value={currentAnswerMargin} onChange={handleAnswerMarginChange} options={answerMarginOptions} placeholder="Selecione a tolerância..."/>
                </div>
            )}
        </motion.div>
    );
};