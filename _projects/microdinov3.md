---
layout: page
permalink: /projects/microdinov3/
title: microDINOv3
description: DINOv3 self-supervised ViT training system in dependency-free Python.
importance: 2
category: work
related_publications: false
---

{% include figure.liquid loading="eager" path="assets/img/projects/dinov3.png" class="img-fluid rounded z-depth-1" zoomable=true alt="microDINOv3" %}

A recreation of the DINOv3 self-supervised Vision Transformer training pipeline in pure Python, with no external ML framework underneath it — the autograd engine and the transformer are both hand-written.

**Built with:** Pure Python, Computer Vision

**GitHub:** [RyanKim17920/microDINOv3](https://github.com/RyanKim17920/microDINOv3)

- Hand-written reverse-mode autograd and ViT, with zero external ML framework dependencies
- Student-teacher EMA distillation with the DINO and iBOT objectives, plus KoLeo regularization
- Axial RoPE position encoding with register tokens
- Gram anchoring, the piece DINOv3 adds to keep dense features from degrading over long training

_February – April 2026_
