import React from "react";
import { useNavigate } from "react-router-dom";
import useTutorStore from "../store/useTutorStore.js";
import QuestionCard from "../components/QuestionCard.jsx";
import HintBox from "../components/HintBox.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── KC Tabs ───────────────────────────────────────────────────────────────────
function KCTabs({ activeKC, allKCs, kcTitles, onSelect }) {
  return (
    <div className="mb-3 flex flex-wrap gap-1">
      {allKCs.map((kc) => (
        <button
          key={kc}
          type="button"
          onClick={() => onSelect(kc)}
          className={[
            "rounded-lg border px-2 py-1 text-xs font-semibold transition",
            kc === activeKC
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          {kc}
        </button>
      ))}
    </div>
  );
}

// ── Teaching Phase: Step 1 — Concept Intro ────────────────────────────────────
function TeachIntro({ lesson, onNext }) {
  if (!lesson) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-500">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5">Step 1 of 3</span>
        <span>Concept Introduction</span>
      </div>
      <div className="mt-3 text-xl font-extrabold text-indigo-900">{lesson.title}</div>

      <div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm text-slate-700 leading-relaxed border border-indigo-100">
        {lesson.explanation}
      </div>

      {lesson.keyRules && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
            Key Rules to Remember
          </div>
          <ul className="space-y-1">
            {lesson.keyRules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                <span className="mt-0.5 text-emerald-500 font-bold">✓</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
      >
        Next: See a Worked Example →
      </button>
    </motion.div>
  );
}

// ── Teaching Phase: Step 2 — Worked Example ───────────────────────────────────
function TeachExample({ lesson, onNext }) {
  if (!lesson) return null;
  const we = lesson.workedExample;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-500">
        <span className="rounded-full bg-violet-100 px-2 py-0.5">Step 2 of 3</span>
        <span>Worked Example</span>
      </div>
      <div className="mt-3 text-xl font-extrabold text-violet-900">{lesson.title}</div>

      {we ? (
        <>
          <div className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-4">
            <div className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">Problem</div>
            <div className="text-sm font-semibold text-slate-800">{we.problem}</div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Solution Steps</div>
            {(we.steps || []).map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700">{step}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Answer</div>
            <div className="text-sm font-semibold text-emerald-900">{we.answer}</div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{lesson.example}</div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition"
      >
        Next: Try Guided Practice →
      </button>
    </motion.div>
  );
}

// ── Teaching Phase: Step 3 — Guided Practice ──────────────────────────────────
function TeachGuided({ lesson, studentId, kc, onComplete }) {
  const [gQuestion, setGQuestion] = React.useState(null);
  const [gSelected, setGSelected] = React.useState(null);
  const [gFeedback, setGFeedback] = React.useState(null);
  const [gAttempted, setGAttempted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api.get(`/api/guided-question?kc=${encodeURIComponent(kc)}`)
      .then((d) => { setGQuestion(d.question); setLoading(false); })
      .catch(() => setLoading(false));
  }, [kc]);

  async function handleSelect(opt) {
    if (gAttempted) return;
    setGSelected(opt);
    try {
      const data = await api.post("/api/submit-answer", {
        student_id: studentId,
        question_id: gQuestion.id,
        selected_option: opt,
        time_taken: null,
      });
      setGFeedback(data);
      setGAttempted(true);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Loading guided practice question…</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-600">
        <span className="rounded-full bg-amber-100 px-2 py-0.5">Step 3 of 3</span>
        <span>Guided Practice</span>
      </div>
      <div className="mt-1 text-sm text-slate-500">
        All hints are visible. Take your time and try this question.
      </div>

      {gQuestion && (
        <>
          {/* Show all hints pre-revealed */}
          {(gQuestion.hints || []).length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-1">
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Hints</div>
              {gQuestion.hints.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="text-amber-500 font-bold">💡</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <QuestionCard
              question={gQuestion}
              disabled={gAttempted}
              selected_option={gSelected}
              onSelectOption={handleSelect}
            />
          </div>

          {gFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                "mt-4 rounded-xl border p-4",
                gFeedback.correct
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50",
              ].join(" ")}
            >
              <div className={["font-bold text-sm", gFeedback.correct ? "text-emerald-700" : "text-rose-700"].join(" ")}>
                {gFeedback.correct ? "✓ Correct!" : "✗ Not quite — but that's okay!"}
              </div>
              <div className="mt-1 text-sm text-slate-700">{gFeedback.feedback?.explanation}</div>

              <button
                type="button"
                onClick={onComplete}
                className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition"
              >
                Begin Independent Learning →
              </button>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ── Main Tutor Component ──────────────────────────────────────────────────────
export default function Tutor() {
  const navigate = useNavigate();

  const name        = useTutorStore((s) => s.name);
  const student_id  = useTutorStore((s) => s.student_id);
  const mastery     = useTutorStore((s) => s.mastery);
  const hintLevel   = useTutorStore((s) => s.hintLevel);
  const hintTexts   = useTutorStore((s) => s.hintTexts);
  const feedback    = useTutorStore((s) => s.feedback);
  const status      = useTutorStore((s) => s.status);
  const error       = useTutorStore((s) => s.error);
  const activeKC    = useTutorStore((s) => s.activeKC);
  const lessonPhase = useTutorStore((s) => s.lessonPhase);
  const lessons     = useTutorStore((s) => s.lessons);
  const lessonsViewed    = useTutorStore((s) => s.lessonsViewed);
  const questionStates   = useTutorStore((s) => s.questionStates);
  const allQuestions     = useTutorStore((s) => s.allQuestions);
  const sessionQueue     = useTutorStore((s) => s.sessionQueue);
  const KC_TITLES        = useTutorStore((s) => s.KC_TITLES);
  const ALL_KCS          = useTutorStore((s) => s.ALL_KCS);
  const currentQuestion  = useTutorStore((s) => s.currentQuestion);

  const fetchNextQuestion      = useTutorStore((s) => s.fetchNextQuestion);
  const fetchQuestionsList     = useTutorStore((s) => s.fetchQuestionsList);
  const fetchLessons           = useTutorStore((s) => s.fetchLessons);
  const fetchSessionQueue      = useTutorStore((s) => s.fetchSessionQueue);
  const submitAnswerForQuestion = useTutorStore((s) => s.submitAnswerForQuestion);
  const requestHintForQuestion  = useTutorStore((s) => s.requestHintForQuestion);
  const setCurrentQuestion     = useTutorStore((s) => s.setCurrentQuestion);
  const setActiveKC            = useTutorStore((s) => s.setActiveKC);
  const setLessonPhase         = useTutorStore((s) => s.setLessonPhase);
  const markLessonViewed       = useTutorStore((s) => s.markLessonViewed);
  const saveQuestionState      = useTutorStore((s) => s.saveQuestionState);

  // ── Local UI state ────────────────────────────────────────────────────────
  const [questionMap, setQuestionMap]       = React.useState({});
  const [activeQuestionId, setActiveQuestionId] = React.useState(null);
  const [selectedByQuestion, setSelectedByQuestion]     = React.useState({});
  const [attemptStateByQuestion, setAttemptStateByQuestion] = React.useState({});
  const [feedbackByQuestion, setFeedbackByQuestion]     = React.useState({});
  const [hintsByQuestion, setHintsByQuestion]           = React.useState({});
  const [hintLoading, setHintLoading] = React.useState(false);
  const [hintError, setHintError]     = React.useState(null);
  const [questionStartTime, setQuestionStartTime] = React.useState(null);

  // Teaching phase local state (session only — resets when KC changes)
  // 'intro' | 'example' | 'guided' | null (null = independent practice)
  const [teachStep, setTeachStep] = React.useState(null);

  // Live elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  // ── Derived: kcQuestionOrder from session queue ───────────────────────────
  const kcQuestionOrder = React.useMemo(() => {
    if (sessionQueue.length > 0) return sessionQueue.map((q) => q.id);
    return allQuestions.filter((q) => q.kc === activeKC).map((q) => q.id);
  }, [sessionQueue, allQuestions, activeKC]);

  const activeQuestion    = activeQuestionId ? questionMap[activeQuestionId] : currentQuestion;
  const activeFeedback    = activeQuestionId ? feedbackByQuestion[activeQuestionId] || null : feedback;
  const activeHintState   = activeQuestionId
    ? hintsByQuestion[activeQuestionId] || { hintLevel: 0, hintTexts: [] }
    : { hintLevel, hintTexts };
  const activeAttemptState = activeQuestionId
    ? attemptStateByQuestion[activeQuestionId] || { attempted: false }
    : { attempted: false };

  // ── Progress: correct / total questions in session queue ──────────────────
  const kcProgress = React.useMemo(() => {
    const total = kcQuestionOrder.length;
    if (total === 0) return 0;
    const correct = kcQuestionOrder.filter(
      (qid) => attemptStateByQuestion[qid]?.correct === true
    ).length;
    return Math.round((correct / total) * 100);
  }, [kcQuestionOrder, attemptStateByQuestion]);

  // ── Elapsed timer ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!questionStartTime || activeAttemptState.attempted || teachStep !== null) {
      setElapsedSeconds(0);
      return;
    }
    setElapsedSeconds(0);
    const start = questionStartTime;
    const iv = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [questionStartTime, activeAttemptState.attempted, teachStep]);

  // ── Sync persisted questionStates on load ─────────────────────────────────
  React.useEffect(() => {
    if (!questionStates || Object.keys(questionStates).length === 0) return;
    setAttemptStateByQuestion((prev) => {
      const next = { ...prev };
      for (const [qid, state] of Object.entries(questionStates)) {
        if (!next[qid]) {
          next[qid] = {
            attempted: state === "correct" || state === "incorrect",
            correct: state === "correct" ? true : state === "incorrect" ? false : null,
            skipped: state === "skipped",
          };
        }
      }
      return next;
    });
  }, [questionStates]);

  const registerQuestion = React.useCallback(
    (question, initialHintLevel = 0) => {
      if (!question?.id) return;
      setQuestionMap((prev) => ({ ...prev, [question.id]: question }));
      setHintsByQuestion((prev) => {
        if (prev[question.id]) return prev;
        return { ...prev, [question.id]: { hintLevel: initialHintLevel, hintTexts: [] } };
      });
      setAttemptStateByQuestion((prev) => {
        if (prev[question.id]) return prev;
        const persisted = questionStates?.[question.id];
        if (persisted) {
          return {
            ...prev,
            [question.id]: {
              attempted: persisted === "correct" || persisted === "incorrect",
              correct: persisted === "correct" ? true : persisted === "incorrect" ? false : null,
              skipped: persisted === "skipped",
            },
          };
        }
        return { ...prev, [question.id]: { attempted: false, correct: null } };
      });
      setActiveQuestionId(question.id);
      setCurrentQuestion(question);
      setQuestionStartTime(Date.now());
    },
    [setCurrentQuestion, questionStates]
  );

  const registerQuestionList = React.useCallback(
    (questions) => {
      const qMap = {};
      for (const q of questions || []) {
        if (!q?.id) continue;
        qMap[q.id] = q;
      }
      setQuestionMap(qMap);
      setHintsByQuestion((prev) => {
        const next = { ...prev };
        for (const q of questions || []) {
          if (!next[q.id]) next[q.id] = { hintLevel: 0, hintTexts: [] };
        }
        return next;
      });
      setAttemptStateByQuestion((prev) => {
        const next = { ...prev };
        for (const q of questions || []) {
          if (!next[q.id]) {
            const persisted = questionStates?.[q.id];
            if (persisted) {
              next[q.id] = {
                attempted: persisted === "correct" || persisted === "incorrect",
                correct: persisted === "correct" ? true : persisted === "incorrect" ? false : null,
                skipped: persisted === "skipped",
              };
            } else {
              next[q.id] = { attempted: false, correct: null, skipped: false };
            }
          }
        }
        return next;
      });
    },
    [questionStates]
  );

  const markCurrentAsSkipped = React.useCallback(() => {
    if (!activeQuestionId) return;
    const state = attemptStateByQuestion[activeQuestionId] || { attempted: false };
    if (state.attempted || state.skipped) return;
    setAttemptStateByQuestion((prev) => ({
      ...prev,
      [activeQuestionId]: { ...(prev[activeQuestionId] || {}), skipped: true },
    }));
    saveQuestionState(activeQuestionId, "skipped");
  }, [activeQuestionId, attemptStateByQuestion, saveQuestionState]);

  // ── Initial load ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    Promise.all([fetchQuestionsList(), fetchLessons()]).then(([allQs]) => {
      // Also fetch session queue for KC1
      fetchSessionQueue("KC1").then((queue) => {
        const qs = queue.length > 0 ? queue : (allQs || []).filter((q) => q.kc === "KC1");
        registerQuestionList(qs);
        if (qs.length > 0) registerQuestion(qs[0], 0);
      });
    });

    // Set initial teach step based on whether KC1 lesson was already viewed
    const isViewed = useTutorStore.getState().lessonsViewed.includes("KC1");
    setTeachStep(isViewed ? null : "intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── When KC changes: load session queue + reset teaching phase ────────────
  const prevKCRef = React.useRef(activeKC);
  React.useEffect(() => {
    if (prevKCRef.current === activeKC) return;
    prevKCRef.current = activeKC;

    // Reset teaching phase
    const isViewed = lessonsViewed.includes(activeKC);
    setTeachStep(isViewed ? null : "intro");

    // Fetch session queue for new KC
    fetchSessionQueue(activeKC).then((queue) => {
      const qs = queue.length > 0 ? queue : allQuestions.filter((q) => q.kc === activeKC);
      registerQuestionList(qs);
      if (qs.length > 0) {
        registerQuestion(qs[0], 0);
      }
    });
  }, [activeKC, lessonsViewed, allQuestions, fetchSessionQueue, registerQuestion, registerQuestionList]);

  const kc = activeQuestion?.kc;
  const inTeachingPhase = teachStep !== null;

  // ── Next question helper ──────────────────────────────────────────────────
  function goToNext() {
    if (!kcQuestionOrder.length) return;
    markCurrentAsSkipped();
    const currentIdx = Math.max(0, kcQuestionOrder.indexOf(activeQuestionId));
    const nextIdx = (currentIdx + 1) % kcQuestionOrder.length;
    const nextId = kcQuestionOrder[nextIdx];
    const nextQ = questionMap[nextId];
    if (nextQ) {
      setActiveQuestionId(nextId);
      setCurrentQuestion(nextQ);
      setQuestionStartTime(Date.now());
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-indigo-700">Fractions Tutor</div>
            <div className="text-2xl font-extrabold text-slate-900">
              {KC_TITLES[activeKC] || (kc ? `Working on ${kc}` : "Adaptive practice")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              {name || "Student"}
            </div>
            {/* Live timer */}
            {!inTeachingPhase && !activeAttemptState.attempted && (
              <div className={[
                "rounded-xl border px-3 py-2 text-sm font-mono font-bold tabular-nums transition-colors",
                elapsedSeconds > 45
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : elapsedSeconds > 20
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-700",
              ].join(" ")}>
                ⏱ {formatTime(elapsedSeconds)}
              </div>
            )}
            <motion.button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={() => navigate("/profile")}
            >
              View Profile
            </motion.button>
            <motion.button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-40"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
              onClick={goToNext}
              disabled={status === "loading" || inTeachingPhase}
            >
              Next →
            </motion.button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error.message || String(error)}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* Left Panel — Navigator */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-800">Question Navigator</div>
              <KCTabs
                activeKC={activeKC}
                allKCs={ALL_KCS}
                kcTitles={KC_TITLES}
                onSelect={(kc) => {
                  markCurrentAsSkipped();
                  setActiveKC(kc);
                }}
              />

              {/* KC Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span>{kcProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${kcProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Teaching phase indicator */}
              {inTeachingPhase && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 font-semibold">
                  📖 Complete the teaching phase to unlock questions
                </div>
              )}

              {/* Question grid */}
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                {kcQuestionOrder.map((qid, idx) => {
                  const state = attemptStateByQuestion[qid] || { attempted: false, correct: null, skipped: false };
                  const isActive = qid === activeQuestionId;
                  const statusCls =
                    !state.attempted && state.skipped ? "border-orange-300 bg-orange-100 text-orange-900"
                    : !state.attempted ? "border-slate-200 bg-white text-slate-900"
                    : state.correct ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                    : "border-rose-300 bg-rose-100 text-rose-900";

                  return (
                    <button
                      key={qid}
                      type="button"
                      onClick={() => {
                        if (inTeachingPhase) return;
                        if (qid !== activeQuestionId) markCurrentAsSkipped();
                        const q = questionMap[qid];
                        setActiveQuestionId(qid);
                        setCurrentQuestion(q);
                        setQuestionStartTime(Date.now());
                      }}
                      className={[
                        "w-full rounded-xl border px-2 py-2 text-left transition",
                        statusCls,
                        isActive ? "ring-2 ring-indigo-400" : "",
                        inTeachingPhase ? "opacity-40 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      <div className="text-xs font-bold">Q{idx + 1}</div>
                      <div className="mt-0.5 text-[11px] font-medium">
                        {!state.attempted && state.skipped ? "Skipped"
                          : !state.attempted ? "Unvisited"
                          : state.correct ? "Correct"
                          : "Wrong"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Panel */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              {/* ── TEACHING PHASES ── */}
              {teachStep === "intro" && (
                <TeachIntro
                  key={`intro-${activeKC}`}
                  lesson={lessons[activeKC]}
                  onNext={() => setTeachStep("example")}
                />
              )}
              {teachStep === "example" && (
                <TeachExample
                  key={`example-${activeKC}`}
                  lesson={lessons[activeKC]}
                  onNext={() => setTeachStep("guided")}
                />
              )}
              {teachStep === "guided" && (
                <TeachGuided
                  key={`guided-${activeKC}`}
                  lesson={lessons[activeKC]}
                  studentId={student_id}
                  kc={activeKC}
                  onComplete={async () => {
                    await markLessonViewed(activeKC);
                    setLessonPhase("questions");
                    setTeachStep(null);
                  }}
                />
              )}

              {/* ── INDEPENDENT PRACTICE ── */}
              {teachStep === null && (
                <motion.div
                  key={`practice-${activeKC}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <QuestionCard
                    question={activeQuestion}
                    disabled={status === "loading" || Boolean(activeAttemptState.attempted)}
                    selected_option={selectedByQuestion[activeQuestionId] ?? null}
                    onSelectOption={async (opt) => {
                      if (!activeQuestionId) return;
                      if (activeAttemptState.attempted) return;
                      const timeTaken = questionStartTime ? Date.now() - questionStartTime : null;
                      setSelectedByQuestion((prev) => ({ ...prev, [activeQuestionId]: opt }));
                      try {
                        const data = await submitAnswerForQuestion(activeQuestionId, opt, timeTaken);
                        setAttemptStateByQuestion((prev) => ({
                          ...prev,
                          [activeQuestionId]: { attempted: true, correct: data.correct, skipped: false },
                        }));
                        setFeedbackByQuestion((prev) => ({
                          ...prev,
                          [activeQuestionId]: {
                            ...data.feedback,
                            correct: data.correct,
                            misconception: data.misconception,
                            remediation: data.remediation || null,
                            responseTimeFeedback: data.responseTimeFeedback || null,
                          },
                        }));
                      } catch (e) { console.error(e); }
                    }}
                  />

                  <AnimatePresence mode="wait">
                    {activeFeedback && (
                      <motion.div
                        key={`fb-${activeQuestionId}`}
                        className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                      >
                        <div className={["font-bold", activeFeedback.correct ? "text-emerald-700" : "text-rose-700"].join(" ")}>
                          {activeFeedback.correct ? "✓ Correct!" : "✗ Not quite."}
                        </div>

                        {/* Response time feedback */}
                        {activeFeedback.responseTimeFeedback && (
                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {activeFeedback.responseTimeFeedback}
                          </div>
                        )}

                        <div className="mt-2 text-sm text-slate-700">{activeFeedback.message}</div>

                        {activeFeedback.misconceptionLabel && (
                          <div className="mt-2 text-xs font-semibold text-slate-600">
                            Misconception: {activeFeedback.misconceptionLabel}
                          </div>
                        )}

                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                          {activeFeedback.explanation}
                        </div>

                        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
                          <div className="font-semibold">What this means</div>
                          <div className="mt-1">{activeFeedback.outcomeSummary || "Your attempt has been recorded."}</div>
                          <div className="mt-2 font-semibold">What to do next</div>
                          <div className="mt-1">{activeFeedback.nextStep || "Try the next question."}</div>
                          <div className="mt-2 text-xs text-indigo-700">{activeFeedback.strategyTip}</div>
                          {activeFeedback.masteryImpact && (
                            <div className="mt-2 text-xs font-semibold text-indigo-800">{activeFeedback.masteryImpact}</div>
                          )}
                        </div>

                        {activeFeedback.remediation && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <div className="font-semibold">{activeFeedback.remediation.message}</div>
                            <div className="mt-1">{activeFeedback.remediation.targetedExplanation}</div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel — Hints + KC Mastery */}
          <div className="lg:col-span-3 space-y-4">
            {teachStep === null && (
              <HintBox
                hintTexts={activeHintState.hintTexts}
                hintLevel={activeHintState.hintLevel}
                loading={hintLoading}
                error={hintError}
                maxHints={3}
                onRequestHint={async () => {
                  if (!activeQuestionId || inTeachingPhase) return;
                  setHintLoading(true); setHintError(null);
                  try {
                    const data = await requestHintForQuestion(activeQuestionId);
                    setHintsByQuestion((prev) => {
                      const cur = prev[activeQuestionId] || { hintLevel: 0, hintTexts: [] };
                      const texts = [...cur.hintTexts];
                      texts[data.hintLevel - 1] = data.hintText;
                      return { ...prev, [activeQuestionId]: { hintLevel: data.hintLevel, hintTexts: texts } };
                    });
                  } catch (e) {
                    setHintError(e.message || "Could not load hint.");
                  } finally { setHintLoading(false); }
                }}
              />
            )}

            {/* KC Mastery panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-800">Your KC Mastery</div>
              <div className="mt-3 space-y-2">
                {ALL_KCS.map((k) => {
                  const m = mastery?.[k] ?? 0;
                  const label = m < 40 ? "Beginner" : m < 75 ? "Developing" : "Proficient";
                  const pct = Math.max(0, Math.min(100, Math.round(m)));
                  return (
                    <div key={k} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-800">{k}</div>
                        <div className="text-xs font-semibold text-slate-500">{label}</div>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
