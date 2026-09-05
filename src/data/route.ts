export type StoryTheme =
  | 'history'
  | 'food'
  | 'people'
  | 'legend'
  | 'industry'
  | 'nature'

export type Story = {
  id: string
  title: string
  theme: StoryTheme
  durationSec: number
  script: string
}

export type PointOfInterest = {
  id: string
  name: string
  county: string
  lat: number
  lng: number
  progress: number
  blurb: string
  stories: Story[]
}

export type RouteWaypoint = {
  lat: number
  lng: number
  label?: string
}

/** 虎尾 → 匯入台 1 → 斗南 → 大林 → 民雄 → 嘉義 → 水上 → 後壁 → 新營 */
export const ROUTE_WAYPOINTS: RouteWaypoint[] = [
  { lat: 23.7085, lng: 120.4338, label: '雲林虎尾' },
  { lat: 23.6902, lng: 120.4521 },
  { lat: 23.6738, lng: 120.4812, label: '斗南（匯入台 1）' },
  { lat: 23.6401, lng: 120.4765 },
  { lat: 23.6032, lng: 120.4718, label: '大林' },
  { lat: 23.5764, lng: 120.4502 },
  { lat: 23.5512, lng: 120.4288, label: '民雄' },
  { lat: 23.5126, lng: 120.4401 },
  { lat: 23.4798, lng: 120.4492, label: '嘉義市區' },
  { lat: 23.4512, lng: 120.4328 },
  { lat: 23.4286, lng: 120.4164, label: '水上' },
  { lat: 23.3968, lng: 120.3982 },
  { lat: 23.3669, lng: 120.3841, label: '後壁' },
  { lat: 23.3352, lng: 120.3486 },
  { lat: 23.3051, lng: 120.3168, label: '台南新營' },
]

export const ROUTE_META = {
  brand: '途聞',
  title: '虎尾 → 新營 · 台 1 線說書',
  subtitle:
    '模擬你第一次走這段路：系統會假裝抓取定位，並以連播說書一路講下去；語音採較自然的台灣腔神經語音。',
  from: '雲林縣虎尾鎮',
  to: '台南市新營區',
  highway: '省道台 1 線（含虎尾匯入段）',
  approxKm: 52,
  driveMinutes: 70,
}

export const THEME_LABELS: Record<StoryTheme, string> = {
  history: '歷史',
  food: '美食',
  people: '人物',
  legend: '奇聞',
  industry: '產業',
  nature: '風景',
}

