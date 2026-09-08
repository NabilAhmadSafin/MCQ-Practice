import React, { useState, useEffect } from 'react';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { ChaptersPage } from './pages/ChaptersPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { AddQuestionPage } from './pages/AddQuestionPage';
import { ImportPage } from './pages/ImportPage';
import { PracticePage } from './pages/PracticePage';
import { PracticeHistoryPage } from './pages/PracticeHistoryPage';
import { WeakQuestionsPage } from './pages/WeakQuestionsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ExportDataPage } from './pages/ExportDataPage';
import { seedDatabaseIfEmpty } from './db/seed';
import { db } from './db';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [navParams, setNavParams] = useState<any>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // Initialize and seed starter questions if IndexedDB is empty
  useEffect(() => {
    const init = async () => {
      await seedDatabaseIfEmpty();
      const count = await db.questions.count();
      setTotalQuestions(count);
    };
    init();
  }, []);

  // Update total questions on section changes
  useEffect(() => {
    db.questions.count().then(setTotalQuestions).catch(() => {});
  }, [currentSection]);

  const handleNavigate = (section: NavSection, params: any = {}) => {
    setCurrentSection(section);
    setNavParams(params);
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={handleNavigate}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentSection={currentSection}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigate={handleNavigate}
          totalQuestions={totalQuestions}
        />

        <main className="flex-1 overflow-y-auto">
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

          {currentSection === 'import-questions' && (
            <ImportPage onNavigate={handleNavigate} />
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
            <ExportDataPage onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
}
