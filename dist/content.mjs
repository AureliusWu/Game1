/** Original authored content for 暮色百事. Data only; shared by simulation and UI. */
export const EXPANSION='夜路有选择';
export const UPGRADES=[
 {id:'wing',name:'顺风之羽',desc:'移动速度 +18%，冲刺冷却 -0.45 秒',symbol:'wind',category:'move',max:2},
 {id:'lantern',name:'长明灯芯',desc:'生命上限 +25',symbol:'flame',category:'survive',max:2},
 {id:'ring',name:'日轮回响',desc:'光环范围 +25%，伤害 +15',symbol:'sun',category:'attack',max:2},
 {id:'spark',name:'双星邮戳',desc:'自动光弹额外攻击一名目标',symbol:'star',category:'attack',max:2},
 {id:'magnet',name:'拾光口袋',desc:'拾取范围 +65%，火种回复 +3',symbol:'bag',category:'survive',max:2},
 {id:'express',name:'急递印记',desc:'冲刺后 2 秒内下一轮光弹伤害 +25%',symbol:'wind',category:'move',max:1},
 {id:'return',name:'余烬返航',desc:'光环命中至少两名敌人，返还 0.6 秒冷却，每次施放一次',symbol:'sun',category:'attack',max:1},
 {id:'paper-shield',name:'护信纸盾',desc:'点灯后获得一次抵挡，持续 6 秒，无敌期间不消耗',symbol:'shield',category:'survive',max:1},
 {id:'focus',name:'聚焦灯芯',desc:'一轮光弹只有一名合法目标时，伤害 +25%',symbol:'star',category:'attack',max:1},
 {id:'waymark',name:'余光路标',desc:'每封信投递后，接下来两次光环伤害 +20%',symbol:'letter',category:'attack',max:1},
 {id:'seal',name:'补给封签',desc:'补给溢出治疗转为最多 20 点护盾，持续 8 秒，缺血时可用',symbol:'tea',category:'survive',max:1},
 {id:'afterglow',name:'留灯一刻',desc:'离灯后 3 秒内环境生命流失降低 50%，不减免攻击',symbol:'flame',category:'move',max:1}
];
export const CONDITIONS=[
 {id:'fog',name:'浓雾',desc:'远处景物隐入雾中，近身预警与灯塔方向仍清楚'},
 {id:'small-bag',name:'小包裹',desc:'最多携带 8 枚火种，规划点灯、分享与奇遇顺序'},
 {id:'express',name:'加急投递',desc:'180 秒内送达额外获 1 枚邮票；超时可继续，菜单和剧情暂停计时'},
 {id:'elite-patrol',name:'精英巡夜',desc:'每章两只巡逻强化为精英，共用有限巡逻奖励预算'}
];
export const LEGACY_SETS={courier:'每次击败影兽额外获得 2 星砂',warden:'生命上限 +20，火种额外回复 3 生命',dawn:'光环冷却 -1.2 秒'};
export const SLOTS={lamp:'提灯',cape:'披羽',bag:'邮包'};
export const SETS={
  plain:{name:'旧日行装',two:'熟悉的旅伴',three:'不提供套装加成'},
  courier:{name:'远行邮差',two:'移动速度 +12',three:'冲刺拾取火种触发 3 秒顺风（移速 +25%，间隔 5 秒）'},
  warden:{name:'守灯人',two:'伤害减免 +8%',three:'光环展开一次抵挡，持续 3 秒'},
  dawn:{name:'曙光回声',two:'暴击率 +12%',three:'光环标记 4 秒；光弹引发 100 范围回响（间隔 1 秒）'}
};
export const GEAR=[
  {id:'paper-lamp',name:'纸罩提灯',slot:'lamp',set:'plain',tier:0,icon:'flame',price:0,desc:'旧邮局发给新人的第一盏灯。',stats:{}},
  {id:'worn-cape',name:'洗旧披羽',slot:'cape',set:'plain',tier:0,icon:'wind',price:0,desc:'前辈说，穿旧了才挡得住风。',stats:{}},
  {id:'canvas-bag',name:'帆布邮包',slot:'bag',set:'plain',tier:0,icon:'bag',price:0,desc:'底部缝着一句话：件件有回音。',stats:{}},
  {id:'brass-lamp',name:'黄铜行灯',slot:'lamp',set:'courier',tier:1,icon:'flame',price:20,desc:'每一处擦痕，都是赶过的路。',stats:{damage:5,attackRate:-.06}},
  {id:'wind-cape',name:'顺风短披',slot:'cape',set:'courier',tier:1,icon:'wind',price:20,desc:'风会替认真赶路的人让开一点。',stats:{speed:16,dashMax:-.12}},
  {id:'post-bag',name:'远行邮袋',slot:'bag',set:'courier',tier:1,icon:'bag',price:20,desc:'可以装下很多东西，包括乡愁。',stats:{pickup:30,heal:1}},
  {id:'hearth-lamp',name:'炉心长明灯',slot:'lamp',set:'warden',tier:1,icon:'flame',price:22,desc:'火不大，守住一夜已经足够。',stats:{maxHp:12,pulseDamage:8}},
  {id:'sentry-cape',name:'守灯披风',slot:'cape',set:'warden',tier:1,icon:'shield',price:22,desc:'补丁下面，还有很结实的一层。',stats:{armor:.06,maxHp:8}},
  {id:'herb-bag',name:'草药挎包',slot:'bag',set:'warden',tier:1,icon:'bag',price:22,desc:'留一点位置给别人的伤口。',stats:{heal:3,potionHeal:8}},
  {id:'prism-lamp',name:'折光黎明灯',slot:'lamp',set:'dawn',tier:2,icon:'star',price:32,desc:'把第一束晨光折成锋芒。',stats:{damage:10,crit:.06}},
  {id:'dawn-cape',name:'曙色长羽',slot:'cape',set:'dawn',tier:2,icon:'wind',price:32,desc:'天边还没亮，它已经知道方向。',stats:{speed:10,crit:.04,dashMax:-.18}},
  {id:'echo-bag',name:'回声信匣',slot:'bag',set:'dawn',tier:2,icon:'sun',price:32,desc:'据说每封被送达的信都会回应它。',stats:{pulseRadius:24,pulseDamage:12}}
];
export const GEAR_BY_ID=Object.fromEntries(GEAR.map(g=>[g.id,g]));
export const STAT_NAMES={maxHp:'生命上限',speed:'移动速度',damage:'光弹伤害',armor:'伤害减免',crit:'暴击率',pickup:'拾取范围',heal:'火种回复',pulseDamage:'光环伤害',pulseRadius:'光环范围',pulseMax:'光环冷却',dashMax:'冲刺冷却',attackRate:'光弹间隔',potionHeal:'补给回复'};
export function gearDescription(item,rules=120){const g=GEAR_BY_ID[item.id];if(!g)return '';const mult=1+((item.level||1)-1)*(rules===111?.4:.25);return Object.entries(g.stats).map(([key,value])=>{const n=value*mult;return `${STAT_NAMES[key]} ${n>0?'+':''}${['armor','crit'].includes(key)?Math.round(n*100)+'%':Math.abs(n)<1?n.toFixed(2)+'s':Number(n.toFixed(1))}`;}).join(' · ')||'基础行装 · 陪你开始这段旅途';}
export const TALENTS=[
  {id:'lamp',name:'长明课程',icon:'flame',desc:'每级生命上限 +6',max:3},
  {id:'wing',name:'夜航训练',icon:'wind',desc:'每级移动速度 +5',max:3},
  {id:'focus',name:'聚光技巧',icon:'sun',desc:'每级光弹伤害 +2',max:3},
  {id:'fund',name:'邮局路费',icon:'coin',desc:'每级启程星砂 +5',max:3},
  {id:'supply',name:'行囊整理',icon:'tea',desc:'每级启程补给 +1（初始 1 瓶）',max:3}
];
export const TALENT_COST=level=>2+level;
export const CONTRACTS=[
  {id:'lamps',name:'点灯学徒',desc:'同一旅途点亮 9 座灯塔',reward:3,goal:9,metric:'litTotal'},
  {id:'hunter',name:'替街区守夜',desc:'同一旅途击败 15 只影兽',reward:3,goal:15,metric:'kills'},
  {id:'letters',name:'三封家书',desc:'同一旅途送达 3 封居民的信',reward:4,goal:3,metric:'deliveries'},
  {id:'chests',name:'遗失物招领',desc:'同一旅途开启 3 个失物箱',reward:3,goal:3,metric:'chests'},
  {id:'swift',name:'加急挂号',desc:'180 秒内把黎明送达',reward:4,goal:1,metric:'swift'},
  {id:'resolve',name:'不用补给的夜',desc:'不使用补给完成整段旅途',reward:5,goal:1,metric:'resolve'}
];
export const NPCS=[
 {id:'shuo',name:'小朔',role:'还没有回家的孩子',species:'rabbit',color:'#c8b891',letter:'home',
  pages:['妈妈说，晚上门口有灯，就知道家还在。可是奶奶的灯已经三天没亮了。','这封信我写了很久。字不好看，你不要笑我。','我不敢一个人过去。你经过灯塔的时候，可以替我把它寄出去吗？'],
  letterTitle:'门口留着的灯',letterText:'奶奶，我把围巾洗好了。等天亮，我就回家。你不用一直站在门口。——小朔',
  choices:[{id:'promise',text:'交给我。灯亮了，信就会到。',effect:'接下送信委托 · 信任 +1 · 获得 6 星砂',trust:1,coins:6},{id:'share',text:'信我来送，这两枚火种也留给你。',effect:'消耗 2 火种 · 信任 +2 · 生命上限 +8',trust:2,embers:2,hp:8}],
  after:'他用力点点头，把一张画着太阳的邮票放进你的掌心。'},
 {id:'moss',name:'苔生',role:'守着花园的园丁',species:'deer',color:'#9eb49b',letter:'garden',
  pages:['雨没有停过。我都快忘记，泥土晒热是什么味道了。','花园里只剩一株芽。我每天给它讲以前春天的事，也许它听得懂。','这封信写给很远的人。就说花园还在，我也还在。'],
  letterTitle:'写给春天的信',letterText:'你走后，那棵树又长高了一点。我给它留了足够的地方。等春天来了，我们再一起看。——苔生',
  choices:[{id:'promise',text:'我会告诉他，花园仍有人照看。',effect:'接下送信委托 · 信任 +1 · 获得 6 星砂',trust:1,coins:6},{id:'share',text:'把这些火种埋在花盆旁，让芽暖一点。',effect:'消耗 2 火种 · 信任 +2 · 生命上限 +8',trust:2,embers:2,hp:8}],
  after:'苔生把一片叶子夹进信封，说它认得回家的路。'},
 {id:'sen',name:'岑灯',role:'上一任暮色信使',species:'owl',color:'#a9adc2',letter:'legacy',
  pages:['你终于来了。别紧张，我已经不负责检查新人的邮包了。','守夜者以前也是一位点灯人。长夜太久，他忘了自己等的是谁。','把这封旧信送出去吧。也许他需要有人提醒：等待，不是徒劳。'],
  letterTitle:'给下一位信使',letterText:'孩子，路再长，也别把自己丢在路上。如果有人等你，就回去。如果没人等，你可以成为那个等别人的人。——岑灯',
  choices:[{id:'promise',text:'这一次，由我把信送到。',effect:'接下送信委托 · 信任 +1 · 获得 6 星砂',trust:1,coins:6},{id:'share',text:'您也带上一点光。我想和您一起等天亮。',effect:'消耗 2 火种 · 信任 +2 · 生命上限 +8',trust:2,embers:2,hp:8}],
  after:'岑灯摘下旧帽子。你第一次看清，他眼睛里也有一点光。'}
];
export const ENDINGS={
 dawn:{name:'黎明签收',subtitle:'DELIVERED AT DAYBREAK',text:'第一扇窗亮起时，烛羽发现邮包里多了一封信。信上只有一句话：「谢谢你，我们一直在等你。」城市醒了，远处还有新的街道等待灯火。'},
 letters:{name:'回信成河',subtitle:'EVERY LETTER FINDS A HOME',text:'三封信都找到了归处。小朔跑向开着灯的家门，花园里有人撑起了伞，岑灯在邮局门前放好第二把椅子。清晨，第一袋回信比烛羽的邮包还要沉。'},
 hearth:{name:'人间灯火',subtitle:'HOME IS WHERE WE KEEP THE LIGHT',text:'守夜者在旧信前停了下来。他记起了名字，也记起有人说过会等他。小朔带来围巾，苔生带来第一株新芽，岑灯重新挂起邮局的招牌。烛羽终于可以坐下来，拆开寄给自己的那封信。'}
};
export const EVENTS=[
 {id:'mailbox',name:'失语邮筒',icon:'letter',intro:'一只没有投递口的旧邮筒，内部却传来纸张翻动的声音。似乎有什么东西，也在等一封信。',choices:[
  {id:'warm',text:'借给它两枚火种',desc:'消耗 2 火种，获得一件装备',embers:2,gear:true},
  {id:'listen',text:'安静听完那段旧事',desc:'获得 8 星砂与 10 生命',coins:8,heal:10}]},
 {id:'well',name:'没有月亮的井',icon:'star',intro:'井底没有水，只有一圈轻轻发亮的字：「愿每一个远行的人，都有归处。」',choices:[
  {id:'wish',text:'投下一点路费，许一个愿望',desc:'消耗 12 星砂，本局生命上限 +15',cost:12,hp:15},
  {id:'reach',text:'伸手拾起井边的星砂',desc:'失去 18 生命，获得 24 星砂',damage:18,coins:24}]},
 {id:'bell',name:'停在昨夜的钟',icon:'sun',intro:'钟声被困在零点之前。指针下面压着一行小字：「有些回声，需要勇气才能听见。」',choices:[
  {id:'ring',text:'拨动指针，迎接回声',desc:'唤醒精英影兽；击败后获得装备与 24 星砂',elite:true},
  {id:'rest',text:'擦去钟面的尘埃',desc:'回复 25 生命，光环立刻冷却',heal:25,reset:true}]}
];
export const ACHIEVEMENTS=[
 {id:'first-light',name:'第一束光',desc:'点亮第一座灯塔',icon:'flame',reward:1},
 {id:'district',name:'有人归来',desc:'在一段旅途中点亮一片街区',icon:'sun',reward:1},
 {id:'slayer',name:'影子的对面',desc:'累计击败 20 只影兽',icon:'star',reward:2},
 {id:'collector',name:'拾光者',desc:'累计拾取 100 枚火种',icon:'flame',reward:2},
 {id:'treasure',name:'物归原主',desc:'累计开启 3 个失物箱',icon:'chest',reward:2},
 {id:'shopper',name:'买点路上的东西',desc:'在流动商店完成第一次购买',icon:'coin',reward:1},
 {id:'smith',name:'旧物新生',desc:'完成一次装备锻造',icon:'hammer',reward:1},
 {id:'wardrobe',name:'行装有故事',desc:'发现 9 种装备',icon:'bag',reward:2},
 {id:'set',name:'完整的旅伴',desc:'同时穿戴同一套装的三件装备',icon:'shield',reward:2},
 {id:'combo',name:'不熄的节奏',desc:'达成 5 连击',icon:'star',reward:2},
 {id:'letters',name:'字字有回音',desc:'找回三封居民的信',icon:'letter',reward:3},
 {id:'courier',name:'有人托付',desc:'累计完成三次居民投递',icon:'bag',reward:2},
 {id:'dawn',name:'黎明签收',desc:'第一次完成整段旅途',icon:'sun',reward:3},
 {id:'swift',name:'赶上第一班晨风',desc:'180 秒内通关',icon:'wind',reward:2},
 {id:'night',name:'走过最长的夜',desc:'在长夜难度通关',icon:'flame',reward:3},
 {id:'hearth',name:'人间灯火',desc:'解锁同名隐藏结局',icon:'letter',reward:3},
 {id:'veteran',name:'暮色老员工',desc:'累计五次把黎明送达',icon:'bag',reward:3},
 {id:'flawless',name:'不落的一羽',desc:'避开攻击与奇遇伤害并通关',icon:'shield',reward:3},
 {id:'level',name:'逐渐熟练',desc:'一段旅途达到 6 级',icon:'star',reward:2},
 {id:'contract',name:'件件有交代',desc:'累计完成三份邮局委托',icon:'check',reward:2},
 {id:'courier-route',name:'风替我签收',desc:'穿远行邮差三件套完成一次投递',icon:'wind',reward:0,story:'邮袋上的羽毛轻轻转动。收信的人说，今天的风很温柔。'},
 {id:'warden-block',name:'留一盏灯',desc:'用守灯人三件套抵挡一次攻击',icon:'shield',reward:0,story:'烛羽把灯举高了一点。身后的人，终于有时间把围巾系好。'},
 {id:'dawn-echo',name:'光有回声',desc:'用曙光回声三件套触发一次回响',icon:'sun',reward:0,story:'光照出去的时候，你听见城市轻轻答了一声。'},
 {id:'mixed-route',name:'自己的行装',desc:'混搭至少两个非基础套装并通关',icon:'bag',reward:0,story:'没有统一的制服，也有能把信送到的人。'},
 {id:'side-route',name:'绕一点远路',desc:'完成一次风险支路，击败守卫取回装备',icon:'star',reward:0,story:'那条没有路牌的巷子，原来也通向一个等信的人。'},
 {id:'fair-route',name:'同一束起点',desc:'首次完成统一预设的公平挑战航线',icon:'check',reward:0,story:'同一盏灯、同一个清晨。你走出了属于自己的路线。'},
 {id:'small-route',name:'小小邮包',desc:'携带小包裹条件通关',icon:'bag',reward:0,story:'能装下的东西有限，愿意带走的心意没有变少。'},
 {id:'express-route',name:'晨风之前',desc:'带加急投递条件，在 180 秒内通关',icon:'wind',reward:0,story:'窗户打开的那一刻，信已经在门口了。'}
];
export const BESTIARY=[
 {id:'shade',name:'迷途影',desc:'普通影兽。追随最近的光，也会被已经亮起的灯塔驱散。'},
 {id:'runner',name:'迅影',desc:'速度很快，生命较低。留一段冲刺，不要被它贴住。'},
 {id:'brute',name:'重影',desc:'行动迟缓，生命与攻击都更高。光环可以为你争取空间。'},
 {id:'boss',name:'守夜者',desc:'曾经的点灯人。七成生命时预告压灯，低于三成半时蓄力定向回声。侧移、冲刺或近身光环能回应他的招式。'},
 {id:'caster',name:'投影者',desc:'先标出方向，再释放穿越屋檐的投影。金紫色虚线出现时侧移；灯塔会挡光球，但不能挡投影。'},
 {id:'warder',name:'结界者',desc:'周围 130 范围的其他影兽受到的光弹伤害降低 40%。先处理结界者，或绕到另一条路。'},
 {id:'charger',name:'破阵者',desc:'第五层起加入夜航，快速接近后锁定扑击方向。看到预警时横向闪避，光环可打断。'},
 {id:'sniper',name:'远望者',desc:'第七层起出现，远距离预警并释放扇形弹幕。不要原地停留，光环可以清除飞弹。'},
 {id:'bulwark',name:'壁垒者',desc:'第十层起出现，生命厚重，并释放带安全内圈的震荡环。看清内圈与外圈再移动。'}
];
