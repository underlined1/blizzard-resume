(() => {
  "use strict";

  const intro = document.querySelector(".page-projects .page-intro");
  if (!intro || document.querySelector(".featured-project-jump")) return;

  const card = document.createElement("aside");
  card.className = "featured-project-jump";
  card.setAttribute("aria-label", "LinkScope 网络运维实验室在线演示");
  card.innerHTML = [
    '<div class="featured-project-copy">',
    '<p class="section-kicker">FEATURED / INTERACTIVE DEMO</p>',
    '<h2>LinkScope <span>网络运维实验室</span></h2>',
    '<p>一个可交互的网络可观测性与事件分析模拟系统。打开后可切换场景、查看拓扑、分析告警，并体验完整的事件处理流程。</p>',
    '</div>',
    '<div class="featured-project-actions">',
    '<span class="featured-project-status"><i aria-hidden="true"></i> LIVE · STREAMLIT</span>',
    '<a class="button button-primary" href="https://linkscope-network-ops-lab.streamlit.app/" target="_blank" rel="noopener noreferrer">打开在线演示 <span aria-hidden="true">→</span></a>',
    '<a class="text-link" href="https://github.com/underlined1/network-ops-lab" target="_blank" rel="noopener noreferrer">查看项目源码 ↗</a>',
    '</div>',
  ].join("");
  intro.append(card);
})();
