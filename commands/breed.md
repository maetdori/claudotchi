---
description: 다른 세션의 클로드 펫과 교배해 자손(다음 세대 알)을 만듭니다
argument-hint: "[부모1번호 부모2번호]"
allowed-tools: Bash(node:*)
---

## 클로드 교배 (cross-session breeding)

여러 세션에서 키운 클로드 펫들의 후보 목록과 교배 결과입니다:

!`node "${CLAUDE_PLUGIN_ROOT}/lib/cli.mjs" breed $ARGUMENTS`

위 출력을 사용자에게 보기 좋게 정리해 전달하세요.
- 번호 목록만 출력됐다면, 사용자가 두 부모의 번호를 골라
  `/claudotchi:breed <번호1> <번호2>` 형식으로 다시 실행하도록 안내하세요.
- "교배 완료"가 나왔다면, 다음에 새 세션을 열면(또는 현재 펫이 수명을 다하면)
  그 자손이 부화한다는 점을 알려주세요.
