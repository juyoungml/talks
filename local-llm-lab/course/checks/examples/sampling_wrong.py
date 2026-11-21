# 체커 검증용 오답 예시. 흔한 실수 두 가지가 들어 있다.
#   1) temperature를 빠뜨림
#   2) top_p를 cumsum < p로 잘라서, 누적이 p에 닿는 토큰을 버림
import torch


def sample(logits, temperature=0.6, top_k=20, top_p=0.95):
    probs = logits.float().softmax(-1)
    probs, idx = probs.topk(top_k)
    keep = probs.cumsum(-1) < top_p
    probs = probs * keep
    choice = torch.multinomial(probs / probs.sum(), 1)
    return idx.gather(-1, choice)
