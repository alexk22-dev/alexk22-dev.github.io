window.MathJax = {
  tex: {
    tags: "ams",
    // kramdown converts all `$$...$$` source math to \(...\) / \[...\] at build
    // time, so the only `$` pairs left in the HTML are literal dollar signs —
    // prices, $HOME, shell snippets. Listing ["$", "$"] here made MathJax
    // silently swallow the text between any two of them.
    inlineMath: [["\\(", "\\)"]],
  },
  options: {
    renderActions: {
      addCss: [
        200,
        function (doc) {
          const style = document.createElement("style");
          style.innerHTML = `
          .mjx-container {
            color: inherit;
          }
        `;
          document.head.appendChild(style);
        },
        "",
      ],
    },
  },
};
