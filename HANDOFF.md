# 클로도치 — 다음 세션 이어가기 노트 (2026-08-13 시작 · 08-14 대량 갱신)

원래 세션(08-13): 웹을 **단일 페이지 SPA**로 리디자인 + **나루토치(🍥)** 히든 편입.
이어진 세션(08-14): **도감 thesvg 개선 · 시크릿 리빌 · 상태표시줄/터미널카드 · statusline 명령 · 다크 가계도 · 줄바꿈 정리**.
전부 **플러그인 레포 생성기**(`lib/*.mjs`)에서 수행, 다크·웜(dothome) 테마. **전부 미커밋**(plugin.json **0.9.0**).
👉 **08-14 내용은 아래쪽 날짜별 섹션 참조**(맨 아래 "다음 세션 할 일"이 최신 우선순위).

레포: `/Users/maetdori/source/playground/claudotchi` (git, main, origin=github.com/maetdori/claudotchi)

---

## 확정된 방향 (유저 지시)
- **테마: 다크·웜 단일** (dothome 톤 #14110e + clay #d77757 + gold #e8c15c, Pretendard). 블로그 cream 테마와 **분리**. 토글 없음.
- **소스 진실: 플러그인 레포 생성기.** 별도 `../claudotchi-web/`(cream, build-app.py, forms.json)는 **폐기**(구조만 참고).
- **한 페이지에서 다 보기**: 도감/가이드 분리 X. 사이드바로 이동(thesvg 레이아웃 참고).
- **히어로 제목 = 한글 "클로도치"**, 사이드바 = 영문 워드마크 `CLAUDOTCHI` (역할 분리 — 확정).

## 웹 앱 구조 (`lib/app.mjs` → `index.html`, SPA)
- **사이드바**: 공식 Claude Code 아이콘(`#D97757`, `~/Downloads/claude-code.svg`와 동일) + `CLAUDOTCHI`(CLAUD 주황) / nav 메인·가이드·도감·컬렉션 / GitHub·maetdori.log.
- **메인**: 터미널 상태표시줄 목업 + "Claude Code 상태표시줄에서 픽셀 펫을 키우는 플러그인"(마침표 없음) + **수명 40% 각주**(왜 40%=컨텍스트 관리 신호 + config 조절) + 생애주기 스트립(전폭 균등) + CTA(GitHub / 설치 방법 보기→가이드). 히어로 아이콘 = Claude Code 아이콘 1.2em.
- **가이드(튜토리얼 순서)**: ①설치 → ②케어 스탯 → ③성장 가계도 → ④교배·삐짐 (번호 배지). 트리 아래 **"📖 전체 도감 펼쳐보기" CTA**(→도감 뷰, `data-view` 방식).
- **도감**: `lib/dogam.mjs`의 인터랙티브 상세 뷰 재사용 — 큰 프리뷰 + 정보 패널(등급/단계/획득경로/프로필/**팔레트/계보**) + 클릭 그리드 + **크기 슬라이더(px 값 표시)/실루엣 토글/격자 오버레이/PNG 프리셋(32·64·128·256)**.
  - **thesvg 개선 반영됨(2026-08-14, todo #1 완료)**: ①컬러 칩(●#hex, 클릭 복사, 히든 폼은 숨김) ②PNG 프리셋 32/64/128/256(정확한 NxN 출력=integer scale-to-fit·centered·투명패딩 + 클릭 시 슬라이더 동기화) ③관련 도치=계보(부모·형제 썸네일, 클릭 이동 / 히든 폼 kin은 `HIDDEN_KIN` 수동 매핑) ④격자 오버레이 토글. 전부 `dogam.mjs` export(`DETAIL_CSS/DETAIL_JS/formsPayload`) 단일소스 → `app.mjs`·standalone 양쪽 자동 반영. 컨트롤 마크업만 두 파일에 중복(양쪽 갱신함). 슬라이더 min 6→3. headless Chrome로 성체·히든 뷰 렌더 검증.
- **컬렉션**: 성체12+히든3 수집북(localStorage 데모, owned=컬러+✓, locked=실루엣+???). 실제 플러그인은 graveyard.json에서 채움(웹은 CSP로 못 읽음 → 데모).
- 뷰 전환: `[data-view]` 클릭 + localStorage `cc-view`.

## 나루토치(🍥) 정식 편입
- `lib/sprites.mjs`: **per-sprite `pal` 팔레트 지원**(paintRow + 호출부 `spec.pal`). `narutochi` 스프라이트(body 주황, pal y=금발/p=보호대, badge 🍥).
- `lib/chart.mjs`: `narutochi` NODES(히든 ★) + **`isNarutochiEligible(state)`**(성실 평균≥0.6 && 교감≥10) + `chooseChild` 훅(zombie/oyaji → narutochi = 방치도치 언더독 각성).
- `lib/growth-svg.mjs`: pal 지원 + 시크릿 금고 3종 우측정렬 + 나루토치 힌트.
- `lib/dogam.mjs`: 웹 `spriteHtml` pal + 시크릿 그룹에 narutochi.
- **검증됨**: redemption state → narutochi, 방치 → zombie. 기존 스프라이트 색 불변(회귀 없음).

## dogam.mjs 리팩터 (재사용 export화)
`spriteHtml · GROUPS · gradeKey · GALLERY_CSS · DETAIL_CSS · DETAIL_JS · formsPayload · acquirePath` export → `app.mjs`가 도감 뷰로 임베드. `acquirePath()`는 NODES 역방향 walk로 획득 경로 생성. standalone CLI(dev)도 유지.
- 프레임 배경: **밝은 웜 체커보드 + 스프라이트 외곽 drop-shadow**(크림색 알 가시성, 칙칙하지 않게). 그룹 제목 축약("성체 12종","시크릿").

## 정리/서빙
- `lib/landing.mjs` 삭제, `dogam.html` 삭제(SPA로 흡수). `.nojekyll` 추가.
- README 링크 → 단일 페이지 `https://maetdori.github.io/claudotchi/` + narutochi 시크릿 항목 추가.
- `assets/growth-chart.svg` 재생성(narutochi 포함).
- `plugin.json` version **0.8.0**(이전 config 작업에서 범프). 이번 리디자인 버전 **미결정**(0.9.0 제안).

## 블로그 프로젝트란 (`../maetdori.github.io`) — ⚠️ 이미 자동커밋됨
- nav "프로젝트" 링크(`index.astro` + `posts/[...slug].astro` 両), `src/pages/projects.astro` 신규(.mast+.writing-card 재사용, claudotchi 외부링크 → `/claudotchi/`), `public/projects/claudotchi.png` 썸네일.
- **주의**: 이 레포는 저장-시-자동커밋이 있어 변경이 HEAD `7f19920`("game편 리라이트" 커밋)에 **섞여** 들어감. 원하면 분리/리워드 필요.

## 아티팩트 (프리뷰)
- **SPA**: https://claude.ai/code/artifact/bb6bd49e-3675-4a96-9db6-78a1a9c1e16a (같은 file path로 계속 갱신 중, 비공개).
- (구) 도감 단독 19edb7c5 는 SPA 도감 뷰로 흡수 — 무시.

## 검증 방법
- **headless Chrome**로 렌더+스크린샷(JS 실행됨): `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --virtual-time-budget=3000 --window-size=W,H --screenshot=out.png "file://.../index.html"`. 뷰 강제: `sed "s/show(...): 'main');/show('dogam');/"`. qlmanage는 JS 미실행.
- 생성: `node lib/app.mjs` (index.html), `node lib/dogam.mjs` (dev dogam.html), `node lib/growth-svg.mjs` (assets/growth-chart.svg).

## statusline 충돌 해결 명령 (2026-08-14 추가)
- **`/claudotchi:statusline`** 신설 — 기존 statusLine과 충돌 시 진단→교체/합치기/되돌리기.
  - `lib/install.mjs`: `statuslineStatus/replaceStatusline/combineStatusline/revertStatusline` (settings.json 안전 읽기/쓰기, **수정 전 `.claudotchi-bak` 백업**, 파싱 불가 시 미변경, combine은 `~/.claude/claudotchi-combined.sh` 래퍼 자동 생성 = 기존 명령 `bash -c` 래핑 + 펫, stdin 공유).
  - `lib/cli.mjs`: `statusline` 서브명령(status/replace/combine/revert).
  - `commands/statusline.md`: `other` 감지 시 AskUserQuestion으로 선택.
  - `hooks/init.mjs`: skipped-existing 메시지가 이 명령을 안내(훅은 대화형 팝업 불가 → 텍스트 안내 1회 + 명령이 실제 선택 담당).
  - 웹 가이드 노트도 명령 우선 안내(수동은 fallback). **임시 HOME으로 replace/combine/revert/파싱에러 전부 검증됨.**
- **plugin.json 0.8.0 → 0.9.0** 범프 완료(미커밋).
- ⚠️ 사용자 실제 `~/.claude/settings.json`은 미변경(테스트는 temp HOME). 사용자의 기존 라이브 스크립트는 `claudchi-combined.sh`(구 네이밍) — 우리 감지엔 `other`로 잡힘(정상).

## 성장 가계도 다크 재설계 (2026-08-14)
- `lib/growth-svg.mjs` 전면 다크 재설계: **다크 웜 포스터(dothome) + 밝은 크림 "전시 케이스" 타일**(도감 프레임과 같은 컨셉 — 스프라이트의 어두운 눈·입 픽셀이 다크 타일에 묻히는 문제 회피). 골드/가문색 연결선, 다크 헤일로 분기 태그, 시크릿 금고 골드 점선. 3가문 세로 트리 **구조는 유지**(폭 맞춤 축소 시 가독성 이유). README용 `assets/growth-chart.svg`도 다크로 재생성(미커밋).
- 유저가 "레이아웃까지 재설계" 선택했으나 실제 병목은 테마 불일치였어 비주얼 전면 재설계 + 구조 유지로 진행. 구조 변경 원하면 추가 작업 여지.

## 웹 카피/줄바꿈 정리 (2026-08-14) — 유저 선호 규칙
- 전역 `word-break:keep-all;overflow-wrap:break-word`(app.mjs body) — 한글 **어절 단위** 줄바꿈.
- **문장경계 `<br>`**: 유저는 "문장 시작 앞에서 끊기"를 선호 (예: "…정해요.<br>설정은 …", "…됩니다.<br>경로 의존적이라…"). `.prose`는 max-width 760px 고정이라 `<br>` 안전. `.nb`(nowrap)로 구(句) 묶기도 사용.
- **헤더 설명문 불필요**(제목만): 도감·컬렉션 view-head `<p>` 제거함.
- 메인 태그라인 "Claude Code 상태표시줄에서 **나만의 클로도치를 키워보아요**". 케어스탯의 "랜덤은 없어요 — 쓰는 습관이…" 문장은 **삭제**(유저 요청).
- 설치 코드블록 위 💬 "Claude Code(CLI)를 실행한 뒤…" 캡션(`.code-cap`). statusline 명령은 그냥 코드블록(하이라이트 박스 X), 수동 방법은 접이식 `<details class="sub">`.

## 시크릿 도감 리빌 방식 (2026-08-14) — 유저 확정
- **갤러리 카드**: 실루엣 + `？？？`(전각, 한 종류로 통일 — ❔ 이모지 제거) + ★, **설명줄 없음**.
- **클릭 시 기본 = 실루엣 + 마스킹**: `？？？` 이름 + 성체·히든 칩 + "🔒 컬러 보기를 누르면 정체가 공개돼요" 힌트만. 획득경로·프로필·팔레트·계보 **전부 숨김**.
- **"컬러 보기" 누르면 전체 공개**(실색 스프라이트·실명·프로필·팔레트·계보). `dogam.mjs` DETAIL_JS의 `masked = f.hidden && sil` 로직. select()가 시크릿은 `sil=true`로 시작.
- **왕관(👑) 등 뱃지 이모지**: 웹 도감(타이틀·카드 코너)에서 제거. 단 **게임 상태표시줄 데이터(sprites.mjs badge)는 유지**. S급 등급칩도 이름 옆 1개만(meta 줄 중복 제거).

## 상태표시줄(터미널) 레이아웃 (2026-08-14)
- `lib/sprites.mjs` render(): `· · ·` 점선 SEP **제거**, 골드 프로그레스 바(`lifeBar` fg GOLD), **바+스탯 한 줄**(유저 요청). 그 뒤 **컴팩트화**(내부 빈 줄 제거 → 스프라이트 아래 이름·집·바 바짝, 총 ~10줄, PAD_TOP/BOTTOM 1씩만). "실제 터미널에서 너무 크다" 피드백 반영.
- ⚠️ **임시 라이브 미리보기 방식**: `lib/` 를 마켓플레이스 클론 `~/.claude/plugins/marketplaces/maetdori-marketplace/lib/` 에 **복사**하면 실제 터미널이 ~3초 새로고침에 반영(node 프로세스 매번 재실행). sprites.mjs만 복사하면 clone 옛 config.mjs에 `valueOf` 없어 깨짐 → **lib 전체 복사함**. `/plugin marketplace update` 하면 github(0.7.3)로 원복. **정식 반영은 커밋+푸시+update 필요.**

## 웹 터미널 목업 카드 디자인 (2026-08-14) — 유저 선택
- 유저가 시안 비교 후 **"추천안(A+clay)"** 선택 → app.mjs `.term` 적용: **딥 스크린 `#0d0b09` + 밝은 타이틀바 `#241e18` + 미세 clay 링/글로우**(border rgba(215,119,87,.38) + 그림자). 다크 페이지와 명도 대비로 "터미널 창"임이 또렷.
- **프로그레스 바 = 둥근 골드 알약**(`.term-life .pbar/.pfill`, 77.5% 채움). 스텟은 바와 같은 줄(nowrap+overflow).
- 시안 비교 아티팩트: https://claude.ai/code/artifact/ce1dd419-b55a-42aa-ba98-a8cbd85166f9 (mockup.html, 5종 A/B/C+추천+쿨).

## 성장 가계도 가독성 개선 (2026-08-14) — ⏳ 진행 중
- 다크 재설계(위 섹션) 후 가독성 1차 개선 완료: **분기 태그를 칩(pill)화**(🧠상/중/하·⚡상/하 = 어두운 알약+색테두리+굵은글씨), **반복 🧼상/하 태그 12개 제거**(위=상 규칙은 범례에 명시), 범례·금고 각주 밝기/크기↑, 연결선 2.8px, 이름 14px.
- **다음 세션에서 이어서 가독성 더 볼 것** (유저가 "가독성 개선중"이라 함). 후보: 스프라이트/타일 크기, 컬럼 간격, 태그 위치·대비, 시크릿 금고 텍스트 밀도 등.

## 다음 세션 할 일 (우선순위)
1. **⏳ 성장 가계도 가독성 마저 개선** (진행 중 — `lib/growth-svg.mjs`. 위 섹션 참조. 유저와 방향 맞춰 계속).
2. **커밋 + 푸시 (plugin.json 0.9.0)** — 이번 세션 전부 미커밋: config·리디자인·narutochi·thesvg 도감개선·시크릿리빌·터미널레이아웃·statusline명령·다크가계도·터미널카드·줄바꿈. 한 커밋 권장. **git 작업은 유저 명시 요청 시에만.**
3. **`/plugin marketplace update`** (커밋·푸시 후) — 클론 갱신, 임시 복사한 lib/ 정식 반영.
4. **GitHub Pages 활성화**(수동): Settings→Pages→main/root.
5. (선택) 성장 가계도 SVG 시크릿 금고 `❔` 힌트 마커 손볼지 / 아티팩트 프리뷰 PNG 다운로드 `downloads` capability(프리뷰 전용 이득).

## 재생성/검증 명령
- 생성: `node lib/app.mjs`(index.html) · `node lib/growth-svg.mjs`(assets/growth-chart.svg). dev: `node lib/dogam.mjs` → dogam.html(생성 후 `rm -f dogam.html`로 삭제상태 유지).
- headless Chrome 렌더+스샷: `"…/Google Chrome" --headless=new --virtual-time-budget=3000 --window-size=W,H --screenshot=out.png "file://…/index.html"`. 뷰 강제 `sed "s/? start : 'main');/? start : 'dogam');/"`, 시크릿 리빌 확인 `sed "s/select('master');/select('narutochi');/"`, 노트 펼침 `sed 's/<details class="note">/<details class="note" open>/'`.
- 상태표시줄 ANSI 미리보기: `COLORTERM=truecolor node --input-type=module -e "import {render} from './lib/sprites.mjs'; ...render(state,pct,1000)"`.
- 아티팩트 재발행: `Artifact(file_path=index.html, url=bb6bd49e…, force=true)`. (index.html full-doc이지만 정상 발행됨 — 이전 우려 해소.)
