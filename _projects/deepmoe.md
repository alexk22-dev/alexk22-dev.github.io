---
layout: page
permalink: /projects/deepmoe/
title: DeepMoE Reproduction
description: PyTorch reproduction of "Deep Mixture of Experts via Shallow Embedding," recovering the paper's accuracy-vs-compute tradeoff on CIFAR-10.
importance: 4
category: work
related_publications: false
---

{% include figure.liquid loading="eager" path="assets/img/projects/deep-moe.png" class="img-fluid rounded z-depth-1" zoomable=true alt="DeepMoE Reproduction" %}

A PyTorch reproduction of "Deep Mixture of Experts via Shallow Embedding," written from the paper with no reference implementation available. The goal was the paper's central qualitative claim — that channel-wise gating buys accuracy back at a fraction of the compute — and then a look at where its training recipe breaks down.

**Built with:** PyTorch, Computer Vision

**GitHub:** [RyanKim17920/Deep-Mixture-of-Experts-via-Shallow-Embedding](https://github.com/RyanKim17920/Deep-Mixture-of-Experts-via-Shallow-Embedding)

### The tradeoff curve

On CIFAR-10, two points that bracket the baseline:

| Model        | Accuracy | FLOPs (rel. baseline) |
| ------------ | -------- | --------------------- |
| Baseline     | 82.65%   | 100%                  |
| DeepMoE      | 79.85%   | 28.4%                 |
| Wide-DeepMoE | 81.22%   | 67.8%                 |

Roughly a third of the compute for ~3 points of accuracy, or two thirds for ~1.4 — the accuracy-vs-compute shape the paper describes.

### Where the recipe breaks

- **Training diverges at the paper's learning rate.** At lr 0.1 the gated model blows up while an identically-configured baseline trains stably, which points at gate scaling rather than the optimizer or the data pipeline.
- **No expert collapse.** Dead channels fall from 92 to 0 over training — the gates spread out rather than latching onto a fixed subset, which is the failure mode this kind of architecture is usually accused of.
- **Pruning follows cost, not the penalty.** The trained model prunes hardest in the expensive 512-channel layers (~3% of channels kept) — inverted from where it starts at initialization — even though the L1 penalty on the gates is uniform and carries no notion of per-layer compute.

### Caveats

This is not a reproduction of the paper's tables, and does not claim to be. Training runs 30 epochs rather than 350; the stem is ImageNet-style applied to 32x32 inputs; and FLOPs are computed analytically from the gate activations, not measured as wall-clock time.

_July – November 2024_
