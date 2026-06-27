---
description: 클로드 삐짐(sulk) 기능을 켜고 끕니다 — 방치 시 도구 차단 + 다정한 말로 해제
argument-hint: "[on|off]"
allowed-tools: Bash(node:*)
---

## 😤 삐짐 기능 토글

!`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" sulk $ARGUMENTS`

위 출력을 사용자에게 그대로 전달하세요.
- 인자 없이 실행하면 현재 상태(켜짐/꺼짐과 그 출처)를 보여줍니다.
- `/claudotchi:sulk on` / `/claudotchi:sulk off` 로 켜고 끌 수 있다고 안내하세요.
- 설정은 즉시 적용되며 모든 세션에 공유됩니다(영속).
