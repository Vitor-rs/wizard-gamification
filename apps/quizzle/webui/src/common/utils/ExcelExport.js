import * as XLSX from 'xlsx';

const autoSizeColumns = (worksheet, data) => {
    const colWidths = [];

    data.forEach(row => {
        row.forEach((cell, colIndex) => {
            const cellValue = String(cell || '');
            const cellWidth = Math.max(cellValue.length + 2, 10);

            if (!colWidths[colIndex] || cellWidth > colWidths[colIndex]) {
                colWidths[colIndex] = Math.min(cellWidth, 50);
            }
        });
    });

    worksheet['!cols'] = colWidths.map(width => ({width}));
};

const exportAnalyticsToExcel = (analyticsData, quizData = null, isLiveQuiz = false, quizName = 'Quiz') => {
    const {classAnalytics, questionAnalytics, studentAnalytics} = analyticsData;

    const workbook = XLSX.utils.book_new();

    const overviewData = [
        ['Quizzle Analytics Export'],
        [''],
        ['Quiz Informationen'],
        ['Quiz Typ', isLiveQuiz ? 'Live Quiz' : 'Übungsquiz'],
        ['Quiz Name', quizName],
        ['Export Datum', new Date().toLocaleDateString('de-DE')],
        ['Data de Exportação', new Date().toLocaleTimeString('de-DE')],
        [''],
        ['Klassen Übersicht'],
        ['Gesamte Schüler', classAnalytics.totalStudents],
        ['Total de Perguntas', classAnalytics.totalQuestions],
        ['Pontuação Média', classAnalytics.averageScore],
        ['Durchschnittliche Genauigkeit (%)', classAnalytics.averageAccuracy],
        ['Perguntas que precisam de revisão', classAnalytics.questionsNeedingReview],
        ['Schüler die Aufmerksamkeit benötigen', classAnalytics.studentsNeedingAttention],
        ['Teilnahmerate (%)', classAnalytics.participationRate || 100]
    ];

    if (isLiveQuiz) {
        overviewData.push(['Gesamte Versuche', classAnalytics.totalAttempts || 'N/A']);
    } else {
        overviewData.push(['Gesamte Versuche', classAnalytics.totalAttempts]);
    }

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    autoSizeColumns(overviewSheet, overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Übersicht');

    const studentHeaders = [
        'Schüler Name',
        'Charakter',
        'Total de Pontos',
        'Respostas Corretas',
        'Respostas Parcialmente Corretas',
        'Respostas Incorretas',
        'Gesamte beantwortet',
        'Genauigkeit (%)',
        'Benötigt Aufmerksamkeit',
        'Leistungsniveau'
    ];

    if (!isLiveQuiz) {
        studentHeaders.splice(8, 0, 'Tentativas', 'Pontuação Média');
    }

    const studentData = [studentHeaders];

    studentAnalytics.forEach(student => {
        const performanceLevel = student.accuracy >= 80 ? 'Ausgezeichnet' :
            student.accuracy >= 60 ? 'Gut' : 'Verbesserung nötig';

        const row = [
            student.name,
            student.character,
            student.totalPoints,
            student.correctAnswers,
            student.partialAnswers || 0,
            student.incorrectAnswers,
            student.totalAnswered,
            student.accuracy,
            student.needsAttention ? 'Ja' : 'Nein',
            performanceLevel
        ];

        if (!isLiveQuiz) {
            row.splice(8, 0, student.attempts || 1, student.avgScore || student.totalPoints);
        }

        studentData.push(row);
    });

    const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
    autoSizeColumns(studentSheet, studentData);
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'Schüler Analytics');

    const questionHeaders = [
        'Nº da Pergunta',
        'Título da Pergunta',
        'Tipo de Pergunta',
        'Total de Respostas',
        'Total de Acertos',
        'Total Parcialmente Corretas',
        'Total de Erros',
        'Percentual de Acertos (%)',
        'Schwierigkeitsgrad',
        'Benötigt Überprüfung'
    ];

    const questionData = [questionHeaders];

    questionAnalytics.forEach(question => {
        const difficultyGerman = question.difficulty === 'easy' ? 'Fácil' :
            question.difficulty === 'medium' ? 'Médio' :
                question.difficulty === 'hard' ? 'Difícil' : 'Desconhecido';

        questionData.push([
            question.questionIndex + 1,
            question.title,
            question.type,
            question.totalResponses,
            question.correctCount,
            question.partialCount || 0,
            question.incorrectCount,
            question.correctPercentage,
            difficultyGerman,
            question.needsReview ? 'Ja' : 'Nein'
        ]);
    });

    const questionSheet = XLSX.utils.aoa_to_sheet(questionData);
    autoSizeColumns(questionSheet, questionData);
    XLSX.utils.book_append_sheet(workbook, questionSheet, 'Análise de Perguntas');

    const summaryData = [
        ['Zusammenfassung Statistiken'],
        [''],
        ['Distribuição de Dificuldade das Perguntas'],
        ['Perguntas Fáceis', questionAnalytics.filter(q => q.difficulty === 'easy').length],
        ['Perguntas Médias', questionAnalytics.filter(q => q.difficulty === 'medium').length],
        ['Perguntas Difíceis', questionAnalytics.filter(q => q.difficulty === 'hard').length],
        [''],
        ['Schüler Leistungsverteilung'],
        ['Ausgezeichnet (≥80%)', studentAnalytics.filter(s => s.accuracy >= 80).length],
        ['Gut (60-79%)', studentAnalytics.filter(s => s.accuracy >= 60 && s.accuracy < 80).length],
        ['Verbesserung nötig (<60%)', studentAnalytics.filter(s => s.accuracy < 60).length],
        [''],
        ['Top 5 Schüler'],
        ['Posição', 'Nome', 'Pontuação', 'Precisão (%)']
    ];

    const sortedStudents = [...studentAnalytics]
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 5);

    sortedStudents.forEach((student, index) => {
        summaryData.push([
            index + 1,
            student.name,
            student.totalPoints,
            student.accuracy
        ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    autoSizeColumns(summarySheet, summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Zusammenfassung');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `${quizName}_Analytics_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);

    return filename;
};

export const exportPracticeResultsToExcel = (results, practiceCode) => {
    const analyticsData = results.analytics;
    const quizName = `Übungsquiz_${practiceCode}`;

    return exportAnalyticsToExcel(analyticsData, results.quiz, false, quizName);
};

export const exportLiveQuizToExcel = (analyticsData, quizName = 'LiveQuiz') => {
    return exportAnalyticsToExcel(analyticsData, null, true, quizName);
};