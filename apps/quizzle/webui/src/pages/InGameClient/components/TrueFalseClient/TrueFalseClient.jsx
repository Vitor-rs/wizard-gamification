import "./styles.sass";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faCheck, faXmark} from "@fortawesome/free-solid-svg-icons";

export const TrueFalseClient = ({onSubmit}) => {
    return (
        <div className="true-false-client" role="group" aria-label="Verdadeiro ou Falso">
            <button className="true-false-option true-option" onClick={() => onSubmit([0])} type="button">
                <FontAwesomeIcon icon={faCheck} className="tf-icon"/>
                <span>Verdadeiro</span>
            </button>
            <button className="true-false-option false-option" onClick={() => onSubmit([1])} type="button">
                <FontAwesomeIcon icon={faXmark} className="tf-icon"/>
                <span>Falso</span>
            </button>
        </div>
    );
};