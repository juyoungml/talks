// examples/steps/*.pass{1,2}.txt 두 번 측정의 평균 (M3 Pro, 회의록 638토큰, 48토큰 생성)
// Ollama는 steps/09_compare.py 의 demo_ollama 결과 (temperature 0, 프롬프트 캐시 없이)
window.SCORES = {
  ollama: { first: 155, rate: 86.8 },
  ollamaQ4: { first: 167, rate: 169.1 },
  chapters: {
    "01": { first: 238, rate: null },
    "02": { first: 267, rate: 3.6 },
    "04": { first: 255, rate: 37.9 },
    "05": { first: 182, rate: 44.0 },
    "06": { first: 234, rate: 45.0 },
    "07": { first: 258, rate: 65.7 },
    "08": { first: 234, rate: 92.2 },
  },
  note: "같은 M3 Pro · FP16 · 같은 회의록. 두 번 잰 평균이고, 실행할 때마다 10~20% 흔들립니다.",
};
