---
description: 클로도치 설정 마법사 — 질의로 수명·렌더·LLM 채점·삐짐을 한 번에 선택
allowed-tools: Bash(node:*)
---

## 🧙 클로도치 설정 마법사

현재 설정값입니다:

!`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config`

이제 **AskUserQuestion 도구**를 사용해 아래 4가지를 한 번에 물어보세요(각 항목의 현재값을 기본/추천으로 안내). 사용자가 답하지 않고 넘긴 항목은 그대로 두면 됩니다.

1. **수명(lifespan)** — 죽는 컨텍스트 %. 옵션 예: `40 (기본)`, `20 (짧게·자주 환생)`, `60`, `80 (오래)`.
2. **렌더(sprite)** — `pixel (픽셀아트, 기본)` vs `mini (한 줄 이모지, 작은 상태표시줄)`.
3. **LLM 채점(llm)** — `off (휴리스틱·무료·즉시, 기본)` vs `on (가벼운 모델로 프롬프트 채점, ANTHROPIC_API_KEY 필요)`.
4. **삐짐(sulk)** — `on (방치 시 삐짐→다정한 말로 해제, 기본)` vs `off`.

사용자의 선택을 받은 뒤, **선택된 항목마다** 아래 형식으로 저장하세요(값을 실제 선택값으로 치환):

```
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config lifespan <숫자>
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config sprite <pixel|mini>
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config llm <on|off>
node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config sulk <on|off>
```

마지막으로 저장된 최종 설정을 다시 보여주고(`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config`), 새 세션부터 온전히 반영된다고 알려주세요.
