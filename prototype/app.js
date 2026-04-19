const works = [
  {
    id: 'nine-abyss',
    title: '九渊行',
    genre: '东方幻想',
    status: '连载中',
    words: '128.4 万字',
    updatedAt: '今晚 22:14',
    currentChapter: '第42章 雨夜入城',
    logline: '前朝遗脉顾衍在乱世中追查九渊旧案，一路卷入黑水城、潜龙渊与皇城秘局。',
    volumes: [
      {
        name: '第一卷 黑水初入',
        chapters: [
          {
            id: 'c40',
            title: '第40章 城门未闭',
            words: '2,318 字',
            summary: '顾衍抵达北境边线，第一次察觉黑水城的守备已经换人。',
            content:
              '北境的风比旧都更冷，刮过旷野时像一把迟钝的刀。顾衍沿着官道走了一夜，在天将亮未亮的时候看见了黑水城的轮廓。城门外没有商队，只有一列沉默的马车停在荒草之间，像故意等着什么人。',
            outline: {
              target: '让顾衍抵达黑水城外，建立北境压迫感。',
              conflict: '城防换人，熟悉的进城路径失效。',
              hook: '有人提前知道她会来。',
            },
          },
          {
            id: 'c41',
            title: '第41章 灯下的人',
            words: '2,504 字',
            summary: '沈照提前现身，双方关系从旧识转向试探。',
            content:
              '她在雨棚底下等了很久，直到第三盏风灯被点亮，沈照才从城墙的阴影里走出来。他没有像过去那样先开口，反而只是看着她，像在确认一个多年前已经死掉的人。',
            outline: {
              target: '交代沈照出场，建立旧识张力。',
              conflict: '两人都在试探对方立场。',
              hook: '黑匣第一次出现。',
            },
          },
          {
            id: 'c42',
            title: '第42章 雨夜入城',
            words: '2,861 字',
            summary: '顾衍夜入黑水城，得知旧都密令，主线从潜伏转入主动试探。',
            content:
              '夜雨顺着青瓦檐角淌下来，像一道道细碎的银线。\n\n顾衍把斗笠压低了一寸，站在黑水城外望了很久。城门已闭，只留一盏昏黄的风灯在雨里摇晃。她知道自己不该在今夜回来，可那道从旧都传来的密令，偏偏只给了她一晚的时间。\n\n城墙上的更鼓响过三声，远处巷口忽然闪出一道熟悉的人影。沈照没有撑伞，只披了一件深青色的旧氅，站在雨里像一块沉默的碑。\n\n“你还是来了。”他说。\n\n顾衍没有回答，只盯着他手里的黑漆匣子。匣面上的铜锁刻着前朝秘纹，雨水打上去，纹路像活了一样微微发亮。',
            outline: {
              target: '顾衍进入黑水城，并让密令成为本卷新的主动目标。',
              conflict: '她必须依赖沈照，却又不能相信他。',
              hook: '黑匣上的前朝秘纹说明旧案并未结束。',
            },
          },
        ],
      },
      {
        name: '第二卷 潜龙旧案',
        chapters: [
          {
            id: 'c43',
            title: '第43章 城门旧案',
            words: '2,114 字',
            summary: '密令揭开一段旧案，顾衍和沈照的合作关系开始出现裂纹。',
            content:
              '黑匣被放在案上时，屋里只剩雨声。顾衍没立刻伸手，她先看见了匣底那枚已经磨平的铜钉，那是旧都监察司才会用的工法。她忽然意识到，这不是传信，而是某种点名。',
            outline: {
              target: '打开黑匣，揭示旧案一角。',
              conflict: '沈照不愿说清来源。',
              hook: '内鬼线第一次明确抬头。',
            },
          },
        ],
      },
    ],
    outlineOverview: [
      '卷一建立黑水城与旧都秘令线。',
      '卷二转入旧案追查与同盟试探。',
      '卷三引爆皇城线，前朝遗脉身份公开。',
    ],
    lore: [
      {
        name: '顾衍',
        type: '人物',
        summary: '女主角，刀修，前朝遗脉，惯于在压迫环境下冷静决断。',
      },
      {
        name: '黑水城',
        type: '地点',
        summary: '北境重城，旧都外屏障，常年阴雨，是潜龙渊故事线的重要起点。',
      },
      {
        name: '旧都密令',
        type: '线索',
        summary: '由前朝秘纹封缄的黑漆匣子，引出九渊旧案的第一层真相。',
      },
    ],
    ideas: [
      '顾衍通过黑水城方言确认城内仍有前朝余脉。',
      '沈照的旧氅在第60章回收，说明他并非真正背叛。',
      '第42章结尾可再压低一句，让追兵不是“快到”，而是“已经进城”。',
    ],
  },
  {
    id: 'fog-port',
    title: '雾港纪事',
    genre: '悬疑',
    status: '草稿中',
    words: '21.3 万字',
    updatedAt: '昨天 19:40',
    currentChapter: '第18章 港口回声',
    logline: '发生在海雾港口的群像悬疑故事，主打双线叙事和倒叙结构。',
    volumes: [
      {
        name: '第一卷 旧港回潮',
        chapters: [
          {
            id: 'fog-18',
            title: '第18章 港口回声',
            words: '1,924 字',
            summary: '死者身份首次反转，倒叙结构与现实线开始交叉。',
            content:
              '雾从海面上推过来，连汽笛声都被拧成了断续的回音。陆笙站在旧仓库门口，突然觉得这地方不是被遗弃了，而是被谁刻意保存了下来。',
            outline: {
              target: '让倒叙线和现实线第一次交叉。',
              conflict: '线索过多，读者容易迷失。',
              hook: '仓库里留下的是录音，不是遗书。',
            },
          },
        ],
      },
    ],
    outlineOverview: [
      '前半段保持双线迷雾感。',
      '中段完成死者身份反转。',
      '后半段揭开港务局旧案与家族线。',
    ],
    lore: [
      {
        name: '陆笙',
        type: '人物',
        summary: '调查记者，习惯以理性推演情境，但会被旧案牵动私人情绪。',
      },
      {
        name: '旧港仓库',
        type: '地点',
        summary: '废弃但被人长期维护的关键现场，藏着倒叙线入口。',
      },
    ],
    ideas: [
      '把海雾设定成固定天气事件，形成章节节奏锚点。',
      '每卷只保留一个真正的核心谜面，其他线索都做成误导。',
    ],
  },
  {
    id: 'bronze-city',
    title: '铜雀长夜',
    genre: '历史悬疑',
    status: '暂停',
    words: '7.8 万字',
    updatedAt: '4 月 8 日',
    currentChapter: '第9章 夜审',
    logline: '以东汉末年为背景的宫廷悬疑，强调审讯、权谋和视角偏差。',
    volumes: [
      {
        name: '第一卷 霜台夜问',
        chapters: [
          {
            id: 'bronze-9',
            title: '第9章 夜审',
            words: '2,087 字',
            summary: '夜审是第一卷核心转折，男主视角开始出现明显偏差。',
            content:
              '铜灯在案头跳了一下，墙上的影子被拉得极长。薛观低头看着案上那卷供辞，忽然觉得纸上的每一个字都像有人提前摆好了位置，只等他自己往里走。',
            outline: {
              target: '让夜审成为卷内情绪顶点。',
              conflict: '证词看似完整，却没有任何一句能真正定罪。',
              hook: '供辞上缺失的一行字。',
            },
          },
        ],
      },
    ],
    outlineOverview: [
      '卷一完成案件抛出与审讯系统建立。',
      '卷二转入宫廷视角，拉开真正权谋面。',
    ],
    lore: [
      {
        name: '薛观',
        type: '人物',
        summary: '主审官，表面沉静，实际对权力秩序极端敏感。',
      },
    ],
    ideas: [
      '所有卷名都用古代司法术语，强化气质。',
    ],
  },
];

