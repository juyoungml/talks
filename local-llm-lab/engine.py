"""One request at a time, with selectable checkpoint implementations."""
import torch

from cache import DynamicKVCache, StaticKVCache


class Request:
    def __init__(self, model, prompt_ids, version, capacity, compiled_decode=None):
        self.model = model
        self.prompt_ids = prompt_ids
        self.history = prompt_ids
        self.steps = 0
        self.use_sdpa = version >= 5
        self.compiled_decode = compiled_decode
        self.trace = []
        self.cache = None
        layers = len(model.layers)
        if version >= 6:
            self.cache = StaticKVCache(layers, capacity)
        elif version >= 4:
            self.cache = DynamicKVCache(layers)

    def next_logits(self, previous_id=None):
        start = 0
        if self.steps == 0:
            model_input = self.prompt_ids
        elif self.cache is None:
            self.history = torch.cat((self.history, previous_id), dim=1)
            model_input = self.history
        else:
            model_input = previous_id
            start = self.prompt_ids.shape[1] + self.steps - 1

        if self.steps and self.compiled_decode is not None:
            logits = self.compiled_decode(model_input, self.cache, start)
        else:
            logits = self.model(model_input, self.cache, start, self.use_sdpa)
        self.steps += 1
        self.trace.append((model_input.shape[1], start + model_input.shape[1]))
        return logits[:, -1, :]

    def memory(self):
        return self.cache.memory() if self.cache is not None else (0, 0)


def choose(logits):
    return logits.argmax(dim=-1, keepdim=True)
