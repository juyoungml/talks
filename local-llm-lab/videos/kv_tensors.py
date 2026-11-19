"""KV 캐시를 텐서 관점에서 보여주는 영상.

uv run manim -qh --save_sections kv_tensors.py KVCacheTensors
"""
import numpy as np
from manim import *

BG = "#0e1116"
FG = "#e8eaed"
MUTED = "#7d8590"
QC = "#f4d35e"   # query
KC = "#58c4dd"   # key / KV 캐시
VC = "#83c167"   # value
RED = "#fc6255"  # 다시 계산
XC = "#9aa4b2"   # 임베딩
OC = "#c39bd3"   # attention 출력
FONT = "Apple SD Gothic Neo"

config.background_color = BG

TOKENS = ["팀은", "11월", "25일에", "데모를", "진행", "하기로", "했다"]
GEN = 5                     # 5번째 인덱스부터 생성된 토큰
PITCH, X0 = 1.45, -5.6
Y_TOK, Y_X, Y_K, Y_V = 2.85, 1.85, 0.3, -1.1
PANEL_X = 5.6
SCORES = [0.4, 1.2, 0.3, 2.1, 0.8, 1.5, 0.9]


def colx(i):
    return X0 + PITCH * i


def T(text, size=28, color=FG, weight=NORMAL):
    return Text(text, font=FONT, font_size=size, color=color, weight=weight)


def M(markup, size=28, color=FG):
    return MarkupText(markup, font=FONT, font_size=size, color=color)


def vec(color, fill=0.9, side=0.26):
    return VGroup(*[
        Square(side, stroke_width=1.5, stroke_color=color, fill_color=color, fill_opacity=fill)
        for _ in range(3)
    ]).arrange(DOWN, buff=0.04)


def softmax(xs):
    e = np.exp(np.array(xs) - max(xs))
    return e / e.sum()