const state = {
  view: 'editor',
  tab: 'outline',
  activeWorkId: 'nine-abyss',
  activeChapterId: 'c42',
  selectedLibraryWorkId: 'nine-abyss',
};

const elements = {
  title: document.querySelector('#topbar-title'),
  subtitle: document.querySelector('#topbar-subtitle'),
  currentWorkTitle: document.querySelector('#current-work-title'),
  currentWorkMeta: document.querySelector('#current-work-meta'),
  chapterTree: document.querySelector('#chapter-tree'),
  editorChapterTitle: document.querySelector('#editor-chapter-title'),
  editorWordCount: document.querySelector('#editor-word-count'),
  editorContent: document.querySelector('#editor-content'),
  editorSummary: document.querySelector('#editor-summary'),
  inspectorBody: document.querySelector('#inspector-body'),
  libraryRows: document.querySelector('#library-rows'),
  detailWorkTitle: document.querySelector('#detail-work-title'),
  detailWorkLogline: document.querySelector('#detail-work-logline'),
  detailWordCount: document.querySelector('#detail-word-count'),
  detailChapterCount: document.querySelector('#detail-chapter-count'),
  detailStatus: document.querySelector('#detail-status'),
  detailUpdatedAt: document.querySelector('#detail-updated-at'),
  detailOutline: document.querySelector('#detail-outline'),
  views: document.querySelectorAll('[data-view-panel]'),
  railButtons: document.querySelectorAll('.rail-button'),
  tabButtons: document.querySelectorAll('.tab-button'),
};

