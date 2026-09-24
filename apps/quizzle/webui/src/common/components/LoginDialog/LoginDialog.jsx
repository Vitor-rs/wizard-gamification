import {useState, useContext} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faRightToBracket} from '@fortawesome/free-solid-svg-icons';
import Dialog from '@/common/components/Dialog';
import Input from '@/common/components/Input';
import {AuthContext} from '@/common/contexts/Auth';
import toast from 'react-hot-toast';
import './styles.sass';

export const LoginDialog = ({isOpen, onClose, onSuccess}) => {
    const {login} = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!username.trim()) {
            setError('Nome de usuário é obrigatório');
            return;
        }
        if (!password) {
            setError('Senha é obrigatória');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login(username.trim(), password);
            toast.success('Login realizado com sucesso.');
            setUsername('');
            setPassword('');
            setError('');
            onSuccess?.();
        } catch (err) {
            setError(err.message || 'Falha no login.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setUsername('');
        setPassword('');
        setError('');
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            onCancel={handleClose}
            title={
                <div className="login-dialog-title">
                    <FontAwesomeIcon icon={faRightToBracket} className="login-dialog-title-icon"/>
                    Entrar
                </div>
            }
            confirmText={loading ? "..." : "Entrar"}
            cancelText="Cancelar"
            className="login-dialog"
        >
            <div className="login-dialog-content">
                <p className="login-dialog-text">
                    Por favor, entre com sua conta de <strong>Professor ou Administrador</strong>.
                </p>
                <div className="login-input-wrapper">
                    <Input
                        placeholder="Nome de usuário"
                        value={username}
                        onChange={(e) => {setUsername(e.target.value); setError('');}}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    />
                    <Input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => {setPassword(e.target.value); setError('');}}
                        error={error}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    />
                </div>
            </div>
        </Dialog>
    );
};
