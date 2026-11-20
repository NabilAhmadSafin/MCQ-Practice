import React, { useState, useEffect } from 'react';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { ChaptersPage } from './pages/ChaptersPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { AddQuestionPage } from './pages/AddQuestionPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { PracticePage } from './pages/PracticePage';
import { PracticeHistoryPage } from './pages/PracticeHistoryPage';
import { WeakQuestionsPage } from './pages/WeakQuestionsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ExportDataPage } from './pages/ExportDataPage';
import { seedDatabaseIfEmpty } from './db/seed';
import { getQuestionCount } from './services/questionService';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [navParams, setNavParams] = useState<any>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // Initialize and seed starter questions if SQLite database is empty
  useEffect(() => {
    const init = async () => {
      await seedDatabaseIfEmpty();
      const count = await getQuestionCount();
      setTotalQuestions(count);
    };
    init();
  }, []);

  // Update total questions on section changes
  useEffect(() => {
    getQuestionCount().then(setTotalQuestions).catch(() => {});
  }, [currentSection]);

  const handleNavigate = (section: NavSection, params: any = {}) => {
    setCurrentSection(section);
    setNavParams(params);
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="lc-canvas relative flex h-screen text-[var(--lc-text)] antialiased overflow-hidden">
      {/* Restrained atmospheric depth pools behind frosted glass panels */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-[22%] w-[540px] h-[540px] rounded-full bg-indigo-500/12 blur-[140px]" />
        <div className="absolute top-[28%] -right-32 w-[420px] h-[420px] rounded-full bg-sky-400/8 blur-[130px]" />
        <div className="absolute -bottom-44 left-[36%] w-[500px] h-[500px] rounded-full bg-violet-500/9 blur-[140px]" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentSection={currentSection}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
          totalQuestions={totalQuestions}
        />

        <main className="flex-1 overflow-y-auto">
          <div key={currentSection} className="animate-lc-page">
            {currentSection === 'dashboard' && (
              <DashboardPage onNavigate={handleNavigate} />
            )}

            {currentSection === 'subjects' && (
              <SubjectsPage onNavigate={handleNavigate} />
            )}

            {currentSection === 'chapters' && (
              <ChaptersPage
                initialSubjectId={navParams?.subjectId}
                onNavigate={handleNavigate}
              />
            )}

            {currentSection === 'question-bank' && (
              <QuestionBankPage
                initialFilter={navParams?.filter}
                onNavigate={handleNavigate}
                onEditQuestion={id => handleNavigate('add-question', { editId: id })}
              />
            )}

            {currentSection === 'add-question' && (
              <AddQuestionPage
                editId={navParams?.editId}
                onNavigate={handleNavigate}
              />
            )}

            {currentSection === 'import-export' && (
              <ImportExportPage
                onNavigate={handleNavigate}
                onDataChanged={() => getQuestionCount().then(setTotalQuestions).catch(() => {})}
              />
            )}

            {currentSection === 'practice' && (
              <PracticePage
                initialSubjectId={navParams?.subjectId}
                initialChapterId={navParams?.chapterId}
                initialQuestionId={navParams?.questionId}
                initialMode={navParams?.initialMode}
                onNavigate={handleNavigate}
              />
            )}

            {currentSection === 'practice-history' && (
              <PracticeHistoryPage onNavigate={handleNavigate} />
            )}

            {currentSection === 'wrong-questions' && (
              <WeakQuestionsPage onNavigate={handleNavigate} />
            )}

            {currentSection === 'important-questions' && (
              <QuestionBankPage
                initialFilter={{ important: true }}
                onNavigate={handleNavigate}
                onEditQuestion={id => handleNavigate('add-question', { editId: id })}
              />
            )}

            {currentSection === 'statistics' && (
              <StatisticsPage onNavigate={handleNavigate} />
            )}

            {currentSection === 'settings' && (
              <ExportDataPage
                onNavigate={handleNavigate}
                onDataChanged={() => getQuestionCount().then(setTotalQuestions).catch(() => {})}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
