import "./styles.sass";
import SelectBox from "@/common/components/SelectBox";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faClock,
    faShuffle,
    faCoins,
    faAlignLeft,
    faSignal,
} from "@fortawesome/free-solid-svg-icons";
import {motion} from "framer-motion";
import {DEFAULT_QUIZ_SETTINGS} from "@/common/constants/QuizSettings.js";

export const QuizSettingsPanel = ({settings, onChange}) => {
    const s = {...DEFAULT_QUIZ_SETTINGS, ...settings};

    const update = (key, value) => {
        onChange({...s, [key]: value});
    };

    const difficultyOptions = [
        {value: "none", label: "Não especificada", description: "Sem nível definido", icon: faSignal},
        {value: "easy", label: "Fácil", description: "Para iniciantes", icon: faSignal},
        {value: "medium", label: "Médio", description: "Perguntas intermediárias", icon: faSignal},
        {value: "hard", label: "Difícil", description: "Perguntas avançadas", icon: faSignal},
    ];

    const timerOptions = [
        {value: "15", label: "15 Segundos", description: "Perguntas ultra-rápidas", icon: faClock},
        {value: "30", label: "30 Segundos", description: "Perguntas rápidas", icon: faClock},
        {value: "60", label: "60 Segundos", description: "Um minuto por pergunta", icon: faClock},
        {value: "120", label: "2 Minutos", description: "Mais tempo para pensar", icon: faClock},
        {value: "-1", label: "Sem limite", description: "Sem limite de tempo", icon: faClock},
    ];

    const scoringOptions = [
        {value: "time-based", label: "Baseado no Tempo", description: "Respostas mais rápidas ganham mais pontos", icon: faCoins},
        {value: "flat", label: "Pontuação Fixa", description: "Mesmos pontos para qualquer acerto", icon: faCoins},
    ];

    return (
        <motion.div
            className="quiz-settings-panel"
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.25, delay: 0.1, ease: "easeOut"}}
        >
            <div className="settings-header">
                <h3>Configurações do Quiz</h3>
            </div>

            <div className="settings-section">
                <div className="section-title">Sobre o Quiz</div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faAlignLeft}/>
                        <span>Descrição</span>
                    </div>
                    <textarea
                        className="settings-textarea"
                        placeholder="Sobre o que é este quiz?"
                        value={s.description}
                        onChange={(e) => update("description", e.target.value)}
                        maxLength={300}
                        rows={3}
                    />
                    <div className="char-count">{s.description.length}/300</div>
                </div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faSignal}/>
                        <span>Dificuldade</span>
                    </div>
                    <SelectBox
                        value={s.difficulty || "none"}
                        onChange={(v) => update("difficulty", v === "none" ? null : v)}
                        options={difficultyOptions}
                        placeholder="Selecione a dificuldade..."
                    />
                </div>
            </div>

            <div className="settings-section">
                <div className="section-title">Dinâmica de Jogo</div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faShuffle}/>
                        <span>Embaralhar perguntas</span>
                    </div>
                    <div className="toggle-row" onClick={() => update("shuffleQuestions", !s.shuffleQuestions)}>
                        <div className={`toggle ${s.shuffleQuestions ? "active" : ""}`}>
                            <div className="toggle-knob"/>
                        </div>
                        <span className="toggle-text">{s.shuffleQuestions ? "Sim" : "Não"}</span>
                    </div>
                </div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faShuffle}/>
                        <span>Embaralhar respostas</span>
                    </div>
                    <div className="toggle-row" onClick={() => update("shuffleAnswers", !s.shuffleAnswers)}>
                        <div className={`toggle ${s.shuffleAnswers ? "active" : ""}`}>
                            <div className="toggle-knob"/>
                        </div>
                        <span className="toggle-text">{s.shuffleAnswers ? "Sim" : "Não"}</span>
                    </div>
                </div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faClock}/>
                        <span>Tempo limite padrão</span>
                    </div>
                    <SelectBox
                        value={String(s.defaultTimer)}
                        onChange={(v) => update("defaultTimer", parseInt(v))}
                        options={timerOptions}
                        placeholder="Selecione o tempo..."
                    />
                </div>

                <div className="setting-group">
                    <div className="setting-label">
                        <FontAwesomeIcon icon={faCoins}/>
                        <span>Sistema de Pontos</span>
                    </div>
                    <SelectBox
                        value={s.scoringMode}
                        onChange={(v) => update("scoringMode", v)}
                        options={scoringOptions}
                        placeholder="Selecione o modo..."
                    />
                </div>
            </div>
        </motion.div>
    );
};
