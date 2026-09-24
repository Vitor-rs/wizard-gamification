import {useState, useRef, useCallback, useEffect} from "react";
import {motion, AnimatePresence} from "framer-motion";
import {createPortal} from "react-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faWandMagicSparkles,
    faFilePdf,
    faLink,
    faBookOpen,
    faPenToSquare,
    faUpload,
    faTimes,
    faSignal,
    faHashtag
} from "@fortawesome/free-solid-svg-icons";
import Button from "@/common/components/Button";
import SelectBox from "@/common/components/SelectBox";
import {postRequest} from "@/common/utils/RequestUtil.js";
import toast from "react-hot-toast";
import "./styles.sass";

const TABS = [
    {id: "topic", label: "Tema", icon: faPenToSquare, description: "Gerar perguntas a partir de um tema"},
    {id: "pdf", label: "PDF", icon: faFilePdf, description: "Perguntas a partir de um documento PDF"},
    {id: "url", label: "URL", icon: faLink, description: "Perguntas a partir de um site"},
    {id: "wikipedia", label: "Wikipedia", icon: faBookOpen, description: "Perguntas a partir de um artigo da Wikipédia"}
];

const DIFFICULTIES = [
    {value: "none", label: "Automático"},
    {value: "easy", label: "Fácil"},
    {value: "medium", label: "Médio"},
    {value: "hard", label: "Difícil"}
];

const WIKI_LANGUAGES = [
    {value: "pt", label: "Português"},
    {value: "en", label: "English"},
    {value: "es", label: "Español"},
    {value: "fr", label: "Français"},
    {value: "de", label: "Deutsch"},
    {value: "it", label: "Italiano"}
];

