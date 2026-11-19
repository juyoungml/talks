"""토큰 하나가 Qwen3-0.6B의 28층을 지나 다음 토큰이 되기까지.

uv run manim -qh --save_sections qwen3_block.py Qwen3BlockFlow

마지막 확률은 '팀은 11월 25일에 데모를 진행하기로'를 model.py(float32, CPU)에 넣은 실제 출력이다.
"""
from manim import *

BG = "#0e1116"
FG = "#e8eaed"
MUTED = "#7d8590"
LINE = "#3a4556"
QC = "#f4d35e"
KC = "#58c4dd"
VC = "#83c167"
XC = "#9aa4b2"
PC = "#c39bd3"   # MLP
RED = "#fc6255"
FONT = "Apple SD Gothic Neo"
config.background_color = BG

Y_RES = -1.6
TOP_PROBS = [("‘ 하’", 0.529), ("‘ 했…’ 바이트 조각", 0.117), ("‘ 한’", 0.087), ("‘ 결정’", 0.074)]


def T(text, size=26, color=FG, weight=NORMAL):
    return Text(text, font=FONT, font_size=size, color=color, weight=weight, line_spacing=0.8)


def M(markup, size=28, color=FG):
    return MarkupText(markup, font=FONT, font_size=size, color=color)


def box(label, w, h, color, size=20, at=ORIGIN):
    rect = RoundedRectangle(width=w, height=h, corner_radius=0.12, stroke_color=color, stroke_width=2.5,
                            fill_color=BG, fill_opacity=1)
    text = T(label, size, color)
    if text.width > w - 0.15:
        text.scale_to_fit_width(w - 0.15)
    return VGroup(rect, text).move_to(at)


def arrow(a, b, color=MUTED, width=2.5):
    return Arrow(a, b, buff=0.06, stroke_width=width, color=color,
                 max_tip_length_to_length_ratio=0.18, max_stroke_width_to_length_ratio=8, tip_length=0.16)


def oplus(at):
    c = Circle(0.2, color=FG, stroke_width=2.5).set_fill(BG, 1)
    return VGroup(c, Line(LEFT * 0.12, RIGHT * 0.12, stroke_width=2.5, color=FG),
                  Line(DOWN * 0.12, UP * 0.12, stroke_width=2.5, color=FG)).move_to(at)


def vec(color=XC, n=6, side=0.17):
    return VGroup(*[Square(side, stroke_width=1.2, stroke_color=color, fill_color=color, fill_opacity=0.9)
                    for _ in range(n)]).arrange(DOWN, buff=0.03)


def p(x, y=Y_RES):
    return [x, y, 0]


