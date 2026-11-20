---
layout: page
permalink: /projects/speedlm/
title: speedLM
description: "Built a custom vLLM server that fine-tunes EAGLE-3 draft models on captured local traffic during idle GPU time."
importance: 3
category: work
related_publications: false
---

{% include figure.liquid loading="eager" path="assets/img/projects/speedlm.png" class="img-fluid rounded z-depth-1" zoomable=true alt="speedLM" %}

A serving layer for speculative decoding that puts idle GPU time to work: instead of leaving the accelerator unused between requests, speedLM trains the draft model on that time so the drafts it proposes get accepted more often.

**Built with:** LLM, Speculative Decoding

**GitHub:** [RyanKim17920/speedlm](https://github.com/RyanKim17920/speedlm)

- Built a custom vLLM server that fine-tunes EAGLE-3 draft models on captured local traffic during idle GPU time.
- Raised tokens accepted per verification step 13.4% over the stock draft on held-out Qwen3-8B data.

_July – August 2026_
