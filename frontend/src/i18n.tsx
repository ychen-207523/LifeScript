import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'en' | 'zh-CN';
type Translate = (message: string, values?: Record<string, string | number>) => string;

const chinese: Record<string, string> = {
  'Gentle adventure with a little mystery…': '轻松的冒险，带一点神秘感……',
  'Write your own atmosphere, or choose a suggestion and make it yours.':
    '写下你喜欢的氛围，也可以选择一个建议，再自由修改。',
  'Atmosphere suggestions': '氛围建议',
  'Your everyday life.': '平凡的日常。',
  'An extraordinary story.': '不平凡的故事。',
  'Welcome to Script, a place to imagine another world and give your everyday efforts a story of their own.':
    '欢迎来到 Script。在这里，想象一个新的世界，让日常里的每一份努力，都成为故事的一部分。',
  'Start with an idea. The rest can unfold along the way.':
    '从一个想法开始，余下的故事，留给旅途。',
  'The idea behind Script': 'Script 的想法',
  'Imagine your beginning': '想象你的开始',
  'Choose a setting, create your protagonist, and give them a wish to follow.':
    '描绘世界，创造主角，再为主角留一个想要追寻的心愿。',
  'Grow through everyday life': '让日常成为成长',
  'The vision: completed tasks and habits help your protagonist grow.':
    '我们希望：完成日常任务、养成习惯，也能让故事里的主角一起成长。',
  'Let the journey remember': '让旅程留下记忆',
  'Keep the people, places, and discoveries that make your world yours.':
    '记下相遇的人、走过的地方，与那些让世界属于你的发现。',
  'In this preview, you can build your world and keep its records. Tasks, habits, and AI chapters are still to come.':
    '当前预览支持创建世界与保存世界记录。任务、习惯与 AI 章节将在后续加入。',
  'Saved worlds': '已保存的世界',
  'Already started a story? Open your saved worlds': '已有故事？打开已保存的世界',
  'Enter {name}': '进入「{name}」',
  Continue: '继续',
  'Enter world': '进入世界',
  'Back to introduction': '回到介绍页',
  'Your first world begins with you. Nothing is created until you choose to save it.':
    '第一个世界，由你开始。在你选择保存之前，不会创建任何世界。',
  'Develop this world': '完善这个世界',
  'World design': '世界设计',
  'Back to world': '回到世界',
  'Opening setup': '故事起点',
  'World records': '世界记录',
  Reload: '重新加载',
  'Give the story a direction': '为故事定一个方向',
  'Give the journey a direction. People and places can appear as you explore.':
    '为旅程定一个方向。人物与地点，可以在探索中慢慢出现。',
  'Protagonist’s wish': '主角的心愿',
  'What do they hope to find, achieve, or change?': '主角希望找到什么、做到什么，或改变什么？',
  'Starting situation': '起始情境',
  'Where are they, and what is happening as the story begins?':
    '故事开始时，主角身在何处？正在发生什么？',
  'Opening scene / first message': '开场 / 第一条消息',
  'Write the first passage the reader will see. End with a reason to respond.':
    '写下读者看到的第一段文字，留一个让人想回应的契机。',
  'Saving…': '正在保存……',
  'Save opening setup': '保存故事起点',
  'Opening setup saved.': '故事起点已保存。',
  'Opening preview': '开场预览',
  'Your first message will appear here.': '故事的第一条消息，将在这里呈现。',
  Places: '地点',
  Characters: '角色',
  'Custom table': '自定义表',
  'World tables': '世界表格',
  'Keep track of places and people as the journey reveals them. Add your own tables when you need more.':
    '随着旅程展开，记下遇见的人与地点。需要时，也可以创建自己的表格。',
  'New table': '新建表格',
  'Loading records…': '正在读取记录……',
  'Customize table': '自定义表格',
  'Add record': '添加记录',
  'No records yet. Add the first one whenever your story needs it.':
    '还没有记录。故事需要时，再添上第一条吧。',
  'Available to future story context.': '将供未来的故事生成参考。',
  'Excluded from future story context.': '不供未来的故事生成参考。',
  Name: '名称',
  Description: '描述',
  'Connected place': '关联地点',
  'Discovered details': '已发现的细节',
  Portrait: '肖像',
  Appearance: '外貌',
  Relationships: '关系',
  'Current location': '当前地点',
  Status: '状态',
  'Keep this character': '保留此角色',
  Notes: '备注',
  Active: '活跃',
  Missing: '失踪',
  Unknown: '未知',
  Yes: '是',
  No: '否',
  None: '无',
  'Unavailable link': '关联记录不可用',
  'Table name': '表格名称',
  'Use in story context': '用于故事上下文',
  'Make these records available to the future storyteller.': '允许未来的故事生成参考这些记录。',
  Columns: '列',
  'Add column': '添加列',
  'Column label': '列名称',
  'Column type': '列类型',
  'Choices (one per line)': '选项（每行一个）',
  'First choice': '选项一',
  'Second choice': '选项二',
  'Lock existing values': '锁定已有值',
  'Remove column': '移除此列',
  'Renaming keeps IDs and links intact. Existing columns keep their types once records are added.':
    '改名不会改变内部标识或关联。添加记录后，已有列的类型将保持不变。',
  Cancel: '取消',
  Close: '关闭',
  'Save table': '保存表格',
  Edit: '编辑',
  'Edit record': '编辑记录',
  'Edit record {name}': '编辑记录「{name}」',
  'Save record': '保存记录',
  Locked: '已锁定',
  'The record has been saved. You can retry the remaining changes.':
    '记录已保存，可以重试剩余的修改。',
  'type.text': '文本',
  'type.number': '数字',
  'type.checkbox': '勾选',
  'type.choice': '选项',
  'type.place': '关联地点',
  'type.character': '关联角色',
  'Records changed. Reload and try again.': '记录已更新，请重新加载后重试。',
  'Table or record not found.': '未找到表格或记录。',
  'A world can have at most 30 tables.': '每个世界最多可创建 30 张表格。',
  'Give this table a name (up to 80 characters).': '请为表格取一个不超过 80 字符的名称。',
  'A table needs between 1 and 30 columns.': '表格需要 1 到 30 列。',
  'Check the column definitions.': '请检查列的设置。',
  'Column IDs must be unique.': '列的内部标识不能重复。',
  'Give each custom column a label.': '请为每个自定义列填写名称。',
  'Choose a supported column type.': '请选择支持的列类型。',
  'Built-in column types cannot be changed.': '内置列的类型不能更改。',
  'Choice options must be unique, nonempty, and at most 80 characters.':
    '选项不能重复或留空，每项最多 80 字符。',
  'Add at least one choice option.': '请至少添加一个选项。',
  'Built-in columns must be kept. You can rename or extend them.':
    '内置列需要保留，但可以改名或添加新列。',
  'Column types and columns with existing records must be kept.':
    '已有记录的列需要保留，且不能更改类型。',
  'Keep choice options that are already used by records.': '请保留记录中已经使用的选项。',
  'A table can have at most 500 records.': '每张表格最多可保存 500 条记录。',
  'Record values are required.': '请填写记录内容。',
  'Use the portrait upload control for images.': '请通过肖像上传控件添加图片。',
  'Unlock the column before changing its value.': '请先解锁该列，再修改内容。',
  'A record value does not match its column type.': '记录内容与列类型不匹配。',
  'A record contains an unknown column.': '记录包含未定义的列。',
  'A name is required.': '请填写名称。',
  'This record is too large. Shorten some values.': '记录过大，请适当缩短内容。',
  'Check the record values.': '请检查记录内容。',
  'Your worlds': '你的世界',
  'New world': '新建世界',
  Protagonist: '主角',
  'Choose picture': '选择图片',
  'Character details': '角色详情',
  'World settings': '世界设定',
  'Your Chinese worlds': '你的中文世界',
  'Your English worlds': '你的英文世界',
  'Start a new story in this language. Your other worlds are kept separately.':
    '从这里开始一段中文故事。其他语言的世界会分别保留。',
  'Script home': 'Script 首页',
  'EVERY DAY, ANOTHER PAGE.': '每一天，都是新的篇章。',
  Wanderer: '旅人',
  'Interface language': '界面语言',
  'A new possibility awaits.': '新的可能，正在等你。',
  'Opening your worlds…': '正在打开你的世界……',
  'Let’s find our way back.': '让我们重新找到故事的入口。',
  'Try again': '重试',
  'Could not load your worlds.': '暂时无法读取你的世界。',
  'Your first page is written.': '你的故事，已经写下第一页。',
  'Your world and {name} are saved. Welcome to your adventure.':
    '你的世界与「{name}」已保存。欢迎开启这段旅程。',
  'Dismiss welcome message': '关闭欢迎消息',
  'YOUR STORY / THE FIRST CHAPTER': '你的故事 / 第一章',
  'Welcome to {name}': '欢迎来到{name}',
  'Your arrival is only the beginning. Grow at your own pace.':
    '抵达，只是开始。按自己的节奏慢慢成长吧。',
  'Create a world': '创建新世界',
  'Step into another world': '前往另一个世界',
  'BETWEEN THESE PAGES': '书页之间',
  'The rules of your world': '这个世界的规则',
  'CHARACTER PROFILE': '角色档案',
  Saved: '已保存',
  'MEET YOUR PROTAGONIST': '故事的主角',
  'Your story is still unfolding.': '属于你的故事，仍在继续。',
  Attributes: '能力属性',
  'At your own pace': '按自己的节奏',
  Knowledge: '学识',
  Vitality: '活力',
  Creativity: '创造力',
  Connection: '羁绊',
  Discipline: '自律',
  'Feed your curiosity': '让好奇心带你前行',
  'Care for your energy': '照顾好自己的身心',
  'Make something yours': '创造属于你的事物',
  'Find your people': '遇见与你同行的人',
  'One small step at a time': '一步一步，慢慢积累',
  XP: '经验',
  'Every ability starts somewhere. This is your origin.':
    '每一种能力都有起点。这里，就是你的序章。',
  'THE NEXT CHAPTER': '下一篇章',
  'Everyday moments. An unfolding adventure.': '平凡日常，也能成为冒险的伏笔。',
  'Reading a few pages. Taking a walk. Making time for a friend. Soon, your everyday efforts will help shape this adventure.':
    '读几页书，出门走走，和朋友聊聊天。未来，这些日常里的努力，都将成为故事中的成长。',
  'Up next in Script: tasks & your first story scene': '即将加入：日常任务与第一段剧情',
  'Small steps in this life. New possibilities in another.': '此刻的一小步，另一个世界的新可能。',
  'Script · Local preview': 'Script · 本地预览',
  'Portrait of {name}': '「{name}」的肖像',
  'Character portrait placeholder': '角色肖像占位图',
  'Cover illustration': '封面插画',
  'Your world cover': '你的世界封面',
  'Change cover': '更换封面',
  'Saving cover…': '正在保存封面……',
  'Cover saved.': '封面已保存。',
  'World cover': '世界封面',
  'Use your own cover': '使用自己的封面',
  'Remove picture': '移除图片',
  'PNG or JPEG, up to 5 MB. Leave empty to use the default cover.':
    '支持 PNG 或 JPEG，最大 5 MB。不上传则使用默认封面。',
  'Selected world cover': '已选择的世界封面',
  'Every new world starts with a first page.': '每一个新世界，都从第一页开始。',
  'VOLUME 01 / YOUR STORY BEGINS': '第一卷 / 故事开始之处',
  'An ordinary day.': '平凡的一天。',
  'An extraordinary beginning.': '不平凡的开始。',
  'You don’t need to know how it ends.': '不必急着知道故事的结局。',
  'Just where you’d like to begin.': '先选一个，你想出发的地方。',
  'THE SETTING OF YOUR STORY': '你的故事，发生在这里',
  'AN UNWRITTEN FIRST CHAPTER': '尚待书写的第一章',
  'What happens next is yours to discover.': '接下来会发生什么，由你慢慢发现。',
  'Protagonist · {name}': '主角 · {name}',
  'Create your world': '创建你的世界',
  'Your world': '你的世界',
  'Your protagonist': '你的主角',
  'PROLOGUE / A DIFFERENT KIND OF EVERYDAY': '序章 / 从今天开始，有些不一样',
  'CHARACTER ORIGIN / A NEW BEGINNING': '角色设定 / 新的起点',
  'A new world.': '一个新世界。',
  'A story that’s yours': '一段属于你的故事',
  'Who will you': '这一次，你想',
  become: '成为谁',
  'An unfamiliar town. An unexpected encounter. A life you never imagined. Let’s find the setting for your first chapter.':
    '陌生的小镇，意料之外的相遇，从未想过的人生。一起为你的第一章，找一个开始的地方。',
  'Every story starts with someone. Give yours a name, a little history, and something they’re hoping to find.':
    '每个故事，都从某个人开始。为你的主角取个名字，写一点过去，再留一个想要追寻的愿望。',
  'Build your world': '描绘你的世界',
  'Meet your protagonist': '认识你的主角',
  'Find your story’s starting point': '找到故事的起点',
  'Or write your own below': '也可以在下方自由创作',
  'Try {label}: {title}': '试试{label}：{title}',
  'Academy days': '异世界学园',
  'A second chance at firsts': '重新体验，第一次的心动',
  'Guild adventure': '公会日常',
  'A small quest. A bigger life.': '小小委托，大大人生',
  'Parallel lives': '双重人生',
  'One ordinary day changes': '平凡的一天，突然转向',
  'World name': '世界名称',
  'Where does your next chapter take place?': '你的下一章，会在哪里发生？',
  'A glimpse of this world': '这个世界的一角',
  'A bustling city, a sky full of unfamiliar stars, a letter that changes everything…':
    '热闹的街市，陌生的星空，一封改变一切的来信……',
  'The places, people, or possibilities that make it feel alive.':
    '写下让这个世界鲜活起来的地方、人物，或某种可能。',
  'How would you like the story to feel?': '你希望故事是什么氛围？',
  'Wonder & discovery': '好奇与探索',
  'Cozy & hopeful': '温暖与希望',
  'Mystery & intrigue': '悬疑与秘密',
  'Epic & adventurous': '热血与冒险',
  'Bittersweet & reflective': '微甜微苦，细细回味',
  'Story language': '小说语言',
  English: '英文',
  'Chinese (Simplified)': '中文（简体）',
  'Choose the language for future story chapters. This is separate from the interface language.':
    '选择未来章节的写作语言，与界面语言独立设置。',
  'Add world rules & boundaries': '补充世界规则与内容边界',
  Optional: '选填',
  'Anything this world should know?': '还有什么需要这个世界记住的吗？',
  'Magic is rare. Keep things hopeful. No graphic violence.':
    '魔法很稀少。故事保持希望感。不描写血腥暴力。',
  'Your adventure awaits in': '你的冒险，将在这里展开',
  'Edit world': '修改世界设定',
  'What should we call them?': '该怎么称呼这位主角？',
  'Your protagonist’s name': '主角的名字',
  'Their origin story': '故事开始之前的主角',
  'An ordinary student starting their first guild job, hoping to find a place to belong in an unfamiliar world…':
    '一个刚接下第一份公会委托的普通学生，想在陌生的世界里，找到属于自己的位置……',
  'Who were they before arriving? What are they hoping to become?':
    '来到这里之前，主角是谁？这一次，又希望成为怎样的人？',
  'Your selected character portrait': '已选择的角色肖像',
  'Put a face to the name': '为这个名字配上一张面孔',
  'A picture you love. PNG or JPEG, up to 5 MB.': '选一张喜欢的图片。支持 PNG 或 JPEG，最大 5 MB。',
  'No legendary hero required.': '不必一开始就是传说中的英雄。',
  'An ordinary person can have an extraordinary story.': '普通的人，也能拥有不平凡的故事。',
  Back: '返回',
  'Back to my world': '回到我的世界',
  'Saving your first page…': '正在保存故事的第一页……',
  'Meet my protagonist': '认识我的主角',
  'Begin my story': '开启我的故事',
  'A first draft is enough. Let your imagination lead.': '有个初稿就很好。让想象带你出发。',
  'Your world and character will be saved together.': '你的世界和主角将一起保存。',
  'Add a little detail here to continue.': '再补充一点细节，就能继续了。',
  'Please check this field.': '请检查这一项。',
  'Just a little more to make this yours. Check the fields below.':
    '还差一点点。看看下方标记的内容吧。',
  'Let’s try a PNG or JPEG image, 5 MB or smaller.': '请试试 PNG 或 JPEG 图片，文件不超过 5 MB。',
  'Your beginning couldn’t be saved yet. Please try again.': '暂时没能保存这个开始，请再试一次。',
  'Could not reach Script. Check that the backend is running, then try again.':
    '暂时无法连接 Script，请确认后端已启动后重试。',
  'The request could not be completed. Please try again.': '暂时无法完成操作，请再试一次。',
  'Storage is unavailable. Please try again.': '存储暂时不可用，请稍后重试。',
  'Check the highlighted fields and try again.': '请检查标记的内容后重试。',
  'Portraits must be 5 MB or smaller.': '图片文件不能超过 5 MB。',
  'Choose a PNG or JPEG image.': '请选择 PNG 或 JPEG 图片。',
  'Choose a valid PNG or JPEG image.': '请选择有效的 PNG 或 JPEG 图片。',
  'Portraits must be at most 4096 pixels per side and 8 megapixels.':
    '图片每边不能超过 4096 像素，总像素不能超过 800 万。',
  'That image could not be read. Choose another PNG or JPEG.':
    '无法读取这张图片，请换一张 PNG 或 JPEG。',
  'World or portrait not found.': '未找到世界或图片。',
  'This world changed. Refresh and try again.': '这个世界已更新，请刷新后重试。',
};

export function translate(
  language: Language,
  message: string,
  values: Record<string, string | number> = {},
) {
  const text = language === 'zh-CN' ? (chinese[message] ?? message) : message;
  return text.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token));
}

const I18nContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
} | null>(null);
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem('script.language');
    if (saved === 'en' || saved === 'zh-CN') return saved;
  } catch {
    /* Browser storage is optional. */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'zh-CN' ? 'Script · 你的下一章' : 'Script · Your next chapter';
    try {
      localStorage.setItem('script.language', language);
    } catch {
      /* Session language still works. */
    }
  }, [language]);
  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t: (message, values) => translate(language, message, values),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('I18nProvider is required');
  return context;
}
