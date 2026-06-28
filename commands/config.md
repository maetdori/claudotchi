---
description: 클로도치 설정을 보고 바꿉니다 (수명·렌더·LLM 채점·삐짐) — 슬래시 명령만으로 즉시 적용
argument-hint: "[항목 값] 예: lifespan 60"
allowed-tools: Bash(node:*)
---

## ⚙️ 클로도치 설정

!`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" config $ARGUMENTS`

위 출력을 사용자에게 그대로 보기 좋게 전달하세요.
- 인자 없이 실행하면 모든 설정값과 출처(슬래시 명령/env/기본값)를 보여줍니다.
- 바꾸려면 `/claudotchi:config <항목> <값>` (예: `/claudotchi:config lifespan 60`, `/claudotchi:config sprite mini`).
- `/claudotchi:config <항목> default` 로 초기화(env/기본값으로 복귀).
- 설정은 `config.json`에 저장되어 **모든 세션에 공유·영속**됩니다.
- 처음이라면 질의형 마법사 `/claudotchi:setup` 을 안내하세요.
