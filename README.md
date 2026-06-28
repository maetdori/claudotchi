# 클로도치 (claudotchi)

> Claude Code 플러그인 — **당신이 AI를 어떻게 쓰는지**에 따라 자라는 다마고치형 펫.
> 컨텍스트 사용량이 **수명**이라, 펫만 봐도 컨텍스트를 얼마나 썼는지 한눈에 알 수 있어요.

```
🥚 알 → 🐣 아기도치 → 🐤 (지능) → 🧒 (성실) → 🧑 성체 12종 + 시크릿 3종 → 💀
       (수명 = 컨텍스트 0% ───────────────────────────→ 기본 40%, 조절 가능)
```

## 설치

> ⚠️ Claude Code의 상태표시줄은 **하나뿐**입니다. 이미 커스텀 statusLine을 쓰고 있다면 이 플러그인이 그것을 대체합니다.

```
/plugin marketplace add https://github.com/maetdori/claudotchi.git
/plugin install claudotchi
```

새 세션을 한 번 열면 끝입니다. statusLine은 **SessionStart 훅이 `~/.claude/settings.json`에 자동 등록**하므로 직접 편집할 필요가 없어요(이미 다른 statusLine이 있으면 덮어쓰지 않습니다). 별도 의존성 없이 **Node.js**만 있으면 됩니다.

설치 직후 설정을 고르고 싶다면 **`/claudotchi:setup`** — 수명·렌더·LLM 채점·삐짐을 질의로 한 번에 선택합니다. 나중에 아무 때나 **`/claudotchi:config`** 로 바꿀 수 있어요(파일 편집·재시작 불필요, 모든 세션 공유).

<details>
<summary>플러그인 없이 수동 설치</summary>