class Qwen3BlockFlow(Scene):
    def setup(self):
        self.caption_mob = None

    def caption(self, markup, run_time=0.5):
        new = M(markup, 28).move_to(DOWN * 3.35)
        if new.width > 13.4:
            new.scale_to_fit_width(13.4)
        anims = [FadeIn(new, shift=UP * 0.15)]
        if self.caption_mob is not None:
            anims.append(FadeOut(self.caption_mob, shift=UP * 0.15))
        self.play(*anims, run_time=run_time)
        self.caption_mob = new

    def construct(self):
        # 0. 제목
        self.next_section("intro")
        title = T("Qwen3 블록 따라가기", 52, FG, BOLD)
        sub = T("토큰 하나가 28층을 지나 다음 토큰이 되기까지", 28, MUTED).next_to(title, DOWN, buff=0.35)
        self.play(Write(title), FadeIn(sub, shift=UP * 0.2), run_time=1.5)
        self.wait(0.6)
        self.play(FadeOut(title), FadeOut(sub))

        # 1. 토큰 → 임베딩
        self.next_section("embed")
        sentence = T("…데모를 진행하기로", 30, MUTED).move_to([-3.2, 3.1, 0])
        chips, ids = VGroup(), VGroup()
        for text, tid in [("␣진행", "132876"), ("하기", "66425"), ("로", "17380")]:
            chip = box(text, 1.25, 0.6, FG, 24)
            chips.add(chip)
        chips.arrange(RIGHT, buff=0.25).move_to([-3.2, 2.1, 0])
        for chip, tid in zip(chips, ["132876", "66425", "17380"]):
            ids.add(T(tid, 20, MUTED).next_to(chip, DOWN, buff=0.15))
        self.play(FadeIn(sentence))
        self.caption("문장은 먼저 <b>토큰</b>으로 쪼개지고, 토큰마다 번호(id)가 붙는다")
        self.play(LaggedStart(*[FadeIn(c, shift=DOWN * 0.2) for c in chips], lag_ratio=0.2),
                  LaggedStart(*[FadeIn(i) for i in ids], lag_ratio=0.2), run_time=1.2)
        focus = SurroundingRectangle(VGroup(chips[2], ids[2]), color=QC, buff=0.1, corner_radius=0.1)
        self.play(Create(focus))

        table = Rectangle(width=1.6, height=4.6, stroke_color=LINE, stroke_width=2, fill_color="#151a22", fill_opacity=1)
        table.move_to([2.6, 0.4, 0])
        rows = VGroup(*[Line(table.get_left() + RIGHT * 0.08, table.get_right() + LEFT * 0.08, stroke_width=1, color=LINE)
                        .shift(UP * (2.1 - 0.3 * i)) for i in range(15)])
        rows.move_to(table)
        t_label = T("임베딩 표\n151,936 × 1,024", 22, MUTED).next_to(table, RIGHT, buff=0.3)
        self.caption("id는 <b>임베딩 표</b>의 행 번호 — 해당 행을 꺼내면 1,024차원 벡터 x가 된다")
        self.play(FadeIn(table), FadeIn(rows), FadeIn(t_label), run_time=0.8)
        row = Rectangle(width=1.5, height=0.17, stroke_width=0, fill_color=QC, fill_opacity=0.95).move_to(table).shift(DOWN * 0.9)
        self.play(GrowArrow(arrow(ids[2].get_right(), row.get_left(), QC)), FadeIn(row), run_time=0.8)
        x = vec().move_to([5.0, -0.5, 0])
        x_label = T("x · 1,024", 20, XC).next_to(x, DOWN, buff=0.15)
        self.play(ReplacementTransform(row.copy(), x), FadeIn(x_label), run_time=1.0)
        self.wait(0.4)
        residual = Line(p(-6.6), p(6.6), color=LINE, stroke_width=5)
        r_label = T("residual stream — x가 흘러가는 길", 20, MUTED).next_to(residual, DOWN, buff=0.15).align_to(residual, RIGHT)
        self.play(*[FadeOut(m) for m in [sentence, chips, ids, focus, table, rows, t_label, row, x_label]],
                  *[FadeOut(m) for m in self.mobjects if isinstance(m, Arrow)],
                  x.animate.move_to(p(-6.2, Y_RES + 0.75)), run_time=1.0)
        self.play(Create(residual), FadeIn(r_label), run_time=0.8)
        self.caption("x는 28층을 지나며 조금씩 고쳐 쓰인다 — 각 층은 x에 <b>무언가를 더할</b> 뿐")
        self.wait(0.8)

        # 2. Attention 가지
        self.next_section("attention")
        norm1 = box("RMSNorm", 1.4, 0.6, XC, at=[-5.0, 0.0, 0])
        qp = box("q_proj\n16헤드 × 128", 1.55, 0.72, QC, 18, at=[-3.0, 1.9, 0])
        kp = box("k_proj\n8헤드 × 128", 1.55, 0.72, KC, 18, at=[-3.0, 0.9, 0])
        vp = box("v_proj\n8헤드 × 128", 1.55, 0.72, VC, 18, at=[-3.0, -0.1, 0])
        qkn = box("QK-Norm\n+ RoPE", 1.4, 1.7, QC, 20, at=[-1.0, 1.4, 0])
        cache = box("KV 캐시", 1.3, 1.7, KC, 20, at=[0.8, 0.4, 0])
        attn = box("Attention\nGQA · 16헤드", 1.6, 2.4, FG, 20, at=[2.7, 0.9, 0])
        op = box("o_proj\n2048 → 1024", 1.5, 0.72, FG, 18, at=[4.7, 0.9, 0])
        add1 = oplus(p(4.7))
        a_up = arrow(p(-5.0), norm1.get_bottom())
        a_qkv = VGroup(*[arrow(norm1.get_right(), b.get_left()) for b in (qp, kp, vp)])
        a_qk = VGroup(arrow(qp.get_right(), qkn.get_left() + UP * 0.5, QC), arrow(kp.get_right(), qkn.get_left() + DOWN * 0.5, KC))
        a_kc = VGroup(arrow(qkn.get_right() + DOWN * 0.5, cache.get_left() + UP * 0.5, KC),
                      arrow(vp.get_right(), cache.get_left() + DOWN * 0.5, VC))
        a_q = arrow(qkn.get_right() + UP * 0.5, attn.get_left() + UP * 1.0, QC)
        a_ca = arrow(cache.get_right(), attn.get_left() + DOWN * 0.5, KC)
        a_op = arrow(attn.get_right(), op.get_left())
        a_down = arrow(op.get_bottom(), add1.get_top())

        self.caption("<b>Attention 가지</b> — 먼저 RMSNorm으로 x의 크기를 정규화한다")
        self.play(x.animate.move_to(p(-5.0, Y_RES + 0.75)), run_time=0.5)
        self.play(GrowArrow(a_up), FadeIn(norm1), run_time=0.7)
        self.caption("q는 <span foreground='#f4d35e'>16헤드</span>, k·v는 <span foreground='#58c4dd'>8헤드</span> — 두 q 헤드가 k·v 하나를 나눠 쓴다 (GQA)")
        self.play(LaggedStart(*[AnimationGroup(GrowArrow(a), FadeIn(b)) for a, b in zip(a_qkv, (qp, kp, vp))], lag_ratio=0.25), run_time=1.3)
        self.wait(0.5)
        self.caption("Qwen3의 특징: q, k에 RMSNorm을 한 번 더 (<b>QK-Norm</b>), 그리고 <b>RoPE</b>로 위치만큼 회전")
        self.play(LaggedStart(*[GrowArrow(a) for a in a_qk], lag_ratio=0.2), FadeIn(qkn), run_time=0.9)
        self.wait(0.6)
        self.caption("k, v는 <span foreground='#58c4dd'>KV 캐시</span>에 쌓이고, attention은 캐시 전체를 본다")
        self.play(LaggedStart(*[GrowArrow(a) for a in a_kc], lag_ratio=0.2), FadeIn(cache), run_time=0.9)
        self.play(GrowArrow(a_q), GrowArrow(a_ca), FadeIn(attn), run_time=0.9)
        self.wait(0.4)
        self.caption("o_proj로 1,024차원으로 돌려 residual에 <b>더한다</b> — x ← x + attn(x)")
        self.play(GrowArrow(a_op), FadeIn(op), run_time=0.6)
        self.play(GrowArrow(a_down), FadeIn(add1), run_time=0.6)
        self.play(x.animate.move_to(p(4.7, Y_RES + 0.75)), Indicate(add1, color=QC), run_time=1.0)
        self.wait(0.6)
        detail = VGroup(norm1, qp, kp, vp, qkn, cache, attn, op, a_up, a_qkv, a_qk, a_kc, a_q, a_ca, a_op, a_down)

        # 3. MLP 가지 — 먼저 attention을 작은 상자로 접는다
        self.next_section("mlp")
        att_small = box("Attention", 1.5, 0.6, KC, at=[-4.6, -0.5, 0])
        add1_small = oplus(p(-3.6))
        att_links = VGroup(arrow(p(-5.5), att_small.get_left() + DOWN * 0.1, KC),
                           arrow(att_small.get_right() + DOWN * 0.1, add1_small.get_top(), KC))
        self.play(ReplacementTransform(detail, att_small), ReplacementTransform(add1, add1_small),
                  FadeIn(att_links), x.animate.move_to(p(-3.0, Y_RES + 0.75)), run_time=1.0)
        norm2 = box("RMSNorm", 1.4, 0.6, XC, at=[-2.3, 0.3, 0])
        gate = box("gate_proj\n1024 → 3072", 1.7, 0.72, PC, 18, at=[-0.2, 1.4, 0])
        up = box("up_proj\n1024 → 3072", 1.7, 0.72, PC, 18, at=[-0.2, 0.2, 0])
        mix = box("SiLU(gate) ⊙ up", 2.0, 0.72, PC, 20, at=[2.3, 0.8, 0])
        down = box("down_proj\n3072 → 1024", 1.7, 0.72, PC, 18, at=[4.9, 0.8, 0])
        add2 = oplus(p(4.9))
        m_arrows = VGroup(
            arrow(p(-2.3), norm2.get_bottom()),
            arrow(norm2.get_right(), gate.get_left()), arrow(norm2.get_right(), up.get_left()),
            arrow(gate.get_right(), mix.get_left() + UP * 0.15, PC), arrow(up.get_right(), mix.get_left() + DOWN * 0.15, PC),
            arrow(mix.get_right(), down.get_left(), PC), arrow(down.get_bottom(), add2.get_top(), PC),
        )
        self.caption("<span foreground='#c39bd3'><b>MLP 가지 (SwiGLU)</b></span> — 다시 RMSNorm, 그리고 1,024 → 3,072로 넓힌다")
        self.play(x.animate.move_to(p(-2.3, Y_RES + 0.75)), run_time=0.4)
        self.play(GrowArrow(m_arrows[0]), FadeIn(norm2), run_time=0.6)
        self.play(GrowArrow(m_arrows[1]), GrowArrow(m_arrows[2]), FadeIn(gate), FadeIn(up), run_time=0.8)
        self.wait(0.4)
        self.caption("gate에 SiLU를 씌워 up과 원소별로 곱한다 — 무엇을 통과시킬지 고르는 ‘문’")
        self.play(GrowArrow(m_arrows[3]), GrowArrow(m_arrows[4]), FadeIn(mix), run_time=0.8)
        self.wait(0.6)
        self.caption("down_proj로 다시 1,024로 줄여 더한다 — x ← x + mlp(x)")
        self.play(GrowArrow(m_arrows[5]), FadeIn(down), run_time=0.6)
        self.play(GrowArrow(m_arrows[6]), FadeIn(add2), run_time=0.6)
        self.play(x.animate.move_to(p(4.9, Y_RES + 0.75)), Indicate(add2, color=PC), run_time=1.0)
        self.caption("여기까지가 <b>층 하나</b> — 가중치 15.7M개 (attention 6.3M + MLP 9.4M)")
        self.wait(1.2)
        mlp_detail = VGroup(norm2, gate, up, mix, down, m_arrows)

        # 4. 28층 쌓기
        self.next_section("stack")
        mlp_small = box("MLP", 1.2, 0.6, PC, at=[-2.0, -0.5, 0])
        add2_small = oplus(p(-1.1))
        mlp_links = VGroup(arrow(p(-2.9), mlp_small.get_left() + DOWN * 0.1, PC),
                           arrow(mlp_small.get_right() + DOWN * 0.1, add2_small.get_top(), PC))
        self.play(ReplacementTransform(mlp_detail, mlp_small), ReplacementTransform(add2, add2_small),
                  FadeIn(mlp_links), x.animate.move_to(p(-0.6, Y_RES + 0.75)), run_time=1.0)
        block = VGroup(att_small, att_links, add1_small, mlp_small, mlp_links, add2_small)
        block_frame = SurroundingRectangle(block, color=MUTED, buff=0.15, corner_radius=0.12, stroke_width=1.5)
        b_label = T("층 1", 20, MUTED).next_to(block_frame, UP, buff=0.1)
        self.play(Create(block_frame), FadeIn(b_label), run_time=0.6)
        self.wait(0.3)

        tiles = VGroup(*[
            VGroup(RoundedRectangle(width=0.34, height=0.5, corner_radius=0.06, stroke_width=0, fill_color=KC, fill_opacity=0.85).shift(UP * 0.28),
                   RoundedRectangle(width=0.34, height=0.5, corner_radius=0.06, stroke_width=0, fill_color=PC, fill_opacity=0.85).shift(DOWN * 0.28))
            for _ in range(28)
        ]).arrange(RIGHT, buff=0.08).move_to([0.2, 0.3, 0])
        self.caption("같은 모양의 블록을 <b>28번</b> 반복한다 — 층마다 가중치는 다르다")
        first = tiles[0]
        self.play(ReplacementTransform(VGroup(block, block_frame), first), FadeOut(b_label),
                  x.animate.move_to(p(-6.2, Y_RES + 0.75)), run_time=1.0)
        self.play(LaggedStart(*[FadeIn(t, shift=RIGHT * 0.1) for t in tiles[1:]], lag_ratio=0.04), run_time=1.2)
        counter = T("0", 40, FG, BOLD).move_to([5.6, 2.6, 0])
        c_label = T("층", 22, MUTED).move_to([4.95, 2.6, 0])
        c_total = T("/ 28", 22, MUTED).move_to([6.35, 2.6, 0])
        self.play(FadeIn(counter), FadeIn(c_label), FadeIn(c_total), run_time=0.3)
        for i, tile in enumerate(tiles):
            rt = 0.22 if 2 < i < 25 else 0.4
            self.play(x.animate.move_to([tile.get_x(), Y_RES + 0.75, 0]), Indicate(tile, scale_factor=1.25, color=QC),
                      Transform(counter, T(str(i + 1), 40, FG, BOLD).move_to([5.6, 2.6, 0])), run_time=rt, rate_func=linear)
        self.caption("28 × 15.7M = 440M — 가중치 대부분이 여기 있다 (나머지 156M은 임베딩 표)")
        self.wait(1.0)

        # 5. LM head → 다음 토큰
        self.next_section("head")
        stack_small = box("28층", 1.4, 0.8, FG, 24, at=[-5.3, 0.2, 0])
        self.play(ReplacementTransform(tiles, stack_small), FadeOut(counter), FadeOut(c_label), FadeOut(c_total),
                  x.animate.move_to(p(-3.9, Y_RES + 0.75)), run_time=0.9)
        fnorm = box("RMSNorm", 1.4, 0.6, XC, at=[-2.6, 0.2, 0])
        head = box("LM head\n1024 → 151,936", 1.9, 0.9, QC, 20, at=[-0.4, 0.2, 0])
        h_note = T("임베딩 표를 그대로 재사용\n(tie_word_embeddings)", 18, MUTED).next_to(head, UP, buff=0.2)
        h_arrows = VGroup(arrow(p(-3.9), fnorm.get_bottom()), arrow(fnorm.get_right(), head.get_left()))
        self.caption("마지막 RMSNorm 뒤 <b>LM head</b> — x를 어휘 151,936개 각각의 점수(logit)로 바꾼다")
        self.play(GrowArrow(h_arrows[0]), FadeIn(fnorm), run_time=0.6)
        self.play(GrowArrow(h_arrows[1]), FadeIn(head), FadeIn(h_note), run_time=0.8)
        self.wait(0.6)

        bars = VGroup()
        for i, (label, prob) in enumerate(TOP_PROBS):
            color = QC if i == 0 else XC
            bar = Rectangle(width=max(0.08, prob * 5.0), height=0.42, stroke_width=0, fill_color=color, fill_opacity=0.9)
            name = T(label, 22, color).next_to(bar, LEFT, buff=0.25)
            value = T(f"{prob * 100:.0f}%", 20, color).next_to(bar, RIGHT, buff=0.15)
            row = VGroup(name, bar, value)
            bars.add(row)
        bars.arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        for row in bars:
            row[1].align_to(bars[0][1], LEFT)
            row[0].next_to(row[1], LEFT, buff=0.25)
            row[2].next_to(row[1], RIGHT, buff=0.15)
        bars.move_to([4.2, 0.3, 0])
        bars_title = T("softmax 확률 — 상위 4개 (실제 출력)", 20, MUTED).next_to(bars, UP, buff=0.3)
        self.caption("softmax로 확률을 만들고, 가장 높은 토큰을 고른다 (greedy)")
        self.play(GrowArrow(arrow(head.get_right(), bars.get_left() + LEFT * 0.1, QC)), FadeIn(bars_title), run_time=0.6)
        self.play(LaggedStart(*[GrowFromEdge(r[1], LEFT) for r in bars], lag_ratio=0.15),
                  LaggedStart(*[FadeIn(r[0]) for r in bars], lag_ratio=0.15),
                  LaggedStart(*[FadeIn(r[2]) for r in bars], lag_ratio=0.15), run_time=1.4)
        self.play(Indicate(bars[0], color=QC, scale_factor=1.08), run_time=0.8)
        nxt = M("…진행하기로 <span foreground='#f4d35e'><b>␣하</b></span>", 34).move_to([0, 2.9, 0])
        self.caption("‘ 하’(53%)를 붙이고 다시 처음부터 — 이것이 decode 루프 (다음 토큰은 KV 캐시 덕에 1개만 넣는다)")
        self.play(FadeIn(nxt, shift=DOWN * 0.2), run_time=0.8)
        self.wait(2.5)