function getActiveWork() {
  return works.find((work) => work.id === state.activeWorkId) ?? works[0];
}

function getSelectedLibraryWork() {
  return works.find((work) => work.id === state.selectedLibraryWorkId) ?? works[0];
}

function getActiveChapter() {
  const work = getActiveWork();
  for (const volume of work.volumes) {
    const chapter = volume.chapters.find((item) => item.id === state.activeChapterId);
    if (chapter) {
      return { work, volume, chapter };
    }
  }

  const volume = work.volumes[0];
  return { work, volume, chapter: volume.chapters[0] };
}

function chapterCount(work) {
  return work.volumes.reduce((total, volume) => total + volume.chapters.length, 0);
}

function renderTopbar() {
  const { work, chapter } = getActiveChapter();
  elements.title.textContent = work.title;
  elements.subtitle.textContent = chapter.title;
  elements.currentWorkTitle.textContent = work.title;
  elements.currentWorkMeta.textContent = `${work.genre} · ${work.status} · ${work.words}`;
}

function renderChapterTree() {
  const work = getActiveWork();

  elements.chapterTree.innerHTML = work.volumes
    .map(
      (volume) => `
        <section class="volume-group">
          <div class="volume-title">${volume.name}</div>
          ${volume.chapters
            .map(
              (chapter) => `
                <button
                  class="chapter-item ${chapter.id === state.activeChapterId ? 'is-active' : ''}"
                  type="button"
                  data-action="select-chapter"
                  data-chapter-id="${chapter.id}"
                >
                  <strong>${chapter.title}</strong>
                  <span>${chapter.words}</span>
                  <small>${chapter.summary}</small>
                </button>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('');
}

function renderEditor() {
  const { chapter } = getActiveChapter();
  elements.editorChapterTitle.textContent = chapter.title;
  elements.editorWordCount.textContent = chapter.words;
  elements.editorContent.value = chapter.content;
  elements.editorSummary.textContent = chapter.summary;
}

function renderInspector() {
  const { work, chapter } = getActiveChapter();

  if (state.tab === 'outline') {
    elements.inspectorBody.innerHTML = `
      <section class="inspector-section">
        <div class="section-label">本章目标</div>
        <h3>${chapter.outline.target}</h3>
        <p>这一栏应该始终回答一个问题：这章写完之后，故事推进了什么。</p>
      </section>
      <section class="inspector-section">
        <div class="section-label">冲突</div>
        <p>${chapter.outline.conflict}</p>
      </section>
      <section class="inspector-section">
        <div class="section-label">章节钩子</div>
        <p>${chapter.outline.hook}</p>
      </section>
      <section class="inspector-section">
        <div class="section-label">全书结构</div>
        <ul class="inspector-list">
          ${work.outlineOverview.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </section>
    `;
    return;
  }

  if (state.tab === 'lore') {
    elements.inspectorBody.innerHTML = `
      ${work.lore
        .map(
          (item) => `
            <section class="inspector-section">
              <div class="section-label">${item.type}</div>
              <h3>${item.name}</h3>
              <p>${item.summary}</p>
            </section>
          `,
        )
        .join('')}
    `;
    return;
  }

  elements.inspectorBody.innerHTML = `
    <section class="inspector-section">
      <div class="section-label">写作提醒</div>
      <div class="tag-row">
        <span class="tag">压低叙述噪音</span>
        <span class="tag">保留结尾钩子</span>
        <span class="tag">注意视角一致</span>
      </div>
    </section>
    <section class="inspector-section">
      <div class="section-label">灵感箱</div>
      <ul class="inspector-list">
        ${work.ideas.map((item) => `<li>${item}</li>`).join('')}
      </ul>
    </section>
  `;
}

function renderLibrary() {
  elements.libraryRows.innerHTML = works
    .map(
      (work) => `
        <button
          class="library-row ${work.id === state.selectedLibraryWorkId ? 'is-active' : ''}"
          type="button"
          data-action="select-library-work"
          data-work-id="${work.id}"
        >
          <div class="work-cell">
            <strong>${work.title}</strong>
            <p>${work.currentChapter}</p>
          </div>
          <span class="table-muted">${work.genre}</span>
          <span class="table-muted">${work.status} · ${work.words}</span>
          <span class="table-muted">${work.updatedAt}</span>
          <span class="row-action">
            <span class="toolbar-button">查看</span>
          </span>
        </button>
      `,
    )
    .join('');

  const selected = getSelectedLibraryWork();
  elements.detailWorkTitle.textContent = selected.title;
  elements.detailWorkLogline.textContent = selected.logline;
  elements.detailWordCount.textContent = selected.words;
  elements.detailChapterCount.textContent = `${chapterCount(selected)} 章`;
  elements.detailStatus.textContent = selected.status;
  elements.detailUpdatedAt.textContent = selected.updatedAt;
  elements.detailOutline.innerHTML = selected.outlineOverview.map((item) => `<li>${item}</li>`).join('');
}

function renderView() {
  elements.views.forEach((view) => {
    view.classList.toggle('is-active', view.dataset.viewPanel === state.view);
  });

  elements.railButtons.forEach((button) => {
    const isViewButton = button.dataset.view;
    button.classList.toggle('is-active', isViewButton === state.view);
  });
}

function renderTabs() {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === state.tab);
  });
}

function render() {
  renderTopbar();
  renderChapterTree();
  renderEditor();
  renderInspector();
  renderLibrary();
  renderView();
  renderTabs();
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const { action } = target.dataset;

  if (action === 'show-view') {
    state.view = target.dataset.view;
    render();
    return;
  }

  if (action === 'show-tab') {
    state.tab = target.dataset.tab;
    state.view = 'editor';
    render();
    return;
  }

  if (action === 'select-chapter') {
    state.activeChapterId = target.dataset.chapterId;
    render();
    return;
  }

  if (action === 'select-library-work') {
    state.selectedLibraryWorkId = target.dataset.workId;
    render();
    return;
  }

  if (action === 'open-selected-work') {
    state.activeWorkId = state.selectedLibraryWorkId;
    const work = getActiveWork();
    state.activeChapterId = work.volumes[0].chapters[0].id;
    state.view = 'editor';
    render();
  }
});

elements.editorContent.addEventListener('input', (event) => {
  const text = event.target.value.replace(/\s/g, '');
  elements.editorWordCount.textContent = `${text.length.toLocaleString()} 字`;
});

render();
