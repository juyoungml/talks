"""Weight storage exercise: int8 buffers, explicit float dequantization."""
import torch
from torch import nn
from torch.nn import functional as F


class Int8Linear(nn.Module):
    def __init__(self, linear):
        super().__init__()
        weight = linear.weight.detach().float()
        scale = weight.abs().amax(dim=1, keepdim=True).clamp_min(1e-8) / 127
        self.register_buffer("packed_weight", (weight / scale).round().clamp(-127, 127).to(torch.int8))
        self.register_buffer("scale", scale)

    def forward(self, x):
        weight = (self.packed_weight.float() * self.scale).to(x.dtype)
        return F.linear(x, weight)


def quantize_linears(module):
    for name, child in list(module.named_children()):
        if isinstance(child, nn.Linear) and child.bias is None:
            setattr(module, name, Int8Linear(child))
        else:
            quantize_linears(child)


def stored_weight_bytes(model):
    return sum(x.numel() * x.element_size() for x in [*model.parameters(), *model.buffers()])
