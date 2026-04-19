import type {
  AiProviderConfig,
  Anchor,
  AppData,
  Chapter,
  Foreshadow,
  IdeaNote,
  Library,
  LibraryCollection,
  LibraryItem,
  LoreItem,
  Volume,
  Work,
} from './types';
import { countChars } from './utils';

function now() {
  return new Date().toISOString();
}

function anchor(chapterId: string, excerpt: string): Anchor {
  return {
    chapterId,
    excerpt,
    contextBefore: '',
    contextAfter: '',
    createdAt: now(),
  };
}

export function createDefaultAiConfig(): AiProviderConfig {
  return {
    kind: 'codex',
    openaiCompat: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      providerLabel: 'OpenAI',
    },
    permissionMode: 'suggest',
  };
}

export function createBlankChapter(title: string, index: number, volumeId?: string): Chapter {
  return {
    id: crypto.randomUUID(),
    title,
    summary: '',
    outline: `第 ${index} 章目标：\n- 推进主线\n- 埋一个新悬念\n- 保留下一章钩子`,
    content: '',
    status: 'draft',
    linkedLoreIds: [],
    wordCount: 0,
    updatedAt: now(),
    volumeId,
  };
}

export function createBlankVolume(title: string): Volume {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now(),
    updatedAt: now(),
  };
}

const COVER_PALETTE = [
  '#c18a5f', '#6b8fb4', '#8fa97c', '#b57893',
  '#a07aa8', '#c09256', '#7aa3a3', '#8a7a9b',
];

function pickCoverColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % COVER_PALETTE.length;
  return COVER_PALETTE[idx];
}

export function createBlankWork(title: string): Work {
  const firstChapter = createBlankChapter('第1章 新章起笔', 1);
  return {
    id: crypto.randomUUID(),
    title,
    genre: '',
    status: 'drafting',
    synopsis: '',
    updatedAt: now(),
    createdAt: now(),
    cover: { color: pickCoverColor(title) },
    chapters: [firstChapter],
    volumes: [],
    lore: [],
    ideas: [],
    relations: [],
    aiMessages: [],
    foreshadows: [],
  };
}

