# 체커 검증용 정답 예시. steps/02_generate.py와 다른 방식(정렬 + 마스크)으로 짰다.
import torch


def sample(logits, temperature=0.6, top_k=20, top_p=0.95):
    probs = (logits.float() / temperature).softmax(-1)
    sorted_p, order = probs.sort(dim=-1, descending=True)
    sorted_p = sorted_p[:, :top_k]
    order = order[:, :top_k]
    before = sorted_p.cumsum(-1) - sorted_p      # 나보다 앞 토큰들의 누적 확률
    sorted_p = sorted_p.masked_fill(before >= top_p, 0.0)
    pick = torch.multinomial(sorted_p / sorted_p.sum(-1, keepdim=True), 1)
    return order.gather(-1, pick)