`~/.claude/settings.json`에 직접 등록합니다 (`<경로>`를 클론 위치로 바꾸세요):

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"<경로>/claudotchi/statusline/claudotchi.mjs\"",
    "padding": 0,
    "refreshInterval": 3000
  },
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"<경로>/claudotchi/hooks/init.mjs\"" }] }],
    "PreCompact":   [{ "hooks": [{ "type": "command", "command": "node \"<경로>/claudotchi/hooks/init.mjs\"" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node \"<경로>/claudotchi/hooks/feed.mjs\"" }] }],
    "PreToolUse":  [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node \"<경로>/claudotchi/hooks/gate.mjs\"" }] }],
    "PostToolUse": [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node \"<경로>/claudotchi/hooks/hygiene.mjs\"" }] }]
  }
}
```

슬래시 명령(`/breed`·`/family`·`/sulk`·`/config`·`/setup`)은 `commands/`를 프로젝트 `.claude/commands/` 등으로 복사하세요.
</details>

## 어떻게 자라나요?

- **나이 = 컨텍스트 사용률.** 40%를 한 생애로 보고 알→유아기→성장기→청년기→성체로 늙다가 수명을 다합니다.
- **형태 = 케어 스탯.** 단계마다 다른 스탯이 다음 모습을 결정 — 랜덤이 아닌 **정해진 가계도**라, *어떤 캐릭터로 컸는가 = AI를 어떻게 썼는가*.

| 스탯 | 올리는 법 |
|---|---|
| 🧠 지능 | 구체적·맥락 있는 좋은 프롬프트 |
| ⚡ 성실 | 꾸준한 상호작용 (긴 방치 X) |
| 🧼 청결 | 도구 에러·실패가 적음 |
| ❤️ 교감 | 삐짐 풀어주기 (다정한 말) → 시크릿 분기 조건 |

성장기 🧠 → 청년기 ⚡ → 성체 🧼 순으로 분기합니다(경로 의존적 — 방치하다 나중에 잘해도 마스터가 될 수 없음).

![클로도치 성장 가계도](assets/growth-chart.svg)

- 🌟 **레전도치** (시크릿): 명문 혈통 3세대↑ + 깊은 교감 ❤️10↑ → 마스터도치 자리에서 분기
- 🐱 **냥냥도치** (시크릿): 마페도치를 교감만렙 ❤️12↑로 키우면 고양이로 분기
- 🍥 **나루토치** (시크릿): 방치도치(낙제생)를 ⚡성실 되돌리기 + 깊은 교감 ❤️10↑로 되살리면 각성하는 언더독

> 소개·가이드·도감·컬렉션을 한 페이지에서 — **[클로도치 웹페이지 ↗](https://maetdori.github.io/claudotchi/)** (사이드바로 메인·가이드·도감·컬렉션 이동, 도감은 크게 보기·크기 조절·PNG 저장·획득 경로). 로컬에선 `node lib/app.mjs`로 `index.html` 재생성 후 브라우저로 열어요.

## 번식 (세션 간 교배)

- `/claudotchi:breed` — 다른 세션 펫들의 후보 목록
- `/claudotchi:breed 1 2` — 1·2번 교배 → 자손 알이 대기열에. 새 세션을 열거나 현재 펫이 죽으면 부화
- `/claudotchi:family` — 역대 세대 묘비 + 현재 가계도

두 부모의 **genome**(선천 편향 + 색·액세서리·가문명)이 결정적으로 재조합되어 같은 종도 개체가 유니크합니다. 단, 상속 편향은 작아서 등급은 여전히 **이번 세션의 실제 사용**이 좌우해요. 가문(家)은 **클로드·오퍼스·소네트·하이쿠·페이블·다오** 중 상속됩니다.

## 😤 삐짐

오래 방치하면 클로드가 삐져서 **도구 사용이 막힙니다.** 다정한 말("고마워, 잘하고 있어")을 건네면 풀리고 ❤️교감이 올라요. 기본 켜짐입니다.

끄고 켜는 방법: `/claudotchi:sulk off` / `/claudotchi:sulk on` (또는 아래 `/claudotchi:config sulk`).

## 설정

**슬래시 명령만으로** 전부 됩니다 — 파일 편집·재시작 없이 즉시 적용되고 모든 세션에 공유·영속돼요.

- **`/claudotchi:setup`** — 질의형 마법사. 아래 4개를 한 번에 선택.
- **`/claudotchi:config`** — 인자 없이 치면 현재 설정값과 출처(슬래시/ env / 기본값)를 전부 보여줍니다.
- **`/claudotchi:config <항목> <값>`** — 개별 변경. `<항목> default` 로 초기화.

| 항목 | 값 | 설명 |
|---|---|---|
| `lifespan` | 1~100 (기본 40) | 죽는 컨텍스트 %. 단계 경계도 비례 확장 |
| `sprite` | `pixel` / `mini` | mini = 한 줄 이모지(작은 상태표시줄용) |
| `llm` | `on` / `off` | on이면 프롬프트 품질을 가벼운 모델로 채점(**`ANTHROPIC_API_KEY` 필요**). off = 휴리스틱(무료·즉시) |
| `llmModel` | 모델 ID | LLM 채점 모델 (기본 `claude-haiku-4-5`) |
| `sulk` | `on` / `off` | 😤 방치 시 삐짐 → 다정한 말로 해제 |

예) `/claudotchi:config lifespan 60` · `/claudotchi:config sprite mini`

> 환경변수(`CLAUDOTCHI_LIFESPAN`·`CLAUDOTCHI_SPRITE`·`CLAUDOTCHI_LLM`·`CLAUDOTCHI_LLM_MODEL`·`CLAUDOTCHI_SULK`)도 그대로 **fallback**으로 동작합니다. 단, 슬래시 명령으로 설정한 값이 있으면 그쪽이 우선해요.

설정과 상태는 `~/.claude/claudotchi/`에 저장됩니다 (`config.json`·`state-<session>.json`·`graveyard.json`·`pending-offspring.json`). 지우면 펫과 가계도가 초기화돼요.

<details>
<summary>동작 원리</summary>

| 구성요소 | 이벤트 | 하는 일 |
|---|---|---|
| `statusline/claudotchi.mjs` | 상태표시줄 갱신 | 컨텍스트%로 나이 계산·진화·죽음 기록·렌더 |
| `hooks/feed.mjs` | UserPromptSubmit | 품질→🧠, 규칙성→⚡, 삐짐 해제 |
| `hooks/gate.mjs` | PreToolUse | 삐짐 시 도구 차단 |
| `hooks/hygiene.mjs` | PostToolUse | 도구 에러→🧼 |
| `hooks/init.mjs` | SessionStart / PreCompact | 부화·세대 대물림·묘비 기록 |
| `lib/*.mjs` | — | 가계도·genome·채점·삐짐·기록 로직 |

</details>

---

재미로 만든 플러그인이지만, *이번 세션에서 내 클로드가 어떤 모습으로 자랐나*를 보면 내가 AI를 얼마나 잘 활용하고 컨텍스트를 얼마나 썼는지 자연스럽게 돌아보게 됩니다. 🐣