class KVCacheTensors(Scene):
    def setup(self):
        self.caption_mob = None
        self.counter_mob = None

    # ---------- helpers ----------
    def caption(self, markup, run_time=0.6):
        new = M(markup, 30).move_to(DOWN * 3.3)
        if self.caption_mob is None:
            self.play(FadeIn(new, shift=UP * 0.15), run_time=run_time)
        else:
            self.play(FadeOut(self.caption_mob, shift=UP * 0.15), FadeIn(new, shift=UP * 0.15), run_time=run_time)
        self.caption_mob = new

    def counter(self, label, value, color=FG):
        group = VGroup(T(label, 20, MUTED), T(value, 40, color, BOLD)).arrange(DOWN, buff=0.08)
        group.move_to([PANEL_X, Y_TOK + 0.05, 0])
        if self.counter_mob is None:
            self.play(FadeIn(group), run_time=0.4)
        else:
            self.play(FadeOut(self.counter_mob), FadeIn(group), run_time=0.4)
        self.counter_mob = group

    def token(self, i):
        return T(TOKENS[i], 26, VC if i >= GEN else FG).move_to([colx(i), Y_TOK, 0])

    def attention(self, q, ks, vs, scores, fast=False):
        """q 복사본이 각 k와 만나 점수 → softmax 가중치 → v 가중합 = 출력 o."""
        rt = 0.6 if fast else 1.0
        copies = [q.copy() for _ in ks]
        self.play(LaggedStart(*[
            c.animate.scale(0.7).next_to(k, RIGHT, buff=0.12) for c, k in zip(copies, ks)
        ], lag_ratio=0.08), run_time=rt * 1.4)
        score_txt = [T(f"{s:.1f}", 22, QC).next_to(k, RIGHT, buff=0.12) for s, k in zip(scores, ks)]
        self.play(*[ReplacementTransform(c, s) for c, s in zip(copies, score_txt)], run_time=rt * 0.8)
        weights = softmax(scores)
        weight_txt = [T(f"{w:.2f}", 22, FG).move_to(s) for w, s in zip(weights, score_txt)]
        self.play(*[ReplacementTransform(s, w) for s, w in zip(score_txt, weight_txt)], run_time=rt * 0.8)
        o = vec(OC).move_to([PANEL_X, Y_V, 0])
        v_copies = [v.copy() for v in vs]
        self.play(LaggedStart(*[
            c.animate.move_to(o).scale(0.4 + 1.2 * w).set_opacity(0.25 + 0.75 * w)
            for c, w in zip(v_copies, weights)
        ], lag_ratio=0.06), run_time=rt * 1.4)
        self.play(FadeOut(VGroup(*v_copies)), FadeIn(o), run_time=rt * 0.5)
        return VGroup(*weight_txt), o

    # ---------- scene ----------
    def construct(self):
        # 0. 제목
        self.next_section("intro")
        title = T("KV 캐시, 텐서로 보기", 52, FG, BOLD)
        sub = T("다음 토큰 하나를 만들 때 실제로 계산하는 것", 28, MUTED).next_to(title, DOWN, buff=0.35)
        self.play(Write(title), FadeIn(sub, shift=UP * 0.2), run_time=1.5)
        self.wait(0.8)
        self.play(FadeOut(title), FadeOut(sub))

        # 1. 토큰 하나 → q, k, v
        self.next_section("qkv")
        toks = [self.token(i) for i in range(len(TOKENS))]
        row_labels = VGroup(
            T("x", 26, XC).move_to([-6.75, Y_X, 0]),
            T("k", 26, KC).move_to([-6.75, Y_K, 0]),
            T("v", 26, VC).move_to([-6.75, Y_V, 0]),
        )
        self.play(LaggedStart(*[FadeIn(t, shift=DOWN * 0.2) for t in toks[:6]], lag_ratio=0.1), run_time=1.2)
        cur = 5
        focus = SurroundingRectangle(toks[cur], color=QC, buff=0.1, corner_radius=0.08)
        xs = [vec(XC).move_to([colx(i), Y_X, 0]) for i in range(len(TOKENS))]
        self.play(Create(focus), FadeIn(xs[cur], shift=DOWN * 0.2), FadeIn(row_labels[0]))
        self.caption("토큰은 먼저 <b>임베딩 벡터 x</b>가 된다")

        ks = [vec(KC).move_to([colx(i), Y_K, 0]) for i in range(len(TOKENS))]
        vs = [vec(VC).move_to([colx(i), Y_V, 0]) for i in range(len(TOKENS))]
        q = vec(QC).move_to([PANEL_X, Y_K, 0])
        q_label = T("q (지금 토큰)", 22, QC).next_to(q, UP, buff=0.2)

        a_k = Arrow(xs[cur].get_bottom(), ks[cur].get_top(), buff=0.08, stroke_width=3, color=KC, max_tip_length_to_length_ratio=0.2)
        l_k = M("× W<sub>K</sub>", 20, KC).next_to(a_k, RIGHT, buff=0.08)
        a_v = CurvedArrow(xs[cur].get_left() + LEFT * 0.05, vs[cur].get_left() + LEFT * 0.05, angle=PI / 2.2, color=VC, stroke_width=3, tip_length=0.18)
        l_v = M("× W<sub>V</sub>", 20, VC).next_to(a_v, LEFT, buff=0.08)
        a_q = Arrow(xs[cur].get_right(), q.get_left(), buff=0.12, stroke_width=3, color=QC, max_tip_length_to_length_ratio=0.06)
        l_q = M("× W<sub>Q</sub>", 20, QC).next_to(a_q.get_center(), UP, buff=0.12)
        self.caption("x에 가중치 행렬 세 개를 곱해 <span foreground='#f4d35e'>q</span>, <span foreground='#58c4dd'>k</span>, <span foreground='#83c167'>v</span>를 만든다")
        self.play(GrowArrow(a_k), FadeIn(l_k), GrowFromCenter(ks[cur]), FadeIn(row_labels[1]), run_time=0.9)
        self.play(Create(a_v), FadeIn(l_v), GrowFromCenter(vs[cur]), FadeIn(row_labels[2]), run_time=0.9)
        self.play(GrowArrow(a_q), FadeIn(l_q), GrowFromCenter(q), FadeIn(q_label), run_time=0.9)
        self.wait(1.0)
        arrows = VGroup(a_k, l_k, a_v, l_v, a_q, l_q)

        # 2. attention: q는 지금 토큰, k·v는 모든 토큰
        self.next_section("attention")
        self.play(FadeOut(arrows), run_time=0.5)
        self.caption("하지만 attention에는 <b>이전 토큰 전부</b>의 k, v가 필요하다")
        self.play(
            LaggedStart(*[FadeIn(xs[i]) for i in range(cur)], lag_ratio=0.05),
            LaggedStart(*[GrowFromCenter(ks[i]) for i in range(cur)], lag_ratio=0.08),
            LaggedStart(*[GrowFromCenter(vs[i]) for i in range(cur)], lag_ratio=0.08),
            run_time=1.4,
        )
        self.wait(0.4)
        self.caption("q · k → 점수 → softmax 가중치 → v의 가중합 = 출력")
        o_label = T("출력 o", 22, OC).next_to([PANEL_X, Y_V, 0], DOWN, buff=0.55)
        weights, o = self.attention(q, ks[:cur + 1], vs[:cur + 1], SCORES[:cur + 1])
        self.play(FadeIn(o_label), run_time=0.4)
        nxt = T("→ 다음 토큰", 22, MUTED).next_to(o_label, DOWN, buff=0.25)
        self.play(FadeIn(nxt), FadeIn(toks[6], shift=DOWN * 0.2), focus.animate.move_to(toks[6]), run_time=0.9)
        self.wait(1.0)

        # 3. 캐시 없음: 다음 단계에서 k, v를 전부 다시
        self.next_section("no_cache")
        self.caption("<span foreground='#fc6255'><b>캐시 없음</b></span> — 다음 단계는 7토큰 전체를 처음부터 다시 넣는다")
        self.play(
            FadeOut(weights), FadeOut(o), FadeOut(o_label), FadeOut(nxt), FadeOut(q), FadeOut(q_label),
            *[FadeOut(ks[i]) for i in range(cur + 1)], *[FadeOut(vs[i]) for i in range(cur + 1)],
            FadeIn(xs[6], shift=DOWN * 0.2), run_time=0.9,
        )
        self.counter("이번 단계 k·v 계산", "0쌍", RED)
        redo_k = [vec(RED).move_to(ks[i]) for i in range(6)] + [ks[6]]
        redo_v = [vec(RED).move_to(vs[i]) for i in range(6)] + [vs[6]]
        self.play(
            LaggedStart(*[
                AnimationGroup(Indicate(xs[i], color=RED, scale_factor=1.15), GrowFromCenter(redo_k[i]), GrowFromCenter(redo_v[i]))
                for i in range(7)
            ], lag_ratio=0.18),
            run_time=2.6,
        )
        self.counter("이번 단계 k·v 계산", "7쌍", RED)
        self.caption("빨간 k, v 6쌍은 <span foreground='#fc6255'>지난 단계와 똑같은 값</span> — 토큰이 늘수록 반복도 늘어난다")
        self.wait(1.5)

        # 4. KV 캐시: 저장해 두고 새 토큰 것만 계산
        self.next_section("kv_cache")
        self.caption("<span foreground='#58c4dd'><b>KV 캐시</b></span> — 한 번 계산한 k, v를 저장해 두면?")
        self.play(*[ReplacementTransform(redo_k[i], ks[i].copy()) for i in range(6)],
                  *[ReplacementTransform(redo_v[i], vs[i].copy()) for i in range(6)],
                  FadeOut(redo_k[6]), FadeOut(redo_v[6]), run_time=0.8)
        # ReplacementTransform 결과물을 정리하고 원본으로 교체
        self.remove(*self.mobjects)
        self.add(*toks, focus, *xs, row_labels, *ks[:6], *vs[:6], self.caption_mob, self.counter_mob)
        def cache_box(n):
            return SurroundingRectangle(VGroup(*ks[:n], *vs[:n]), color=KC, buff=0.22, corner_radius=0.15, stroke_width=3)
        box = cache_box(6)
        box_label = T("KV 캐시", 24, KC, BOLD).next_to(box, DOWN, buff=0.12).align_to(box, LEFT)
        self.play(Create(box), FadeIn(box_label), run_time=0.9)
        self.counter("이번 단계 k·v 계산", "0쌍", KC)
        self.caption("새 토큰 ‘했다’의 x에서만 k, v를 계산해 캐시 끝에 붙인다")
        a_k = Arrow(xs[6].get_bottom(), ks[6].get_top(), buff=0.08, stroke_width=3, color=KC, max_tip_length_to_length_ratio=0.2)
        self.play(Indicate(xs[6], color=QC), GrowArrow(a_k), run_time=0.7)
        self.play(GrowFromCenter(ks[6]), GrowFromCenter(vs[6]), Transform(box, cache_box(7)),
                  box_label.animate.next_to(cache_box(7), DOWN, buff=0.12).align_to(cache_box(7), LEFT), run_time=0.9)
        self.play(FadeOut(a_k), run_time=0.3)
        self.counter("이번 단계 k·v 계산", "1쌍", KC)
        q2 = vec(QC).move_to([PANEL_X, Y_K, 0])
        q2_label = T("q (지금 토큰)", 22, QC).next_to(q2, UP, buff=0.2)
        a_q = Arrow(xs[6].get_right(), q2.get_left(), buff=0.12, stroke_width=3, color=QC, max_tip_length_to_length_ratio=0.1)
        self.caption("q는 지금 토큰 것만 있으면 된다 — 쓰고 나면 버린다")
        self.play(GrowArrow(a_q), GrowFromCenter(q2), FadeIn(q2_label), run_time=0.8)
        self.play(FadeOut(a_q), run_time=0.3)
        self.caption("새 q 하나 × 캐시에 있는 k 전부 → 같은 attention, 계산은 훨씬 적게")
        weights, o = self.attention(q2, ks, vs, SCORES, fast=True)
        self.wait(1.2)

        # 5. 정리
        self.next_section("summary")
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
        self.caption_mob = None
        self.counter_mob = None
        lines = VGroup(
            M("<span foreground='#f4d35e'><b>q</b></span>  지금 토큰만 쓴다 → 저장하지 않는다", 30),
            M("<span foreground='#58c4dd'><b>k</b></span>, <span foreground='#83c167'><b>v</b></span>  이후 모든 토큰이 다시 쓴다 → <span foreground='#58c4dd'>KV 캐시</span>에 저장", 30),
            M("그래서 decode 단계는 <b>새 토큰 1개</b>만 넣는다 — forward 길이 [T, 1, 1, …]", 30),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.55)
        self.play(LaggedStart(*[FadeIn(l, shift=RIGHT * 0.3) for l in lines], lag_ratio=0.5), run_time=2.4)
        self.wait(2.5)