export function createSeedData(): AppData {
  const volumeOne: Volume = {
    id: crypto.randomUUID(),
    title: '第一卷 · 黑水风起',
    createdAt: now(),
    updatedAt: now(),
  };
  const volumeTwo: Volume = {
    id: crypto.randomUUID(),
    title: '第二卷 · 潜龙渊（构思中）',
    createdAt: now(),
    updatedAt: now(),
  };

  const chapter1: Chapter = {
    id: crypto.randomUUID(),
    title: '第42章 雨夜入城',
    volumeId: volumeOne.id,
    summary: '顾衍夜入黑水城，得知旧都密令，主线从潜伏转入主动试探。',
    outline:
      '本章目标：\n- 顾衍进入黑水城\n- 通过雨夜气氛强化压迫感\n- 给出"密令"这一新的线索\n- 结尾留下追兵将至的钩子',
    content:
      '夜雨顺着青瓦檐角淌下来，像一道道细碎的银线。\n\n顾衍把斗笠压低了一寸，站在黑水城外望了很久。城门已闭，只留一盏昏黄的风灯在雨里摇晃。她知道自己不该在今夜回来，可那道从旧都传来的密令，偏偏只给了她一晚的时间。\n\n城墙上的更鼓响过三声，远处巷口忽然闪出一道熟悉的人影。沈照没有撑伞，只披了一件深青色的旧氅，站在雨里像一块沉默的碑。\n\n"你还是来了。"他说。\n\n顾衍没有回答，只盯着他手里的黑漆匣子。匣面上的铜锁刻着前朝秘纹，雨水打上去，纹路像活了一样微微发亮。',
    status: 'draft',
    linkedLoreIds: [],
    wordCount: 0,
    updatedAt: now(),
  };
  chapter1.wordCount = countChars(chapter1.content);

  const chapter2: Chapter = {
    id: crypto.randomUUID(),
    title: '第43章 城门旧案',
    volumeId: volumeOne.id,
    summary: '黑漆匣打开，九渊令现世，崔无涯的名字把旧案拉回台前，沈照第一次明确表达不信任。',
    outline:
      '本章目标：\n- 打开黑匣，露出九渊令\n- 崔无涯的名字第一次出现\n- 前朝秘纹对顾衍产生回应（呼应第一章伏笔）\n- 沈照把"旧案没结束"这张牌摊在她面前\n- 埋下内鬼线',
    content:
      '铜锁在沈照掌心里安静了很久，才发出"咔"的一声轻响。\n\n顾衍看到匣中只躺着一枚玄铁令牌，令面刻着九渊两个古字，边角已经被反复摩挲得发亮。\n\n"九渊令。"她低声念出这两个字，指尖却没有去碰。这东西按规制，只有九渊司正使能动用，绝不该出现在远离京城的旧都外围。\n\n"正使早就死了。"沈照淡淡地说，"这令上的名字，写的是崔无涯。"\n\n顾衍眉梢跳了一下。崔无涯是九渊司副使，也是她七年来第一个确认的"自己人"——或者她以为的自己人。\n\n她忽然意识到自己呼吸的节奏乱了一瞬。那枚玄铁令牌在雨光里微微浮起一层冷白的纹路，像是感知到她靠近，又像是在回应她身上某种极淡的东西。\n\n"你怀疑我。"她没有问，只是陈述。\n\n沈照没有否认。他只是把匣子推到她面前，雨水顺着他的袖口滑下去，在青石板上砸出一个暗色的印迹：\n\n"这七年你查的是旧案。可这张令牌告诉我——旧案并没有结束，只是换了一批人在做而已。"',
    status: 'draft',
    linkedLoreIds: [],
    wordCount: 0,
    updatedAt: now(),
  };
  chapter2.wordCount = countChars(chapter2.content);

  const chapter3: Chapter = {
    id: crypto.randomUUID(),
    title: '第44章 承霜出鞘',
    volumeId: volumeOne.id,
    summary: '白鹭带来北境军镇的密报，承恩殿案被再次提起，顾衍的承霜刀在十二道骨哨声中第一次出鞘。',
    outline:
      '本章目标：\n- 白鹭登场，埋下军镇细作伏笔\n- 崔无涯开始主动出手\n- 承恩殿案被明确提名，顾衍身世钩子打开一半\n- 承霜刀出鞘：母亲遗言回收（paid_off）\n- 十二道骨哨：伏下围城线',
    content:
      '第二日清晨，雨停了。\n\n白鹭从客栈后窗翻进来的时候，顾衍正在擦那把承霜刀。\n\n"师姐。"白鹭压低了声音，把一只竹筒放在桌上，"北境军镇的密报，崔无涯三日前就出京了，走的是驿道，但没有在任何一个驿站登记。"\n\n顾衍继续擦刀，刀身冷光映着她毫无波动的脸："他来黑水城做什么？"\n\n"查你。"白鹭说，然后顿了顿，"还查一桩十六年前的旧案——承恩殿案。"\n\n擦刀的手停了下来。\n\n承恩殿案，是她母亲死在落霞宫那一夜。官方说法是"宫变余孽自焚"，她查了七年，只拿到半张纸的名字。\n\n"白鹭。"她终于抬起头，"你跟北境军镇的联络，以后不要再走这条线了。"\n\n白鹭没有立刻答话。屋外传来一声悠长的骨哨，一共十二声，从远到近，像一场缓慢的围合。\n\n顾衍站了起来，把承霜刀重新插进鞘里。母亲临终前只来得及说一句话："承霜刀开锋时，我会回来看你。"十六年过去，她今天第一次相信那是一句真话。',
    status: 'draft',
    linkedLoreIds: [],
    wordCount: 0,
    updatedAt: now(),
  };
  chapter3.wordCount = countChars(chapter3.content);

  const loreGuyan: LoreItem = {
    id: crypto.randomUUID(),
    type: '人物',
    name: '顾衍',
    description: '女主角，刀修，前朝遗脉，擅长在压迫环境下保持冷静判断。母亲死于十六年前承恩殿案。',
    firstAppearanceChapterId: chapter1.id,
    tags: ['主角', '刀修', '前朝遗脉'],
    updatedAt: now(),
    attributes: {
      role: '主角',
      age: '二十四岁',
      appearance: '身形清瘦，眉眼冷静，左腕有一道旧刀疤。',
      personality: '沉静、克制、不信任任何人，唯独对白鹭与承霜刀留有温度。',
      background: '十六年前母亲死于落霞宫承恩殿案，她被裴长生收养长大，七年前入九渊司查案。',
    },
  };

  const loreShenzhao: LoreItem = {
    id: crypto.randomUUID(),
    type: '人物',
    name: '沈照',
    description: '男主角，剑修，表面沉默寡言，实则心思缜密，与顾衍亦敌亦友。身份尚存疑。',
    firstAppearanceChapterId: chapter1.id,
    tags: ['男主', '剑修', '身份成谜'],
    updatedAt: now(),
    attributes: {
      role: '男主 / 谜',
      age: '约二十七岁',
      appearance: '高挑，常披一件深青色旧氅，袖口磨出毛边。',
      personality: '少言，但句句都是试探。对顾衍态度矛盾——既要护，又要防。',
    },
  };

  const loreCuiWuya: LoreItem = {
    id: crypto.randomUUID(),
    type: '人物',
    name: '崔无涯',
    description: '九渊司副使，顾衍七年来第一个确认的"自己人"，实为内鬼，牵连承恩殿案与九渊令外流。',
    firstAppearanceChapterId: chapter2.id,
    tags: ['反派', '内鬼', '九渊司'],
    updatedAt: now(),
    attributes: {
      role: '反派（伪盟友）',
      age: '四十上下',
      personality: '温和敦厚的外表下是极深的算计；能够长时间忍耐身份。',
      background: '七年前受顾衍举荐入九渊司，如今是使令级的中层核心。',
    },
  };

  const loreBailu: LoreItem = {
    id: crypto.randomUUID(),
    type: '人物',
    name: '白鹭',
    description: '顾衍的师妹，同出裴长生门下，真实身份是北境军镇安插在顾衍身边的细作。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['配角', '细作', '师妹'],
    updatedAt: now(),
    attributes: {
      role: '配角 / 伏笔关键',
      age: '二十一岁',
      appearance: '身材单薄，动作极轻，常穿灰布短打。',
      personality: '对顾衍的感情是真的，对军镇的任务也是真的，这是她的撕裂点。',
    },
  };

  const lorePei: LoreItem = {
    id: crypto.randomUUID(),
    type: '人物',
    name: '裴长生',
    description: '旧都遗老，旧都残部实际首领，当年从落霞宫大火里救出幼年顾衍的人。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['长辈', '幕后', '旧都'],
    updatedAt: now(),
    attributes: {
      role: '长辈 / 幕后推手',
      background: '前朝礼部旧臣，承恩殿案后隐姓埋名，以私塾先生身份教养顾衍和白鹭。',
    },
  };

  const loreCity: LoreItem = {
    id: crypto.randomUUID(),
    type: '地点',
    name: '黑水城',
    description: '北境重城，旧都外屏障，常年阴雨，是潜龙渊故事线的重要起点。',
    firstAppearanceChapterId: chapter1.id,
    tags: ['北境', '旧都外围'],
    updatedAt: now(),
    attributes: {
      scale: '北境中规模城邦',
      region: '北境 / 旧都外围',
      landscape: '城墙高厚，一半是军防一半是商埠；巷子窄，常年潮湿。',
      atmosphere: '阴郁、压迫、雨季漫长。',
      inhabitants: '半民半兵，流动人口多为南来北往的商队和军属。',
    },
  };

  const loreLuoxia: LoreItem = {
    id: crypto.randomUUID(),
    type: '地点',
    name: '落霞宫',
    description: '前朝皇宫遗址，十六年前在承恩殿案中大火，此后封禁，官方说法已经化为焦土。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['旧都', '前朝'],
    updatedAt: now(),
    attributes: {
      region: '旧都核心',
      landscape: '焦土之上还残留半截宫墙，墙缝中长出荒草。',
      atmosphere: '被民间传为凶地，夜间无人敢近。',
    },
  };

  const loreJiuyuan: LoreItem = {
    id: crypto.randomUUID(),
    type: '势力',
    name: '九渊司',
    description: '朝廷直属秘警组织，职责是查办前朝遗党与妖异案件。内部正在分裂：一派效忠皇帝，一派自成体系。',
    firstAppearanceChapterId: chapter2.id,
    tags: ['朝廷', '秘警', '分裂'],
    updatedAt: now(),
    attributes: {
      nature: '朝廷直属秘警',
      leader: '正使（已死，名义由皇帝虚领）；实际由副使崔无涯代掌。',
      territory: '总部在九渊台，分坛遍布各重城。',
      creed: '对外——清除前朝余孽；对内——两派分裂，各有主张。',
      methods: '暗线、调令、九渊令直接调动地方兵权。',
    },
  };

  const loreOldCapital: LoreItem = {
    id: crypto.randomUUID(),
    type: '势力',
    name: '旧都残部',
    description: '前朝覆灭后残留的遗脉组织，裴长生实际上的核心。以"归位"为名，但内部并不铁板一块。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['前朝', '反抗', '分散'],
    updatedAt: now(),
    attributes: {
      nature: '前朝遗脉抵抗组织',
      leader: '裴长生（外界不知）',
      territory: '散布于旧都、黑水城、北境军镇之间，没有实体据点。',
      creed: '表面复国，实则各怀目的。',
    },
  };

  const loreBeijing: LoreItem = {
    id: crypto.randomUUID(),
    type: '势力',
    name: '北境军镇',
    description: '北境边防军，名义上效忠朝廷，实际态度中立。对九渊司不信任，暗中安插细作在九渊司内部。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['军方', '中立', '边防'],
    updatedAt: now(),
    attributes: {
      nature: '边防军',
      leader: '镇北都护（暂未登场）',
      territory: '北境全线，辖黑水城军防。',
      creed: '先护北境，再谈朝廷。',
      methods: '不正面对抗任何势力，靠密报和细作收集情报。',
    },
  };

  const loreJiuyuanLing: LoreItem = {
    id: crypto.randomUUID(),
    type: '规则',
    name: '九渊令',
    description: '九渊司最高级别调兵手令。按规制只有正使可动用，可直接调动地方驻军不问缘由。',
    firstAppearanceChapterId: chapter2.id,
    tags: ['规则', '权限'],
    updatedAt: now(),
    attributes: {
      scope: '九渊司全体 + 令牌名字所指地方兵权',
      principle: '见令如见正使本人，地方军不得阻拦。',
      cost: '发令者需以血刻名于令背，伪令会反噬。',
      taboo: '令牌不可过三手，否则失效。',
    },
  };

  const loreMiWen: LoreItem = {
    id: crypto.randomUUID(),
    type: '规则',
    name: '前朝秘纹',
    description: '前朝皇室专用的符箓体系，以血脉为契，能感应同源者的靠近。已经失传大半。',
    firstAppearanceChapterId: chapter1.id,
    tags: ['前朝', '血脉', '符箓'],
    updatedAt: now(),
    attributes: {
      scope: '前朝皇室直系与嫡系血脉',
      principle: '血脉相合者靠近时，秘纹会轻微浮动、发冷光。',
      cost: '长时间暴露在秘纹附近，非血脉者会气血失序。',
      taboo: '秘纹不可被外姓血浸染，否则整枚信物失效。',
    },
  };

  const loreClue: LoreItem = {
    id: crypto.randomUUID(),
    type: '线索',
    name: '旧都密令',
    description: '由前朝秘纹封缄的黑漆匣子，匣内为玄铁九渊令，引出九渊旧案的第一层真相。',
    firstAppearanceChapterId: chapter1.id,
    tags: ['主线', '伏笔', '信物'],
    updatedAt: now(),
    attributes: {
      firstSeen: '第42章雨夜入城，沈照手里。',
      surface: '前朝遗物，来自旧都。',
      truth: '实际是九渊司内部分裂的产物，由崔无涯一派刻名发出。',
      linked: '九渊司、崔无涯、前朝秘纹',
      payoff: '第二卷揭示"旧都密令"实为"自家人手令"的那一刻。',
    },
  };

  const loreChengEn: LoreItem = {
    id: crypto.randomUUID(),
    type: '线索',
    name: '承恩殿案',
    description: '十六年前落霞宫承恩殿大火，官方定性为"宫变余孽自焚"，实则是九渊司第一次内部清洗。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['旧案', '主线', '身世'],
    updatedAt: now(),
    attributes: {
      firstSeen: '第44章，白鹭带来的密报第一次点名。',
      surface: '宫变余孽自焚。',
      truth: '九渊司借火清除了一批不听话的前朝遗臣，顾衍母亲是被牵连的。',
      linked: '顾衍母亲、裴长生、九渊司、崔无涯',
      payoff: '第二卷中段——真相纸面化。',
    },
  };

  const loreChengShuang: LoreItem = {
    id: crypto.randomUUID(),
    type: '线索',
    name: '承霜刀',
    description: '顾衍母亲留下的唯一遗物，母亲临终遗言是"承霜刀开锋时，我会回来看你"。',
    firstAppearanceChapterId: chapter3.id,
    tags: ['信物', '母亲', '回收'],
    updatedAt: now(),
    attributes: {
      firstSeen: '第44章，顾衍正在擦这把刀。',
      surface: '一把寻常的刀修佩刀。',
      truth: '刀身藏有承恩殿案名单的秘纹拓印。',
      linked: '顾衍母亲、承恩殿案、前朝秘纹',
    },
  };

  const allLore: LoreItem[] = [
    loreGuyan,
    loreShenzhao,
    loreCuiWuya,
    loreBailu,
    lorePei,
    loreCity,
    loreLuoxia,
    loreJiuyuan,
    loreOldCapital,
    loreBeijing,
    loreJiuyuanLing,
    loreMiWen,
    loreClue,
    loreChengEn,
    loreChengShuang,
  ];

  const ideas: IdeaNote[] = [
    {
      id: crypto.randomUUID(),
      content: '顾衍在雨夜中听到旧都方言，从而确认城内有前朝余脉——可以放到第42章中段。',
      linkHint: '第42章 雨夜入城',
      createdAt: now(),
    },
    {
      id: crypto.randomUUID(),
      content: '沈照的旧氅可以在第60章回收，说明他并非真正背叛。',
      linkHint: '角色伏笔',
      createdAt: now(),
    },
    {
      id: crypto.randomUUID(),
      content: '这里顾衍内心已经翻江倒海，但表面还是平静的——或许可以用"擦刀的手停了下来"那种微动作去暗示，而不是直接写心理。',
      linkHint: '第43章 · 锚段',
      createdAt: now(),
      anchor: anchor(chapter2.id, '她忽然意识到自己呼吸的节奏乱了一瞬'),
    },
    {
      id: crypto.randomUUID(),
      content: '十二声骨哨可以对应九渊司旧编制——十二堂旗使，后文铺陈时用到。',
      linkHint: '第44章 · 锚段',
      createdAt: now(),
      anchor: anchor(chapter3.id, '一共十二声，从远到近，像一场缓慢的围合'),
    },
    {
      id: crypto.randomUUID(),
      content: '"承霜"这个刀名或许可以来自顾衍母亲——承恩殿的承，落霞为霜。双关一下。',
      linkHint: '命名灵感',
      createdAt: now(),
    },
  ];

  const foreshadows: Foreshadow[] = [
    {
      id: crypto.randomUUID(),
      title: '沈照的旧氅',
      description: '沈照身上一件来路可疑的旧氅，暗示他与前朝渊源比表面更深。',
      state: 'planted',
      planted: {
        at: now(),
        note: '第42章雨夜入城时，沈照披旧氅出场；读者应该只觉得"衣着考究"。',
        anchor: anchor(chapter1.id, '只披了一件深青色的旧氅'),
      },
      linkedLoreIds: [loreShenzhao.id],
      tags: ['主线', '人物'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      title: '旧都密令的真正来源',
      description: '表面是前朝密令，真相指向九渊司内部分裂——是崔无涯一派发出的。',
      state: 'echoed',
      planted: {
        at: now(),
        note: '第42章黑漆匣出现，主角认为是前朝遗物。',
        anchor: anchor(chapter1.id, '那道从旧都传来的密令'),
      },
      echoed: {
        at: now(),
        note: '第43章沈照点明令上名字是崔无涯，读者第一次察觉"旧都"两个字可能是障眼法。',
        anchor: anchor(chapter2.id, '这令上的名字，写的是崔无涯'),
      },
      linkedLoreIds: [loreClue.id, loreJiuyuan.id, loreCuiWuya.id],
      tags: ['主线', '组织'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      title: '崔无涯的真实身份',
      description: '九渊司副使，顾衍七年来唯一确认的"自己人"，实则是整条旧案的幕后之一。',
      state: 'planted',
      planted: {
        at: now(),
        note: '第43章第一次提名，埋下"她以为的自己人"这个钩子。',
        anchor: anchor(chapter2.id, '她七年来第一个确认的"自己人"'),
      },
      linkedLoreIds: [loreCuiWuya.id, loreJiuyuan.id, loreGuyan.id],
      tags: ['主线', '人物', '内鬼'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      title: '前朝秘纹会回应血脉',
      description: '秘纹对同源血脉会发生可见反应——这条规则直接暴露顾衍的前朝身世，必须谨慎回收。',
      state: 'echoed',
      planted: {
        at: now(),
        note: '第42章结尾，雨水打上匣面秘纹发亮——第一次出现"可动"迹象。',
        anchor: anchor(chapter1.id, '纹路像活了一样微微发亮'),
      },
      echoed: {
        at: now(),
        note: '第43章令牌在雨光里浮起冷白纹路，顾衍靠近时出现明确反应。',
        anchor: anchor(chapter2.id, '像是感知到她靠近，又像是在回应她身上某种极淡的东西'),
      },
      linkedLoreIds: [loreMiWen.id, loreGuyan.id, loreClue.id],
      tags: ['设定', '血脉', '主线'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      title: '白鹭的军镇细作身份',
      description: '白鹭是北境军镇安插在顾衍身边的细作，这条线后续会撕裂她和顾衍的关系。',
      state: 'planted',
      planted: {
        at: now(),
        note: '第44章第一次露出破绽——她能拿到北境军镇的密报，这件事本身就越权。',
        anchor: anchor(chapter3.id, '北境军镇的密报'),
      },
      linkedLoreIds: [loreBailu.id, loreBeijing.id, loreGuyan.id],
      tags: ['主线', '人物', '信任'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      title: '顾衍母亲的死因',
      description: '承恩殿案的真相——顾衍母亲并非"宫变余孽"，而是被九渊司借火清除。母亲的承霜刀遗言在本卷末端回响一次。',
      state: 'paid_off',
      planted: {
        note: '前传设定：十六年前承恩殿案，顾衍四岁。正文开篇之前已存在。',
      },
      echoed: {
        at: now(),
        note: '第44章白鹭第一次明确点名"承恩殿案"，顾衍的动作第一次被打破。',
        anchor: anchor(chapter3.id, '还查一桩十六年前的旧案——承恩殿案'),
      },
      paidOff: {
        at: now(),
        note: '第44章末，顾衍忆起母亲遗言"承霜刀开锋时，我会回来看你"——母亲这条线在第一卷阶段性收束。',
        anchor: anchor(chapter3.id, '承霜刀开锋时，我会回来看你'),
      },
      linkedLoreIds: [loreGuyan.id, loreChengEn.id, loreChengShuang.id, loreLuoxia.id],
      tags: ['身世', '回收', '主线'],
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const work: Work = {
    id: crypto.randomUUID(),
    title: '九渊行',
    genre: '东方幻想',
    status: 'serializing',
    synopsis: '前朝遗脉顾衍在乱世中追查九渊旧案，一路卷入黑水城、潜龙渊与皇城秘局。',
    updatedAt: now(),
    createdAt: now(),
    cover: { emoji: '刀', color: '#8e5930' },
    chapters: [chapter1, chapter2, chapter3],
    volumes: [volumeOne, volumeTwo],
    lore: allLore,
    ideas,
    relations: [
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreShenzhao.id, label: '亦敌亦友' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreClue.id, label: '追查者' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreCuiWuya.id, label: '信任被骗' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreBailu.id, label: '师姐妹' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: lorePei.id, label: '养父 / 师长' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreChengEn.id, label: '当事人之女' },
      { id: crypto.randomUUID(), fromLoreId: loreGuyan.id, toLoreId: loreChengShuang.id, label: '持有者' },
      { id: crypto.randomUUID(), fromLoreId: loreCuiWuya.id, toLoreId: loreJiuyuan.id, label: '副使' },
      { id: crypto.randomUUID(), fromLoreId: loreCuiWuya.id, toLoreId: loreClue.id, label: '真正发令者' },
      { id: crypto.randomUUID(), fromLoreId: loreShenzhao.id, toLoreId: loreJiuyuan.id, label: '疑似关联' },
      { id: crypto.randomUUID(), fromLoreId: loreShenzhao.id, toLoreId: loreClue.id, label: '送达者' },
      { id: crypto.randomUUID(), fromLoreId: loreBailu.id, toLoreId: loreBeijing.id, label: '细作' },
      { id: crypto.randomUUID(), fromLoreId: loreBailu.id, toLoreId: lorePei.id, label: '门下' },
      { id: crypto.randomUUID(), fromLoreId: lorePei.id, toLoreId: loreOldCapital.id, label: '实际首领' },
      { id: crypto.randomUUID(), fromLoreId: loreOldCapital.id, toLoreId: loreClue.id, label: '表面来源' },
      { id: crypto.randomUUID(), fromLoreId: loreChengEn.id, toLoreId: loreLuoxia.id, label: '发生地' },
      { id: crypto.randomUUID(), fromLoreId: loreChengEn.id, toLoreId: loreJiuyuan.id, label: '真凶' },
      { id: crypto.randomUUID(), fromLoreId: loreChengShuang.id, toLoreId: loreChengEn.id, label: '承载线索' },
      { id: crypto.randomUUID(), fromLoreId: loreClue.id, toLoreId: loreJiuyuanLing.id, label: '实为' },
      { id: crypto.randomUUID(), fromLoreId: loreClue.id, toLoreId: loreMiWen.id, label: '封缄规则' },
    ],
    aiMessages: [],
    foreshadows,
  };

  chapter1.linkedLoreIds = [loreGuyan.id, loreShenzhao.id, loreCity.id, loreClue.id, loreMiWen.id];
  chapter2.linkedLoreIds = [
    loreGuyan.id,
    loreShenzhao.id,
    loreClue.id,
    loreJiuyuanLing.id,
    loreJiuyuan.id,
    loreCuiWuya.id,
    loreMiWen.id,
  ];
  chapter3.linkedLoreIds = [
    loreGuyan.id,
    loreBailu.id,
    loreCuiWuya.id,
    loreBeijing.id,
    loreChengEn.id,
    loreChengShuang.id,
    loreLuoxia.id,
  ];

  const secondaryWork = createBlankWork('雾港纪事');
  secondaryWork.genre = '悬疑';
  secondaryWork.synopsis = '发生在海雾港口的群像悬疑故事，主打双线叙事和倒叙结构。';
  secondaryWork.cover = { emoji: '雾', color: '#6b8fb4' };

  return {
    works: [work, secondaryWork],
    metrics: { dailyTarget: 4000, streakDays: 12 },
    preferences: {
      activeWorkId: work.id,
      activeChapterId: chapter1.id,
      lastPanelTab: 'outline',
      lastView: 'dashboard',
      appearance: { theme: 'warm', font: 'serif', fontSize: 'medium' },
      ai: createDefaultAiConfig(),
    },
    metadata: { version: 2, lastOpenedAt: now() },
    dailyRecords: [],
    snapshots: [],
    assets: [],
    library: createSeedLibrary(),
  };
}

function createSeedLibrary(): Library {
  const collJiuyuan: LibraryCollection = {
    id: crypto.randomUUID(),
    name: '九渊行 · 素材',
    description: '为这部作品专门收集的素材：背景、描写、灵感、设定。',
    createdAt: now(),
    updatedAt: now(),
  };
  const collGeneral: LibraryCollection = {
    id: crypto.randomUUID(),
    name: '写作通用',
    description: '与具体作品无关、所有项目都可能复用的素材。',
    createdAt: now(),
    updatedAt: now(),
  };

  const items: LibraryItem[] = [
    {
      id: crypto.randomUUID(),
      collectionId: collJiuyuan.id,
      kind: '描写片段',
      title: '雨巷里的沉默人影',
      body:
        '他没有撑伞，只披了一件深色旧氅，站在雨里像一块沉默的碑。路灯隔着雨雾亮得像蒙了一层旧纸，风每一下都把他身后的影子推前半寸。',
      tags: ['雨', '人物出场', '氛围'],
      source: '自创 / 仿写练习',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      collectionId: collJiuyuan.id,
      kind: '知识参考',
      title: '明代锦衣卫职能概览',
      body:
        '## 名义职能\n\n- 皇帝亲军，直属皇帝本人\n- 侍卫、仪仗、缉捕\n\n## 实际职能\n\n- 监察百官、秘密侦缉\n- 由北镇抚司掌诏狱\n\n## 对写作的启发\n\n亲军-仪仗-秘警三位一体的结构，可以直接套到"九渊司"上：对外是天子亲军，对内是秘密机关，内部又有"北镇抚司"这样的拷问部门做灰色地带。',
      tags: ['明代', '官制', '秘警'],
      source: '参考：《明史·职官志》相关条目（需再核实）',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      collectionId: collJiuyuan.id,
      kind: '设定素材',
      title: '以血为契的符箓体系',
      body:
        '## 核心规则\n\n符箓与施术者血脉相契，只有直系血亲能够感应和激活。\n\n## 规则 / 机制\n\n- 同源血脉靠近时，符箓轻微发光、发冷\n- 外姓血脉长时间接触会反噬\n- 旁支只能"感应到温度"，不能激活\n\n## 限制与代价\n\n- 被外姓血浸染过的符箓彻底失效\n- 感应会消耗施术者气血，短时间内不能多次触发\n\n## 剧情用途\n\n主角身上的信物突然对陌生人"发光"——暗示对方其实是失散的血亲。',
      tags: ['设定', '血脉', '符箓'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      collectionId: collJiuyuan.id,
      kind: '灵感种子',
      title: '十二道骨哨',
      body:
        '古代某种围猎编制，每一队用骨哨相互通讯，吹满十二声就是合围完成的信号。\n\n用到小说里：一个人在屋里听到外面骨哨声从远到近、一声一声数过去——读者和角色同步倒计时，比任何"追兵将至"的描述都更压迫。',
      tags: ['氛围', '伏笔', '军事'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      collectionId: collGeneral.id,
      kind: '描写片段',
      title: '擦刀的手停了下来',
      body:
        '动作停顿是最诚实的情绪。不需要写心跳加速、不需要写脑中翻涌，只要让"正在做的事"中断一拍，读者就知道这个人被击中了。\n\n可以复用到：听到坏消息、认出仇人、看见想念的人……任何需要"内心被击中但角色还要伪装"的场景。',
      tags: ['微动作', '情绪', '技巧'],
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: crypto.randomUUID(),
      collectionId: collGeneral.id,
      kind: '灵感种子',
      title: '死者未收的信',
      body:
        '主角在故人遗物里发现一封写了一半、没寄出去的信。收件人是自己。\n\n这个钩子可以用来：撬开一段隐藏多年的关系 / 翻出一桩旧案 / 逼迫主角回到他回避的城市。',
      tags: ['剧情钩子', '人物关系'],
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  return {
    collections: [collJiuyuan, collGeneral],
    items,
  };
}
