import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Loader2, 
  ArrowRight,
  Sparkles,
  Trophy,
  BookOpen,
  Settings as SettingsIcon,
  X
} from 'lucide-react';

import { Question, QuizStats, AppView, AiProvider, AppSettings } from './types';
import { processImageToQuestions, checkOllamaConnection } from './services/aiService';

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const HARDCODED_SETTINGS: AppSettings = {
  provider: AiProvider.OLLAMA,
  ollamaHost: 'http://192.168.1.230:11434',
  ollamaModel: 'qwen2.5vl:7b'
};

export default function App() {
  const [view, setView] = useState<AppView>(AppView.CONFIG);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [stats, setStats] = useState<QuizStats>({ correct: 0, total: 0, startTime: Date.now() });
  
  const [discoveredPaths, setDiscoveredPaths] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);
  
  const [sessionTargetCount, setSessionTargetCount] = useState<number>(5);
  const [showSettings, setShowSettings] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const [settings] = useState<AppSettings>(HARDCODED_SETTINGS);
  const [ollamaStatus, setOllamaStatus] = useState<{connected: boolean, modelFound: boolean} | null>(null);

  const discoverImages = useCallback(async () => {
    setIsScanning(true);

    const imageModules = import.meta.glob('./TestQuestions/**/*.{jpg,jpeg,png}', { 
      eager: true, 
      as: 'url' 
    });

    const allPaths = Object.values(imageModules) as string[];
    
    console.log("Found Paths:", allPaths);

    const categories = new Set<string>();

    // 1. Identify unique subfolders
    allPaths.forEach(path => {
      const parts = path.split('/');
      const tqIndex = parts.indexOf('TestQuestions');
      if (tqIndex !== -1 && parts[tqIndex + 1] && !parts[tqIndex + 1].includes('.')) {
        categories.add(parts[tqIndex + 1]);
      }
    });

    const categoryList = Array.from(categories).sort();
    
    console.log("Detected Categories:", categoryList);

    setAvailableCategories(categoryList);

    // 2. Set initial category
    let currentCat = selectedCategory;
    if (!currentCat && categoryList.length > 0) {
      currentCat = categoryList[0];
      setSelectedCategory(currentCat);
    }

    // 3. STRICT FILTERING: Only use images from the selected folder
    // We look for the pattern /TestQuestions/CategoryName/
    const filteredPaths = currentCat 
      ? allPaths.filter(path => path.includes(`/TestQuestions/${currentCat}/`))
      : [];

    const randomized = shuffleArray(filteredPaths);
    setDiscoveredPaths(randomized);
    
    // Adjust session count if it exceeds available images in this folder
    setSessionTargetCount(prev => Math.min(prev === 0 ? 5 : prev, randomized.length || 1));
    setIsScanning(false);
  }, [selectedCategory]);

  useEffect(() => {
    discoverImages();
  }, [discoverImages]);

  useEffect(() => {
    if (settings.provider === AiProvider.OLLAMA) {
      checkOllamaConnection(settings.ollamaHost, settings.ollamaModel).then(setOllamaStatus);
    }
  }, [settings]);

  const startPracticeSession = async () => {
    if (discoveredPaths.length === 0) {
      alert(`No images found in the ${selectedCategory} folder.`);
      return;
    }

    setIsProcessing(true);
    setView(AppView.PROCESSING);
    setProcessingProgress(0);

    const pathsToProcess = discoveredPaths.slice(0, sessionTargetCount);
    const resultQuestions: Question[] = [];
    
    for (let i = 0; i < pathsToProcess.length; i++) {
      try {
        const base64 = await fetchImageAsBase64(pathsToProcess[i]);
        const extracted = await processImageToQuestions(base64, settings);
        resultQuestions.push(...extracted);
      } catch (err) {
        console.error("AI failed for path:", pathsToProcess[i], err);
      }
      setProcessingProgress(Math.round(((i + 1) / pathsToProcess.length) * 100));
    }

    setIsProcessing(false);
    if (resultQuestions.length > 0) {
      setQuestions(resultQuestions.slice(0, sessionTargetCount));
      setView(AppView.SETUP);
    } else {
      setView(AppView.CONFIG);
      alert("AI failed to extract questions. Check Ollama connection.");
    }
  };

  const handleAnswerSelection = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    const question = questions[currentIndex];
    const letter = String.fromCharCode(65 + idx);
    if (letter === question.correctAnswer.trim().toUpperCase()) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    }
    setStats(prev => ({ ...prev, total: prev.total + 1 }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsZoomed(false);
    } else {
      setStats(prev => ({ ...prev, endTime: Date.now() }));
      setView(AppView.RESULTS);
    }
  };

  const resetQuiz = () => {
    setView(AppView.CONFIG);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setStats({ correct: 0, total: 0, startTime: Date.now() });
    discoverImages();
  };

  const ZoomedImageOverlay = ({ src }: { src: string }) => (
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
      onClick={() => setIsZoomed(false)}
    >
      <X className="absolute top-8 right-8 w-8 h-8 text-white/50" />
      <img src={src} alt="Enlarged" className="max-w-full max-h-full object-contain rounded-xl" />
    </div>
  );

  if (view === AppView.CONFIG) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] p-12 shadow-2xl space-y-10 border border-slate-100">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Question Bank</h1>
          </div>

          <div className="relative">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-6 px-8 appearance-none font-bold text-slate-800 text-xl shadow-inner focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
            >
              {availableCategories.length === 0 ? (
                <option>No Folders Found</option>
              ) : (
                availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat} Questions</option>
                ))
              )}
            </select>
            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 pointer-events-none rotate-90" />
          </div>

          <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Session Length</label>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => setSessionTargetCount(Math.max(1, sessionTargetCount-1))} className="w-12 h-12 rounded-xl border-2 border-white bg-white text-2xl font-bold text-slate-300 shadow-sm">-</button>
              <div className="text-6xl font-black text-slate-900 w-24 tabular-nums">{sessionTargetCount}</div>
              <button onClick={() => setSessionTargetCount(Math.min(discoveredPaths.length, sessionTargetCount+1))} className="w-12 h-12 rounded-xl border-2 border-white bg-white text-2xl font-bold text-slate-300 shadow-sm">+</button>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase">
               {discoveredPaths.length} Images in "{selectedCategory}"
            </p>
          </div>

          <button 
            disabled={isScanning || discoveredPaths.length === 0}
            onClick={startPracticeSession} 
            className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isScanning ? 'Syncing...' : 'Generate Quiz'}
          </button>
        </div>
      </div>
    );
  }

  if (view === AppView.PROCESSING) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-10">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
          <h2 className="text-3xl font-black text-slate-900">AI Analysis</h2>
          <p className="text-slate-500 text-lg font-medium px-4">Processing {selectedCategory} diagrams...</p>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${processingProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (view === AppView.SETUP) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-10 pb-40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4">
              <CheckCircle className="text-emerald-500 w-10 h-10" /> Ready
            </h2>
            <button onClick={resetQuiz} className="text-slate-400 hover:text-slate-900 flex items-center gap-2 font-bold transition-colors">
              <RotateCcw className="w-5 h-5" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col gap-4">
                <img src={q.image} className="h-40 w-full object-cover rounded-2xl bg-slate-100" alt="Diagram" />
                <p className="text-slate-700 font-semibold line-clamp-2 text-sm">Question {i+1}: {q.text}</p>
              </div>
            ))}
          </div>
          <div className="fixed bottom-12 left-0 right-0 px-6 flex justify-center">
            <button onClick={() => setView(AppView.QUIZ)} className="bg-indigo-600 text-white px-16 py-7 rounded-[2.5rem] font-black text-2xl shadow-2xl">
              Start Practice Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === AppView.QUIZ) {
    const q = questions[currentIndex];
    return (
      <div className="min-h-screen bg-slate-50 pb-40">
        {isZoomed && <ZoomedImageOverlay src={q.image || ''} />}
        <header className="bg-white/90 backdrop-blur-xl border-b p-6 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="text-lg font-black text-slate-900">Question {currentIndex + 1} of {questions.length}</span>
            <button onClick={() => window.confirm('Exit?') && resetQuiz()} className="text-slate-300 hover:text-rose-500"><XCircle className="w-7 h-7" /></button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto p-6 space-y-10">
          <div className="bg-white rounded-[2.5rem] p-4 shadow-xl border-2 border-white cursor-zoom-in" onClick={() => setIsZoomed(true)}>
            <img src={q.image} className="w-full h-auto rounded-[2rem]" alt="Diagram" />
          </div>
          <div className="bg-white p-8 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{q.text}</h2>
            <div className="grid grid-cols-1 gap-5">
              {q.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = letter === q.correctAnswer.trim().toUpperCase();
                const isSelected = selectedAnswer === idx;
                let variant = "border-slate-100 bg-slate-50 hover:border-indigo-300";
                if (selectedAnswer !== null) {
                  if (isCorrect) variant = "bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/10";
                  else if (isSelected) variant = "bg-rose-50 border-rose-500 ring-4 ring-rose-500/10";
                  else variant = "opacity-40 grayscale pointer-events-none";
                }
                return (
                  <button key={idx} disabled={selectedAnswer !== null} onClick={() => handleAnswerSelection(idx)}
                    className={`w-full text-left p-6 rounded-3xl border-2 transition-all flex items-start gap-6 ${variant}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>{letter}</div>
                    <span className="pt-2 flex-1 font-bold text-slate-700 text-lg">{opt.replace(/^[A-Z]\.\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
            {showExplanation && (
              <div className="p-8 bg-indigo-50 rounded-[2.5rem] border-2 border-indigo-100">
                <p className="text-indigo-900/80 font-bold italic">"{q.explanation}"</p>
              </div>
            )}
          </div>
        </main>
        <div className="fixed bottom-12 left-0 right-0 px-6 flex justify-center gap-5">
          <button onClick={() => currentIndex > 0 && setCurrentIndex(c => c - 1)} disabled={currentIndex === 0} className="px-8 bg-white border-2 py-7 rounded-[2rem] disabled:opacity-0"><ChevronLeft className="w-8 h-8" /></button>
          <button onClick={nextQuestion} disabled={selectedAnswer === null} className={`flex-1 max-w-sm py-7 rounded-[2rem] font-black text-2xl ${selectedAnswer !== null ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
            {currentIndex === questions.length - 1 ? 'FINISH' : 'NEXT'}
          </button>
        </div>
      </div>
    );
  }

  if (view === AppView.RESULTS) {
    const score = Math.round((stats.correct / (questions.length || 1)) * 100);
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-2xl w-full bg-white text-slate-900 rounded-[4.5rem] p-12 md:p-24 shadow-2xl space-y-12">
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto" />
          <h1 className="text-5xl font-black">Score: {score}%</h1>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-slate-50 p-10 rounded-[3rem]">
               <p className="text-4xl font-black">{stats.correct}</p>
               <p className="text-xs uppercase font-bold text-slate-400">Correct</p>
            </div>
            <div className="bg-slate-50 p-10 rounded-[3rem]">
               <p className="text-4xl font-black">{questions.length}</p>
               <p className="text-xs uppercase font-bold text-slate-400">Total</p>
            </div>
          </div>
          <button onClick={resetQuiz} className="w-full bg-indigo-600 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl">New Session</button>
        </div>
      </div>
    );
  }

  return null;
}
