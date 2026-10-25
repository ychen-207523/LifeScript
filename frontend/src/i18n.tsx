import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Language = 'en' | 'zh-CN';
type Translate = (message: string, values?: Record<string, string | number>) => string;

const chinese: Record<string, string> = {
  'Your worlds': '你的世界', 'New world': '新建世界', 'Protagonist': '主角', 'Choose picture': '选择图片',
  'Character details': '角色详情', 'World settings': '世界设定',
  'Your Chinese worlds': '你的中文世界', 'Your English worlds': '你的英文世界',
  'Start a new story in this language. Your other worlds are kept separately.': '从这里开始一段中文故事。其他语言的世界会分别保留。',
  'Script home': 'Script 首页',
  'EVERY DAY, ANOTHER PAGE.': '每一天，都是新的篇章。',
  'Wanderer': '旅人', 'Interface language': '界面语言',
  'A new possibility awaits.': '新的可能，正在等你。', 'Opening your worlds…': '正在打开你的世界……',
  'Let’s find our way back.': '让我们重新找到故事的入口。', 'Try again': '重试',
  'Could not load your worlds.': '暂时无法读取你的世界。',
  'Your first page is written.': '你的故事，已经写下第一页。',
  'Your world and {name} are saved. Welcome to your adventure.': '你的世界与「{name}」已保存。欢迎开启这段旅程。',
  'Dismiss welcome message': '关闭欢迎消息', 'YOUR STORY / THE FIRST CHAPTER': '你的故事 / 第一章',
  'Welcome to {name}': '欢迎来到{name}',
  'Your arrival is only the beginning. Grow at your own pace.': '抵达，只是开始。按自己的节奏慢慢成长吧。',
  'Create a world': '创建新世界', 'Step into another world': '前往另一个世界',
  'BETWEEN THESE PAGES': '书页之间', 'The rules of your world': '这个世界的规则',
  'CHARACTER PROFILE': '角色档案', 'Saved': '已保存', 'MEET YOUR PROTAGONIST': '故事的主角',
  'Your story is still unfolding.': '属于你的故事，仍在继续。', 'Attributes': '能力属性', 'At your own pace': '按自己的节奏',
  'Knowledge': '学识', 'Vitality': '活力', 'Creativity': '创造力', 'Connection': '羁绊', 'Discipline': '自律',
  'Feed your curiosity': '让好奇心带你前行', 'Care for your energy': '照顾好自己的身心', 'Make something yours': '创造属于你的事物',
  'Find your people': '遇见与你同行的人', 'One small step at a time': '一步一步，慢慢积累', 'XP': '经验',
  'Every ability starts somewhere. This is your origin.': '每一种能力都有起点。这里，就是你的序章。',
  'THE NEXT CHAPTER': '下一篇章', 'Everyday moments. An unfolding adventure.': '平凡日常，也能成为冒险的伏笔。',
  'Reading a few pages. Taking a walk. Making time for a friend. Soon, your everyday efforts will help shape this adventure.': '读几页书，出门走走，和朋友聊聊天。未来，这些日常里的努力，都将成为故事中的成长。',
  'Up next in Script: tasks & your first story scene': '即将加入：日常任务与第一段剧情',
  'Small steps in this life. New possibilities in another.': '此刻的一小步，另一个世界的新可能。', 'Script · Local preview': 'Script · 本地预览',
  'Portrait of {name}': '「{name}」的肖像', 'Character portrait placeholder': '角色肖像占位图',
  'Cover illustration': '封面插画', 'Your world cover': '你的世界封面', 'Change cover': '更换封面',
  'Saving cover…': '正在保存封面……', 'Cover saved.': '封面已保存。',
  'World cover': '世界封面', 'Use your own cover': '使用自己的封面', 'Remove picture': '移除图片',
  'PNG or JPEG, up to 5 MB. Leave empty to use the default cover.': '支持 PNG 或 JPEG，最大 5 MB。不上传则使用默认封面。',
  'Selected world cover': '已选择的世界封面',
  'Every new world starts with a first page.': '每一个新世界，都从第一页开始。',
  'VOLUME 01 / YOUR STORY BEGINS': '第一卷 / 故事开始之处',
  'An ordinary day.': '平凡的一天。', 'An extraordinary beginning.': '不平凡的开始。',
  'You don’t need to know how it ends.': '不必急着知道故事的结局。', 'Just where you’d like to begin.': '先选一个，你想出发的地方。',
  'THE SETTING OF YOUR STORY': '你的故事，发生在这里', 'AN UNWRITTEN FIRST CHAPTER': '尚待书写的第一章',
  'What happens next is yours to discover.': '接下来会发生什么，由你慢慢发现。',
  'Protagonist · {name}': '主角 · {name}', 'Create your world': '创建你的世界',
  'Your world': '你的世界', 'Your protagonist': '你的主角',
  'PROLOGUE / A DIFFERENT KIND OF EVERYDAY': '序章 / 从今天开始，有些不一样',
  'CHARACTER ORIGIN / A NEW BEGINNING': '角色设定 / 新的起点',
  'A new world.': '一个新世界。', 'A story that’s yours': '一段属于你的故事',
  'Who will you': '这一次，你想', 'become': '成为谁',
  'An unfamiliar town. An unexpected encounter. A life you never imagined. Let’s find the setting for your first chapter.': '陌生的小镇，意料之外的相遇，从未想过的人生。一起为你的第一章，找一个开始的地方。',
  'Every story starts with someone. Give yours a name, a little history, and something they’re hoping to find.': '每个故事，都从某个人开始。为你的主角取个名字，写一点过去，再留一个想要追寻的愿望。',
  'Build your world': '描绘你的世界', 'Meet your protagonist': '认识你的主角',
  'Find your story’s starting point': '找到故事的起点', 'Or write your own below': '也可以在下方自由创作',
  'Try {label}: {title}': '试试{label}：{title}',
  'Academy days': '异世界学园', 'A second chance at firsts': '重新体验，第一次的心动',
  'Guild adventure': '公会日常', 'A small quest. A bigger life.': '小小委托，大大人生',
  'Parallel lives': '双重人生', 'One ordinary day changes': '平凡的一天，突然转向',
  'World name': '世界名称', 'Where does your next chapter take place?': '你的下一章，会在哪里发生？',
  'A glimpse of this world': '这个世界的一角',
  'A bustling city, a sky full of unfamiliar stars, a letter that changes everything…': '热闹的街市，陌生的星空，一封改变一切的来信……',
  'The places, people, or possibilities that make it feel alive.': '写下让这个世界鲜活起来的地方、人物，或某种可能。',
  'How would you like the story to feel?': '你希望故事是什么氛围？',
  'Wonder & discovery': '好奇与探索', 'Cozy & hopeful': '温暖与希望', 'Mystery & intrigue': '悬疑与秘密',
  'Epic & adventurous': '热血与冒险', 'Bittersweet & reflective': '微甜微苦，细细回味',
  'Story language': '小说语言', 'English': '英文', 'Chinese (Simplified)': '中文（简体）',
  'Choose the language for future story chapters. This is separate from the interface language.': '选择未来章节的写作语言，与界面语言独立设置。',
  'Add world rules & boundaries': '补充世界规则与内容边界', 'Optional': '选填',
  'Anything this world should know?': '还有什么需要这个世界记住的吗？',
  'Magic is rare. Keep things hopeful. No graphic violence.': '魔法很稀少。故事保持希望感。不描写血腥暴力。',
  'Your adventure awaits in': '你的冒险，将在这里展开', 'Edit world': '修改世界设定',
  'What should we call them?': '该怎么称呼这位主角？', 'Your protagonist’s name': '主角的名字',
  'Their origin story': '故事开始之前的主角',
  'An ordinary student starting their first guild job, hoping to find a place to belong in an unfamiliar world…': '一个刚接下第一份公会委托的普通学生，想在陌生的世界里，找到属于自己的位置……',
  'Who were they before arriving? What are they hoping to become?': '来到这里之前，主角是谁？这一次，又希望成为怎样的人？',
  'Your selected character portrait': '已选择的角色肖像', 'Put a face to the name': '为这个名字配上一张面孔',
  'A picture you love. PNG or JPEG, up to 5 MB.': '选一张喜欢的图片。支持 PNG 或 JPEG，最大 5 MB。',
  'No legendary hero required.': '不必一开始就是传说中的英雄。',
  'An ordinary person can have an extraordinary story.': '普通的人，也能拥有不平凡的故事。',
  'Back': '返回', 'Back to my world': '回到我的世界', 'Saving your first page…': '正在保存故事的第一页……',
  'Meet my protagonist': '认识我的主角', 'Begin my story': '开启我的故事',
  'A first draft is enough. Let your imagination lead.': '有个初稿就很好。让想象带你出发。',
  'Your world and character will be saved together.': '你的世界和主角将一起保存。',
  'Add a little detail here to continue.': '再补充一点细节，就能继续了。', 'Please check this field.': '请检查这一项。',
  'Just a little more to make this yours. Check the fields below.': '还差一点点。看看下方标记的内容吧。',
  'Let’s try a PNG or JPEG image, 5 MB or smaller.': '请试试 PNG 或 JPEG 图片，文件不超过 5 MB。',
  'Your beginning couldn’t be saved yet. Please try again.': '暂时没能保存这个开始，请再试一次。',
  'Could not reach Script. Check that the backend is running, then try again.': '暂时无法连接 Script，请确认后端已启动后重试。',
  'The request could not be completed. Please try again.': '暂时无法完成操作，请再试一次。',
  'Storage is unavailable. Please try again.': '存储暂时不可用，请稍后重试。',
  'Check the highlighted fields and try again.': '请检查标记的内容后重试。',
  'Portraits must be 5 MB or smaller.': '图片文件不能超过 5 MB。',
  'Choose a PNG or JPEG image.': '请选择 PNG 或 JPEG 图片。',
  'Choose a valid PNG or JPEG image.': '请选择有效的 PNG 或 JPEG 图片。',
  'Portraits must be at most 4096 pixels per side and 8 megapixels.': '图片每边不能超过 4096 像素，总像素不能超过 800 万。',
  'That image could not be read. Choose another PNG or JPEG.': '无法读取这张图片，请换一张 PNG 或 JPEG。',
  'World or portrait not found.': '未找到世界或图片。',
  'This world changed. Refresh and try again.': '这个世界已更新，请刷新后重试。',
};

export function translate(language: Language, message: string, values: Record<string, string | number> = {}) {
  const text = language === 'zh-CN' ? chinese[message] ?? message : message;
  return text.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token));
}

const I18nContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: Translate } | null>(null);
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem('script.language');
    if (saved === 'en' || saved === 'zh-CN') return saved;
  } catch { /* Browser storage is optional. */ }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'zh-CN' ? 'Script · 你的下一章' : 'Script · Your next chapter';
    try { localStorage.setItem('script.language', language); } catch { /* Session language still works. */ }
  }, [language]);
  return <I18nContext.Provider value={{ language, setLanguage, t: (message, values) => translate(language, message, values) }}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('I18nProvider is required');
  return context;
}
