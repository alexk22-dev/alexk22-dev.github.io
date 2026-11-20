// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/standard/";
    },
  },{id: "nav-publications",
          title: "publications",
          description: "Publications by Ryan Kim — a sole-author paper under review, two NeurIPS 2026 workshop papers, an arXiv preprint, and an ACRO 2026 abstract.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "All code on GitHub at github.com/RyanKim17920.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "CV of Ryan Kim — CS at UIUC (Class of 2029). First-author paper at a NeurIPS 2026 workshop · Sole-author paper under review · Founding team, a16z AI startup.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "projects-deepmoe-reproduction",
          title: 'DeepMoE Reproduction',
          description: "PyTorch reproduction of &quot;Deep Mixture of Experts via Shallow Embedding,&quot; recovering the paper&#39;s accuracy-vs-compute tradeoff on CIFAR-10.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/deepmoe/";
            },},{id: "projects-which-state-should-prediction-read",
          title: 'Which State Should Prediction Read?',
          description: "Sole-author paper, under review.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/mechanistic-sps/";
            },},{id: "projects-microdinov3",
          title: 'microDINOv3',
          description: "DINOv3 self-supervised ViT training system in dependency-free Python.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/microdinov3/";
            },},{id: "projects-llm-autoresearch-agent-nanopath",
          title: 'LLM Autoresearch Agent (NanoPath)',
          description: "LLM autoresearch agent with dual-branch search and anti-overfitting cycles (3rd-author paper, accepted at a NeurIPS 2026 workshop).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/nanopath-autoresearch/";
            },},{id: "projects-qwen3-6-27b-expthink",
          title: 'Qwen3.6-27B ExpThink',
          description: "Cut thinking tokens 52% in-domain / 34% OOD and truncation 6.0%→2.6% while mean OOD accuracy rose 84%→86% by post-training Qwen3.6-27B with a length-adjusted GRPO reward.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/qwen-expthink/";
            },},{id: "projects-spectra",
          title: 'SPECTRA',
          description: "Label-free contrastive LoRA fine-tuning (first-author paper, accepted at a NeurIPS 2026 workshop).",
          section: "Projects",handler: () => {
              window.location.href = "/projects/spectra/";
            },},{id: "projects-speedlm",
          title: 'speedLM',
          description: "Built a custom vLLM server that fine-tunes EAGLE-3 draft models on captured local traffic during idle GPU time.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/speedlm/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%72%79%61%6E%6B%69%6D%31%37%39%32%30@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/RyanKim17920", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/ryankim17920", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
