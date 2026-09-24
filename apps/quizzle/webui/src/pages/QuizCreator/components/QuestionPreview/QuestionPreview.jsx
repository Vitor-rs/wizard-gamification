import "./styles.sass";

export const QuestionPreview = ({question, isActive, onClick}) => {
    return (
        <div className={`question-preview${isActive ? " preview-active" : ""}`} onClick={onClick}>
            <h3>{question || "Sem título de pergunta"}</h3>
        </div>
    )
}