export const POINTS_OF_INTEREST: PointOfInterest[] = [
  {
    id: 'huwei',
    name: '虎尾',
    county: '雲林',
    lat: 23.7085,
    lng: 120.4338,
    progress: 0.02,
    blurb: '糖業小鎮，鐵橋與布袋戲的氣味還在風裡。',
    stories: [
      {
        id: 'huwei-sugar',
        title: '虎尾不是老虎的尾巴',
        theme: 'industry',
        durationSec: 95,
        script:
          '歡迎上车，副駕說書人報到。你現在在雲林虎尾——名字很兇，但這座城真正的猛獸，其實是糖。日治時期這裡蓋起大型糖廠，鐵道、宿舍、俱樂部一整套，像把一座迷你工業王國塞進平原。糖廠的煙囪曾經是小鎮的時鐘：冒煙，表示今天又有人在跟甘蔗搏鬥。你若第一次來，別急著找老虎；先聽聽鐵軌的聲音，那是虎尾最老的導覽員。',
      },
      {
        id: 'huwei-puppet',
        title: '布袋戲：手掌上的好萊塢',
        theme: 'people',
        durationSec: 90,
        script:
          '虎尾還有另一種出口導向產業：布袋戲。雲林被叫做布袋戲的故鄉可不是客套，街頭巷尾都能碰到「掌中英雄」。想像一下，一齣戲的主角只有手掌大，卻能打出比八點檔更誇張的劇情。對第一次造訪的人來說，這很虎尾——外表低調，內裡戲份超多。等一下上路，風景會變甜，故事也會跟著加料。',
      },
      {
        id: 'huwei-bridge',
        title: '鐵橋上的黃昏濾鏡',
        theme: 'history',
        durationSec: 80,
        script:
          '虎尾鐵橋常出現在照片裡，不是因為它愛出風頭，是因為光線太會做事。夕陽一打，橋身像被糖漿鍍過金。它見證過糖業運輸的忙碌歲月，也收留過無數來找「感覺」的旅人。你現在不用下車，只要記得：台灣很多小鎮的浪漫，都是工業遺構退休後轉職成功。',
      },
    ],
  },
  {
    id: 'dounan',
    name: '斗南',
    county: '雲林',
    lat: 23.6738,
    lng: 120.4812,
    progress: 0.14,
    blurb: '匯入台 1 線的門戶，車站與農產的交會處。',
    stories: [
      {
        id: 'dounan-gate',
        title: '正式匯入台 1：台灣的「舊幹線人生」',
        theme: 'history',
        durationSec: 85,
        script:
          '注意，定位顯示你靠近斗南，也差不多要匯入台 1 線了。台 1 線很像台灣西部的舊朋友：不高調、有點擠、但什麼都看過。高速公路追求效率，省道追求故事。從這裡往南，你會一路蹭過市鎮中心、水果攤、老診所招牌與忽然出現的廟口。第一次走的人常會覺得：「怎麼好像一直在經過人家的生活？」對，這就是台 1 的本質——你不是在穿越風景，你是在翻別人的日常相簿。',
      },
      {
        id: 'dounan-station',
        title: '斗南車站：平原上的轉運情緒',
        theme: 'people',
        durationSec: 75,
        script:
          '斗南車站附近總有一種「要出發或要回家」的氣味。雲林平原的物產、學生、出差的人，都在這種節點交換人生進度條。你開車經過時可能只看到車流，但其實每個紅燈後面都有人在等一班車、一趟收成、或一個週末。省道旅行的樂趣就這：慢一點，才聽得到這些小聲的情節。',
      },
    ],
  },
  {
    id: 'dalin',
    name: '大林',
    county: '嘉義',
    lat: 23.6032,
    lng: 120.4718,
    progress: 0.3,
    blurb: '進入嘉義地界，小鎮節奏開始換檔。',
    stories: [
      {
        id: 'dalin-border',
        title: '歡迎光臨嘉義：邊界感很台',
        theme: 'legend',
        durationSec: 80,
        script:
          '定位更新：你進入嘉義縣大林。台灣的縣市界常常沒有戲劇性門牌，就突然——欸，到嘉義了。大林給人的感覺很誠實：不裝國際都會，只專心當一個會呼吸的小鎮。對首次南下的旅人，這是好預告：再往南，口音、菜味、節奏都會微微變濃。像收音機轉台，不是突然換成Disco，而是同一個頻道多了一點溫暖雜訊。',
      },
      {
        id: 'dalin-pace',
        title: '小鎮速度：允許你把油門放軟',
        theme: 'nature',
        durationSec: 70,
        script:
          '大林這段路，風景是平原派的：看得遠、雲很大、電線杆很盡責。如果你習慣都市的視覺密度，這裡會讓你的眼睛突然失業。別慌，這叫「風景留白」。副駕建議：把注意力交給天空與田埂直線，它們比廣告看板誠實多了。',
      },
    ],
  },
  {
    id: 'minxiong',
    name: '民雄',
    county: '嘉義',
    lat: 23.5512,
    lng: 120.4288,
    progress: 0.42,
    blurb: '大學城與鵝肉香氣並存的交會點。',
    stories: [
      {
        id: 'minxiong-goose',
        title: '民雄鵝肉：學術與食欲的雙主修',
        theme: 'food',
        durationSec: 95,
        script:
          '民雄到了。這裡有中正大學，也有讓人放不下的鵝肉香。一個地方能同時培養論文與食欲，戰力其實很完整。鵝肉店的湯頭常常有種「我懂你長途駕駛有多累」的慈悲。你此刻若是第一次經過，記住這個反差：外面是省道車聲，裡面是滷味與熱湯在開小型音樂會。等下到嘉義市區，火雞肉飯會接棒；在民雄，先讓鵝，走第一棒。',
      },
      {
        id: 'minxiong-uni',
        title: '大學城的夜晚比較會發光',
        theme: 'people',
        durationSec: 75,
        script:
          '民雄因為大學，多了一層年輕的時間感。學期中與寒暑假，街景的音量會變。對旅人來說，這代表小鎮不是靜態明信片，而是會換季的。你開車經過的此刻，可能正有人在討論報告，也有人在討論要吃哪一盤。很嘉義、也很台灣：人生大事，通常先從吃什麼開始投票。',
      },
      {
        id: 'minxiong-road',
        title: '台 1 在民雄的脾氣',
        theme: 'history',
        durationSec: 70,
        script:
          '這段台 1 常有當地車流進出，像一條會跟人打招呼的路。第一次開的人記得放慢觀察：不是要你緊張，是請你把「通過」改成「造訪」。省道導覽的精髓，是讓你在合法車速內，多帶走一點地方個性。',
      },
    ],
  },
  {
    id: 'chiayi',
    name: '嘉義',
    county: '嘉義',
    lat: 23.4798,
    lng: 120.4492,
    progress: 0.56,
    blurb: '火雞肉飯、噴水圓環，與通往山林的起點城市。',
    stories: [
      {
        id: 'chiayi-turkey',
        title: '火雞肉飯：嘉義人的身分證',
        theme: 'food',
        durationSec: 100,
        script:
          '嘉義市區靠近了。先講最重要的外交語言：火雞肉飯。外地人常問「跟雞肉飯差在哪？」差在態度與細節——火雞肉片、油脂、醬汁，像一組精密的溫柔武器。嘉義人討論火雞肉飯，認真程度不下於討論天氣。你第一次來，不必急著評測冠軍店；先理解這碗飯的文化功能：它能結束爭吵、開啟聊天，也能讓趕路的人突然願意停十分鐘。這叫城市軟實力，裝在便當盒裡。',
      },
      {
        id: 'chiayi-fountain',
        title: '噴水圓環：城市的迴旋處',
        theme: 'history',
        durationSec: 85,
        script:
          '嘉義有個很會出鏡的地標：噴水圓環。它像城市的逗號，提醒你節奏可以轉彎。嘉義同時是往阿里山的門戶，平地與山林在這裡握手。所以嘉義人的地理感很立體——嘴巴在吃火雞肉飯，眼睛卻可能已經在想雲海。你走台 1 經過，看見的是市區層；若有機會再來，山線會打開另一章。',
      },
      {
        id: 'chiayi-wood',
        title: '木材之都的餘韻',
        theme: 'industry',
        durationSec: 80,
        script:
          '老一輩會記得嘉義與木材產業的深厚關係。城市的筋骨裡，有過伐木、鐵路與山海物資調度的記憶。如今你看到的是更生活化的街巷，但那層「會把山上的東西運到平地」的歷史，仍悄悄影響城市性格：務實、能吃苦，也懂享受一碗熱飯。第一次造訪的人若只吃美食也沒關係；美食本來就是最友善的史書。',
      },
    ],
  },
  {
    id: 'shuishang',
    name: '水上',
    county: '嘉義',
    lat: 23.4286,
    lng: 120.4164,
    progress: 0.68,
    blurb: '機場與田野並肩，離地與落地只隔一條路。',
    stories: [
      {
        id: 'shuishang-airport',
        title: '水上機場：田裡冒出來的跑道',
        theme: 'industry',
        durationSec: 90,
        script:
          '水上到了。這邊最有戲劇性的畫面，是稻田旁邊突然出現機場邏輯。嘉義機場在水上，聽起來像詩，開起來卻很實際：你可能一邊看農作，一邊看航跡雲。對第一次經過的人，這反差很可愛——台灣地窄，功能只好親密同居。飛機負責遠方，台 1 負責眼前；你此刻屬於眼前組。',
      },
      {
        id: 'shuishang-field',
        title: '水上的「水」，不一定要看得見',
        theme: 'nature',
        durationSec: 75,
        script:
          '地名叫水上，風景卻常是大片落地的田。台灣地名很會玩抽象：有時寫水，你看到的是風；寫山，你可能還在平地排隊。別被字面騙了，把感觀打開就好。這段路適合聽引擎聲與偶爾的鳥叫輪流solo。',
      },
    ],
  },
  {
    id: 'houbi',
    name: '後壁',
    county: '台南',
    lat: 23.3669,
    lng: 120.3841,
    progress: 0.82,
    blurb: '進入台南地界，農村美學與影像記憶交會。',
    stories: [
      {
        id: 'houbi-tainan',
        title: '進入台南：故事濃度開始上升',
        theme: 'history',
        durationSec: 90,
        script:
          '定位提示：你來到台南後壁。先恭喜，你進入了台灣故事密度偏高的行政區。台南常被說很有歷史，但後壁這一段更像「把歷史放回田中央」。這裡不是赤崁樓那種金牌景點路線，而是讓你看見台南的底層紋理：農事、聚落、與被鏡頭愛上的風景。第一次來的人若只認得台南市區，後壁會温和地糾正你：台南很大，而且很會 hinterland。',
      },
      {
        id: 'houbi-film',
        title: '無米樂之後：地方被看見的方法',
        theme: 'people',
        durationSec: 95,
        script:
          '後壁因為紀錄片與社區行動，曾讓很多人重新認識農村正面臨的時間問題：人老了、田還在、故事要誰接？這不是悲情旅遊，而是一種誠實。你開車經過，看到的屋厝與田垅，背後都有人在做「讓地方繼續被說下去」的工作。途聞的職責也很像：不是把地方講成紀念品，而是講成還在呼吸的鄰居。',
      },
      {
        id: 'houbi-art',
        title: '土溝與農村裡的藝術脾氣',
        theme: 'legend',
        durationSec: 80,
        script:
          '這附近的社區常有一種安静的創意：不是都會區的霓虹創意，是田野裡長出來的。藝術進農村，有時尷尬、有時動人，但至少證明一件事——美感不必只住在美術館。你若對「地方創生」四個字過敏，改聽成「人家想讓故鄉有下一集」就好。',
      },
    ],
  },
  {
    id: 'xinying',
    name: '新營',
    county: '台南',
    lat: 23.3051,
    lng: 120.3168,
    progress: 0.97,
    blurb: '台南的北門廳，糖業與城市機能的交會點。',
    stories: [
      {
        id: 'xinying-arrive',
        title: '新營抵達：北台南的關鍵拼圖',
        theme: 'history',
        durationSec: 95,
        script:
          '新營到了，這趟虎尾到新營的模擬行程也接近終點。新營曾是台南縣治所在，城市骨格裡有行政與糖業的雙重記憶。對很多旅人，台南=府城；但對真正在南部移動的人，新營是重要節點：轉乘、办事、吃飯、再決定往南或往東。你第一次走台 1 進來，不妨把新營當成「台南敘事的北引子」——後面還有更多章節，但這一章已經夠香。',
      },
      {
        id: 'xinying-sugar',
        title: '糖業城市的甜與鹹',
        theme: 'industry',
        durationSec: 85,
        script:
          '和虎尾遙相呼應，新營也有糖業遺留下的空間感。南部平原的現代史，有很大一部份是甘蔗寫的：它決定鐵道、聚落、以及假日要去哪裡晃。你從虎尾的甜出發，開到新營的甜收尾，像一條糖味迴力鏢。差別是沿途你已累積嘉義的飯、民雄的鵝，與後壁的田。這就是省道旅行的賬單：公里數不長，口感很複雜。',
      },
      {
        id: 'xinying-next',
        title: '終點不是結束，是下一趟的預告',
        theme: 'nature',
        durationSec: 70,
        script:
          '模擬定位即將停在新營。若這是真實旅行，你現在大概會問：「附近吃什麼？往南還是休息？」——很好，表示你已被這條路打開好奇心。途聞的目標也是這樣：不是把你塞滿知識，而是讓你下車後還想再問一句。今天先到這裡；下次換你指定路線，我再繼續當那個話很多的副駕。',
      },
    ],
  },
]

export const QUICK_QUESTIONS = [
  { label: '這裡有什麼好吃的？', theme: 'food' as StoryTheme },
  { label: '有什麼歷史背景？', theme: 'history' as StoryTheme },
  { label: '講點好笑的奇聞', theme: 'legend' as StoryTheme },
  { label: '跟產業有關嗎？', theme: 'industry' as StoryTheme },
]
