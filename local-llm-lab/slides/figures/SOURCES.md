# 그림 출처 후보 (발표용 인용, 비공개 레포)

상태: 2026-11-19에 #1, #2, #3, #4, #7, #8을 내려받음 (파일명 앞 번호 = 표의 #). 나머지는 후보.

| 파일 | 크기 |
|---|---|
| `01-raschka-qwen3-vs-llama3.png` | 1466×925 |
| `02-raschka-qwen3-overview.webp` | 5269×2788 — 실제 내용은 Llama 3.2 1B vs Qwen3 0.6B 나란히 비교 (#1의 고해상도 판) |
| `03-raschka-kv-no-cache.png` | 3659×1677 |
| `04-raschka-kv-cache.png` | 3659×2622 |
| `07-ainslie-gqa.png` | 1848×608 |
| `08-gordic-roofline.png` | 579×406 |

| # | 내용 | 쓸 곳 | 페이지 | 이미지 | 저자 · 제목 · 날짜 | 라이선스 |
|---|---|---|---|---|---|---|
| 1 | Qwen3 0.6B vs Llama 3 1B 비교 (Fig. 18) | 구조 개요 | https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison | https://substack-post-media.s3.amazonaws.com/public/images/9d542035-0713-4c71-8d6d-68e0e37bf0c7_1466x925.png | Sebastian Raschka, "The Big LLM Architecture Comparison", 2025-07-19 | 명시 없음 |
| 2 | Qwen3 dense 구조 개요 | 구조 개요 | https://github.com/rasbt/LLMs-from-scratch/tree/main/ch05/11_qwen3 | https://sebastianraschka.com/images/LLMs-from-scratch-images/bonus/qwen/qwen-overview.webp | Raschka, LLMs-from-scratch "Qwen3 From Scratch" | 레포 Apache-2.0 (이미지는 개인 사이트 호스팅) |
| 3 | 캐시 없는 생성: 매 단계 K/V 재계산 (Fig. 5) | KV 캐시 | https://magazine.sebastianraschka.com/p/coding-the-kv-cache-in-llms | https://substack-post-media.s3.amazonaws.com/public/images/ea5b59d9-6c1b-4aee-8f65-0a85523e9807_3659x1677.png | Raschka, "Understanding and Coding the KV Cache in LLMs from Scratch", 2025-06-17 | 명시 없음 |
| 4 | 캐시 있는 생성 (Fig. 6, #3과 짝) | KV 캐시 | 위와 같음 | https://substack-post-media.s3.amazonaws.com/public/images/711178d4-cb9c-45dc-bd0c-b8d9f476329c_3659x2622.png | 위와 같음 | 명시 없음 |
| 5 | MHA vs GQA (Fig. 2) | GQA | #1 페이지 | https://substack-post-media.s3.amazonaws.com/public/images/647caf83-cd3d-46f8-8bd0-0946bd896ea1_1023x474.png | Raschka, 2025-07-19 | 명시 없음 |
| 6 | GQA 그룹 크기별 KV 메모리 절감 그래프 | GQA / 메모리 | https://github.com/rasbt/LLMs-from-scratch/tree/main/ch04/04_gqa | https://sebastianraschka.com/images/LLMs-from-scratch-images/bonus/gqa-memory/3.webp?4 | Raschka, LLMs-from-scratch "GQA" | #2와 같음 |
| 7 | MHA / GQA / MQA 원 논문 그림 | GQA | https://arxiv.org/abs/2305.13245 | https://arxiv.org/html/2305.13245v3/images/gmq_architecture.png | Ainslie et al., "GQA", 2023 | CC BY 4.0 |
| 8 | Roofline: decode는 메모리 대역폭 병목 | Prefill/decode | https://www.aleksagordic.com/blog/vllm | https://www.aleksagordic.com/blog/vllm/roofline.png | Aleksa Gordić, "Inside vLLM", 2025-08-29 | 명시 없음 |
| 9 | Paged KV 캐시 블록 | Static/dynamic 캐시 | #8 페이지 | https://www.aleksagordic.com/blog/vllm/kv_cache_blocks.png | 위와 같음 | 명시 없음 |
| 10 | 임베딩 → Q/K/V | Attention 기초 | https://jalammar.github.io/illustrated-transformer/ | https://jalammar.github.io/images/t/transformer_self_attention_vectors.png | Jay Alammar, "The Illustrated Transformer", 2018 | CC BY-NC-SA 4.0 |
| 11 | softmax(QKᵀ/√d)V 행렬 형태 | SDPA | #10 페이지 | https://jalammar.github.io/images/t/self-attention-matrix-calculation-2.png | 위와 같음 | CC BY-NC-SA 4.0 |
| 12 | GPT-2 자기회귀 생성 (GIF) | Decode 루프 | https://jalammar.github.io/illustrated-gpt2/ | https://jalammar.github.io/images/xlnet/gpt-2-autoregression-2.gif | Jay Alammar, "The Illustrated GPT-2", 2019 | CC BY-NC-SA 4.0 |
| 13 | 대칭 absmax INT8 양자화 | INT8 | https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-quantization | https://substack-post-media.s3.amazonaws.com/public/images/782beaa8-340f-45b8-ba7f-20491f66867a_1172x848.png | Maarten Grootendorst, "A Visual Guide to Quantization", 2024-07-22 | 명시 없음 |

추가 후보: Gordić `latency_diagram.png` (TTFT·ITL, prefill/decode 섹션), Alammar `/images/gpt2/transformer-attention-mask.png` (causal mask).
참고: Alammar 그림은 NC(비상업) 조건 — 상업 행사라면 확인 필요.
