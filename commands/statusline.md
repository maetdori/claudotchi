---
description: 클로도치 상태표시줄 진단·수정 — 기존 statusLine과 충돌하면 교체하거나 합칩니다
argument-hint: "[replace|combine|revert] (비우면 진단만)"
allowed-tools: Bash(node:*)
---

## 🎀 클로도치 상태표시줄

현재 진단:

!`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" statusline $ARGUMENTS`

위 출력을 사용자에게 보기 좋게 전달하세요. 그런 다음:

- **이미 펫**(또는 **합쳐짐**) 상태면 → 할 일 없다고만 알려주세요.
- **`none`(등록 없음)** 이면 → 바로 등록할지 물어보고, 예이면 `node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" statusline replace`.
- **`other`(다른 statusLine 감지)** 이면 → **AskUserQuestion** 으로 물어보세요: *"기존 상태표시줄이 있어요. 어떻게 할까요?"*
  - **클로도치로 교체** → `node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" statusline replace`
  - **기존 것과 함께 보기(합치기)** → `node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" statusline combine`
  - **그대로 두기** → 아무것도 실행하지 않음
- **`error`(settings.json 파싱 불가)** 이면 → 파일을 고친 뒤 다시 시도하라고 안내(아무것도 건드리지 않음).

수정 후에는 **다음 새로고침(또는 새 세션)부터 반영**되고, `settings.json` 은 자동 백업되며 `/claudotchi:statusline revert` 로 되돌릴 수 있다고 알려주세요. 인자(`replace`/`combine`/`revert`)를 직접 넘기면 질의 없이 바로 실행됩니다.
