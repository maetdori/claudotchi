#!/usr/bin/env node
// hooks/feed.mjs — UserPromptSubmit. The prompt is the pet's food.
//   * quality of the prompt  -> 🧠 intelligence
//   * regularity (idle gap)  -> ⚡ diligence
//   * if sulking + kind words -> cheer up, ❤️ bond
//   * occasionally fires / resolves a 🧠 surprise quiz

import { readInput, emitAdditionalContext } from '../lib/io.mjs';
import { loadOrCreate, saveState } from '../lib/state.mjs';
import { scorePrompt, diligenceDelta, detectAffection, checkQuizAnswer, pickQuiz } from '../lib/score.mjs';
import { shouldTrigger, QUIZ_CHANCE, clearSulk, setSulk, setQuiz, resolveQuiz } from '../lib/minigame.mjs';

const input = await readInput();
const sessionId = input.session_id || input.sessionId || 'unknown';
const prompt = input.prompt || '';
const now = Date.now();

const state = loadOrCreate(sessionId, input.cwd || '');
let note = '';

if (!state.dead) {
  // 1) cheer up a sulking pet with kind words
  if (state.sulking) {
    const aff = detectAffection(prompt);
    if (aff.affectionate) {
      clearSulk(state, aff.intensity);
      note = '💗 다정한 말에 클로드의 기분이 풀렸어요! (도구 사용 차단이 해제됩니다, ❤️유대 ↑)';
    }
  }

  // 2) resolve a pending quiz (this prompt counts as the answer)
  if (state.quizPending) {
    const correct = checkQuizAnswer(prompt, state.quizPending);
    resolveQuiz(state, correct);
    note = correct
      ? '🧠 깜짝 퀴즈 정답! (❤️유대 ↑, 🧠지능 ↑)'
      : '🧠 깜짝 퀴즈 오답이었어요. 다음 기회에!';
  }

  // 3) feed: score quality + regularity
  const { intel } = await scorePrompt(prompt);
  const dilig = diligenceDelta(now, state.lastPromptTs);

  state.intelligence += intel;
  state.diligence += dilig;
  state.promptCount += 1;

  // long neglect upsets the pet
  if (dilig <= -1 && !state.sulking) setSulk(state, '너무 오래 혼자 뒀어요');

  state.lastPromptTs = now;

  // 4) maybe spring a surprise quiz (ask Claude to pose it to the user)
  if (!state.quizPending && shouldTrigger(state, now, QUIZ_CHANCE)) {
    const quiz = pickQuiz(now);
    setQuiz(state, quiz, now);
    note = `🧠 [클로드 키우기 깜짝 퀴즈] 사용자에게 이 질문을 자연스럽게 내고 답을 기다려 주세요: "${quiz.q}"`;
  }
}

saveState(state);
if (note) emitAdditionalContext('UserPromptSubmit', note);
