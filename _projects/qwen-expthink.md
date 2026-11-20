---
layout: page
permalink: /projects/qwen-expthink/
title: Qwen3.6-27B ExpThink
description: "Cut thinking tokens 52% in-domain / 34% OOD and truncation 6.0%→2.6% while mean OOD accuracy rose 84%→86% by post-training Qwen3.6-27B with a length-adjusted GRPO reward."
importance: 2
category: work
related_publications: false
---

**Built with:** LLM Post-Training, GRPO

**Weights:** [ryankim17920/qwen3p6-27b-expthink-step60](https://huggingface.co/ryankim17920/qwen3p6-27b-expthink-step60)

- Cut thinking tokens 52% in-domain / 34% OOD and truncation 6.0%→2.6% while mean OOD accuracy rose 84%→86% by post-training Qwen3.6-27B with a length-adjusted GRPO reward.
- Trained with PyTorch FSDP on 8×H100 in verl, with rollouts from tensor-parallel SGLang.

_July – August 2026_
