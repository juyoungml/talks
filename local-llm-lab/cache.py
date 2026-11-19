"""Per-layer KV storage. Both implementations expose the filled prefix."""


def tensor_bytes(*tensors):
    return sum(t.numel() * t.element_size() for t in tensors)


class DynamicKVCache:
    def __init__(self, layers):
        self.entries = [None] * layers

    def update(self, layer, start, key, value):
        import torch

        if self.entries[layer] is not None:
            old_key, old_value = self.entries[layer]
            key = torch.cat((old_key, key), dim=2)
            value = torch.cat((old_value, value), dim=2)
        self.entries[layer] = key, value
        return key, value

    def memory(self):
        used = sum(tensor_bytes(*entry) for entry in self.entries if entry is not None)
        return used, used


class StaticKVCache:
    def __init__(self, layers, capacity):
        self.entries = [None] * layers
        self.capacity = capacity
        self.length = 0

    def update(self, layer, start, key, value):
        end = start + key.shape[2]
        if end > self.capacity:
            raise ValueError("KV capacity exceeded")
        if self.entries[layer] is None:
            shape = (*key.shape[:2], self.capacity, key.shape[-1])
            self.entries[layer] = key.new_empty(shape), value.new_empty(shape)
        keys, values = self.entries[layer]
        keys[:, :, start:end].copy_(key)
        values[:, :, start:end].copy_(value)
        self.length = end
        return keys[:, :, :end], values[:, :, :end]

    def memory(self):
        reserved = sum(tensor_bytes(*entry) for entry in self.entries if entry is not None)
        return reserved * self.length // self.capacity, reserved
