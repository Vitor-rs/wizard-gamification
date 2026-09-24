import {useState, useContext} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faWandMagicSparkles, faUser, faLock, faCheck, faArrowRight, faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {BrandingContext} from '@/common/contexts/Branding';
import {postRequest} from '@/common/utils/RequestUtil.js';
import Button from '@/common/components/Button';
import Input from '@/common/components/Input';
import toast from 'react-hot-toast';
import './styles.sass';

export const SetupWizard = ({onComplete}) => {
    const {titleImg} = useContext(BrandingContext);
    const [step, setStep] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateUsername = () => {
        if (!username.trim()) {
            setUsernameError('Benutzername ist erforderlich');
            return false;
        }
        if (username.length < 3) {
            setUsernameError('Mínimo de 3 caracteres');
            return false;
        }
        if (username.length > 32) {
            setUsernameError('Máximo de 32 caracteres');
            return false;
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            setUsernameError('Apenas letras, números, pontos, hífens e sublinhados');
            return false;
        }
        setUsernameError('');
        return true;
    };

    const validatePassword = () => {
        if (!password) {
            setPasswordError('A senha é obrigatória');
            return false;
        }
        if (password.length < 6) {
            setPasswordError('Mínimo de 6 caracteres');
            return false;
        }
        setPasswordError('');

        if (confirmPassword && password !== confirmPassword) {
            setConfirmError('As senhas não coincidem');
            return false;
        }
        setConfirmError('');
        return true;
    };

    const validateConfirm = () => {
        if (!confirmPassword) {
            setConfirmError('Por favor, confirme a senha');
            return false;
        }
        if (password !== confirmPassword) {
            setConfirmError('As senhas não coincidem');
            return false;
        }
        setConfirmError('');
        return true;
    };

    const nextStep = () => {
        if (step === 1) {
            if (!validateUsername()) return;
        }
        setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const handleSetup = async () => {
        if (!validatePassword() || !validateConfirm()) return;

        setLoading(true);
        try {
            await postRequest('/auth/setup', {username: username.trim(), password});
            toast.success('Setup abgeschlossen! Willkommen bei Quizzle.');
            onComplete();
        } catch (error) {
            toast.error(error.message || 'Setup fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        <motion.div key="welcome" className="setup-step" initial={{opacity: 0, x: 50}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -50}}>
            <div className="setup-icon-container">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="setup-icon"/>
            </div>
            <h2>Willkommen bei Quizzle!</h2>
            <p className="setup-description">
                Richte dein Quizzle in wenigen Schritten ein. Erstelle zunächst einen <strong>Administrator-Account</strong>, um alle Einstellungen zu verwalten.
            </p>
            <div className="setup-actions">
                <Button text="Iniciar configuração" icon={faArrowRight} type="primary compact" onClick={nextStep}/>
            </div>
        </motion.div>,

        <motion.div key="username" className="setup-step" initial={{opacity: 0, x: 50}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -50}}>
            <div className="setup-icon-container">
                <FontAwesomeIcon icon={faUser} className="setup-icon"/>
            </div>
            <h2>Benutzername wählen</h2>
            <p className="setup-description">Escolha um nome de usuário para a conta de administrador.</p>
            <div className="setup-input-area">
                <Input
                    placeholder="Benutzername"
                    value={username}
                    onChange={(e) => {setUsername(e.target.value); setUsernameError('');}}
                    error={usernameError}
                    onKeyDown={(e) => e.key === 'Enter' && nextStep()}
                />
            </div>
            <div className="setup-actions">
                <Button text="Zurück" icon={faArrowLeft} type="secondary compact" onClick={prevStep}/>
                <Button text="Avançar" icon={faArrowRight} type="primary compact" onClick={nextStep}/>
            </div>
        </motion.div>,

        <motion.div key="password" className="setup-step" initial={{opacity: 0, x: 50}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -50}}>
            <div className="setup-icon-container">
                <FontAwesomeIcon icon={faLock} className="setup-icon"/>
            </div>
            <h2>Definir senha</h2>
            <p className="setup-description">Escolha uma senha segura para <strong>{username}</strong>.</p>
            <div className="setup-input-area">
                <Input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => {setPassword(e.target.value); setPasswordError('');}}
                    error={passwordError}
                    onKeyDown={(e) => e.key === 'Enter' && document.querySelector('.setup-confirm-input input')?.focus()}
                />
                <Input
                    type="password"
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => {setConfirmPassword(e.target.value); setConfirmError('');}}
                    error={confirmError}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                />
            </div>
            <div className="setup-actions">
                <Button text="Zurück" icon={faArrowLeft} type="secondary compact" onClick={prevStep}/>
                <Button text="Abschließen" icon={faCheck} type="green compact" onClick={handleSetup} disabled={loading}/>
            </div>
        </motion.div>
    ];

    return (
        <div className="setup-wizard-overlay">
            <motion.div
                className="setup-wizard"
                initial={{opacity: 0, scale: 0.9}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.3, ease: "easeOut"}}
            >
                <img src={titleImg} alt="Quizzle" className="setup-logo"/>

                <div className="setup-progress">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`progress-dot ${i <= step ? 'active' : ''} ${i < step ? 'completed' : ''}`}/>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {steps[step]}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