const MAX_PDF_SIZE = 25 * 1024 * 1024;

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export const AIAdvancedDialog = ({isOpen, onClose, onGenerate, hasExistingMetadata}) => {
    const [activeTab, setActiveTab] = useState("topic");
    const [topic, setTopic] = useState("");
    const [url, setUrl] = useState("");
    const [wikiQuery, setWikiQuery] = useState("");
    const [wikiLang, setWikiLang] = useState("pt");
    const [pdfFile, setPdfFile] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const [questionCount, setQuestionCount] = useState("");
    const [difficulty, setDifficulty] = useState("none");
    const [autoMetadata, setAutoMetadata] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        setPdfFile(null);
        setUrl("");
        setWikiQuery("");
        setTopic("");
        setQuestionCount("");
        setDifficulty("none");
        setAutoMetadata(true);
        setActiveTab("topic");
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handlePdfSelect = (file) => {
        if (!file) return;
        if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error("Por favor, selecione um arquivo PDF.");
            return;
        }
        if (file.size > MAX_PDF_SIZE) {
            toast.error("O PDF é muito grande (máx. 25 MB).");
            return;
        }
        setPdfFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragActive(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handlePdfSelect(file);
    };

    const extractSource = useCallback(async () => {
        setExtracting(true);
        try {
            let body;
            if (activeTab === "url") {
                if (!url.trim()) throw new Error("Por favor, insira uma URL.");
                body = {type: "url", url: url.trim()};
            } else if (activeTab === "wikipedia") {
                if (!wikiQuery.trim()) throw new Error("Por favor, digite um termo de busca.");
                body = {type: "wikipedia", query: wikiQuery.trim(), lang: wikiLang};
            } else if (activeTab === "pdf") {
                if (!pdfFile) throw new Error("Por favor, selecione um arquivo PDF.");
                const base64 = await fileToBase64(pdfFile);
                body = {type: "pdf", pdfBase64: base64};
            } else {
                return null;
            }
            const result = await postRequest("/ai/extract", body);
            if (!result?.text) throw new Error("Nenhum conteúdo de texto obtido.");
            return result;
        } catch (e) {
            toast.error(e.message || "Não foi possível carregar a fonte.");
            return null;
        } finally {
            setExtracting(false);
        }
    }, [activeTab, url, wikiQuery, wikiLang, pdfFile]);

    const canSubmit = () => {
        if (extracting) return false;
        if (activeTab === "topic") return topic.trim().length >= 2;
        if (activeTab === "url") return url.trim().length > 0;
        if (activeTab === "wikipedia") return wikiQuery.trim().length > 0;
        if (activeTab === "pdf") return !!pdfFile;
        return false;
    };

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        let context, derivedTopic, sourceLabel;
        if (activeTab === "topic") {
            derivedTopic = topic.trim();
        } else {
            const source = await extractSource();
            if (!source) return;
            context = source.text;
            derivedTopic = source.title || (activeTab === "wikipedia" ? wikiQuery.trim() : (activeTab === "url" ? url.trim() : "Documento PDF"));
            sourceLabel = source.source;
        }

        const parsedCount = questionCount ? parseInt(questionCount, 10) : undefined;
        const payload = {
            topic: derivedTopic,
            context,
            questionCount: parsedCount && parsedCount >= 1 && parsedCount <= 50 ? parsedCount : undefined,
            difficulty: difficulty !== "none" ? difficulty : undefined,
            generateMetadata: autoMetadata && !hasExistingMetadata,
            sourceLabel
        };
        onClose?.();
        onGenerate(payload);
    };

    if (!isOpen) return null;

    const dialogContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="ai-advanced-overlay"
                    onClick={(e) => e.target === e.currentTarget && onClose?.()}
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 0.2}}
                >
                    <motion.div
                        className="ai-advanced-dialog"
                        role="dialog"
                        aria-modal="true"
                        initial={{opacity: 0, scale: 0.95, y: -20}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.95, y: -20}}
                        transition={{duration: 0.2, ease: "easeOut"}}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="ai-ad-header">
                            <div className="ai-ad-icon">
                                <FontAwesomeIcon icon={faWandMagicSparkles}/>
                            </div>
                            <div className="ai-ad-title">
                                <h2>Gerar Quiz com IA</h2>
                                <p>Escolha uma fonte e deixe a IA criar um quiz</p>
                            </div>
                            <button className="ai-ad-close" onClick={onClose} aria-label="Fechar">
                                <FontAwesomeIcon icon={faTimes}/>
                            </button>
                        </div>

                        <div className="ai-ad-tabs">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`ai-ad-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={tab.icon}/>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="ai-ad-body">
                            {activeTab === "topic" && (
                                <div className="ai-ad-section">
                                    <label className="ai-ad-label">Tema</label>
                                    <textarea
                                        className="ai-ad-textarea"
                                        placeholder="Ex: Revolução Francesa, Fotossíntese, Verbos em Inglês..."
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        maxLength={400}
                                        rows={3}
                                        autoFocus
                                    />
                                    <div className="ai-ad-hint">Descreva o tema – quanto mais detalhado, melhor será o quiz. ({topic.length}/400)</div>
                                </div>
                            )}

                            {activeTab === "pdf" && (
                                <div className="ai-ad-section">
                                    <label className="ai-ad-label">Documento PDF</label>
                                    <div
                                        className={`ai-ad-dropzone ${dragActive ? 'active' : ''} ${pdfFile ? 'has-file' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            style={{display: 'none'}}
                                            onChange={(e) => handlePdfSelect(e.target.files?.[0])}
                                        />
                                        {pdfFile ? (
                                            <div className="ai-ad-file">
                                                <FontAwesomeIcon icon={faFilePdf} className="ai-ad-file-icon"/>
                                                <div className="ai-ad-file-info">
                                                    <div className="ai-ad-file-name">{pdfFile.name}</div>
                                                    <div className="ai-ad-file-size">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="ai-ad-file-remove"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPdfFile(null);
                                                    }}
                                                    aria-label="Remover"
                                                >
                                                    <FontAwesomeIcon icon={faTimes}/>
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faUpload} className="ai-ad-dropzone-icon"/>
                                                <div className="ai-ad-dropzone-text">
                                                    <strong>Solte o PDF aqui</strong>
                                                    <span>ou clique para selecionar (máx. 25 MB)</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "url" && (
                                <div className="ai-ad-section">
                                    <label className="ai-ad-label">URL do Site</label>
                                    <input
                                        className="ai-ad-input"
                                        type="url"
                                        placeholder="https://exemplo.com/artigo"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="ai-ad-hint">O site será lido e utilizado como fonte de dados.</div>
                                </div>
                            )}

                            {activeTab === "wikipedia" && (
                                <div className="ai-ad-section">
                                    <label className="ai-ad-label">Artigo da Wikipédia</label>
                                    <div className="ai-ad-row">
                                        <input
                                            className="ai-ad-input ai-ad-input-grow"
                                            type="text"
                                            placeholder="Ex: Albert Einstein, Machado de Assis"
                                            value={wikiQuery}
                                            onChange={(e) => setWikiQuery(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="ai-ad-lang">
                                            <SelectBox
                                                value={wikiLang}
                                                onChange={setWikiLang}
                                                options={WIKI_LANGUAGES}
                                                ariaLabel="Idioma"
                                            />
                                        </div>
                                    </div>
                                    <div className="ai-ad-hint">O texto do artigo será utilizado como base para as perguntas.</div>
                                </div>
                            )}

                            <div className="ai-ad-options">
                                <div className="ai-ad-option">
                                    <label className="ai-ad-label-sm">
                                        <FontAwesomeIcon icon={faHashtag}/> Número de Perguntas
                                    </label>
                                    <input
                                        className="ai-ad-input ai-ad-input-sm"
                                        type="number"
                                        placeholder="Auto"
                                        min={1}
                                        max={50}
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(e.target.value)}
                                    />
                                </div>
                                <div className="ai-ad-option">
                                    <label className="ai-ad-label-sm">
                                        <FontAwesomeIcon icon={faSignal}/> Dificuldade
                                    </label>
                                    <SelectBox
                                        value={difficulty}
                                        onChange={setDifficulty}
                                        options={DIFFICULTIES}
                                        ariaLabel="Dificuldade"
                                    />
                                </div>
                            </div>

                            <label className={`ai-ad-toggle ${hasExistingMetadata ? 'disabled' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={autoMetadata && !hasExistingMetadata}
                                    disabled={hasExistingMetadata}
                                    onChange={(e) => setAutoMetadata(e.target.checked)}
                                />
                                <span className="ai-ad-toggle-slider"/>
                                <div className="ai-ad-toggle-label">
                                    <strong>Criar título e descrição automaticamente</strong>
                                    <span>
                                        {hasExistingMetadata
                                            ? "O título ou a descrição já foram definidos"
                                            : "A IA preencherá o título e a descrição do quiz antes de criar as perguntas"}
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="ai-ad-footer">
                            <Button onClick={onClose} type="secondary compact" text="Cancelar"/>
                            <Button
                                onClick={handleSubmit}
                                type="primary compact"
                                icon={faWandMagicSparkles}
                                text={extracting ? "Aguarde..." : "Gerar quiz"}
                                disabled={!canSubmit()}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(dialogContent, document.body);
};
